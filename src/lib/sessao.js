const crypto = require("crypto");
const prisma = require("./prisma");
const { SEGREDO_SESSAO, PRODUCAO } = require("../config");

// A sessão é um cookie assinado com HMAC contendo o id do usuário (u),
// o espaço em que ele está trabalhando (e) e a validade (exp).

const COOKIE = "ld_sessao";
const DURACAO_MS = 12 * 60 * 60 * 1000;

function assinar(texto) {
    return crypto.createHmac("sha256", SEGREDO_SESSAO).update(texto).digest("base64url");
}

function criarToken(usuarioId, espacoId) {
    const payload = Buffer.from(
        JSON.stringify({ u: usuarioId, e: espacoId, exp: Date.now() + DURACAO_MS })
    ).toString("base64url");

    return `${payload}.${assinar(payload)}`;
}

function lerToken(token) {
    if (!token || !token.includes(".")) return null;

    const [payload, assinatura] = token.split(".");
    const recebida = Buffer.from(assinatura || "");
    const esperada = Buffer.from(assinar(payload));

    if (recebida.length !== esperada.length || !crypto.timingSafeEqual(recebida, esperada)) {
        return null;
    }

    try {
        const dados = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!dados.exp || dados.exp < Date.now() || !Number.isInteger(dados.u)) return null;
        return dados;
    } catch {
        return null;
    }
}

function lerCookie(req, nome) {
    const cabecalho = req.headers.cookie || "";

    for (const parte of cabecalho.split(";")) {
        const i = parte.indexOf("=");
        if (i === -1 || parte.slice(0, i).trim() !== nome) continue;

        const valor = parte.slice(i + 1).trim();
        try {
            return decodeURIComponent(valor);
        } catch {
            return valor;
        }
    }

    return null;
}

function definirSessao(res, usuarioId, espacoId) {
    res.cookie(COOKIE, criarToken(usuarioId, espacoId), {
        httpOnly: true,
        sameSite: "lax",
        secure: PRODUCAO,
        maxAge: DURACAO_MS
    });
}

function limparSessao(res) {
    res.clearCookie(COOKIE);
}

// Confere no banco se o usuário ainda existe e se ainda participa do espaço
// salvo no cookie. Se ele saiu (ou foi removido), cai no primeiro espaço dele.
async function carregarSessao(req) {
    const dados = lerToken(lerCookie(req, COOKIE));
    if (!dados) return null;

    const usuario = await prisma.usuario.findUnique({
        where: { id: dados.u },
        select: { id: true, nome: true, email: true }
    });
    if (!usuario) return null;

    let membro = null;

    if (Number.isInteger(dados.e)) {
        membro = await prisma.membro.findUnique({
            where: { usuarioId_espacoId: { usuarioId: usuario.id, espacoId: dados.e } },
            include: { espaco: true }
        });
    }

    if (!membro) {
        membro = await prisma.membro.findFirst({
            where: { usuarioId: usuario.id },
            orderBy: { createdAt: "asc" },
            include: { espaco: true }
        });
    }

    return membro ? { usuario, membro } : null;
}

module.exports = { definirSessao, limparSessao, carregarSessao };
