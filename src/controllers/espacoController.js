const prisma = require("../lib/prisma");
const HttpErro = require("../utils/HttpErro");
const lerId = require("../utils/lerId");
const { criarLimitador, MENSAGEM_BLOQUEIO } = require("../lib/limitador");
const { normalizarCodigo } = require("../lib/convite");
const { definirSessao } = require("../lib/sessao");
const { gerarNovoCodigo } = require("../services/espacoService");

const limiteConvite = criarLimitador(10);

function chaveMembro(usuarioId, espacoId) {
    return { usuarioId_espacoId: { usuarioId, espacoId } };
}

async function entrar(req, res) {
    const chave = `${req.ip}:${req.usuario.id}`;
    if (limiteConvite.bloqueado(chave)) throw new HttpErro(429, MENSAGEM_BLOQUEIO);

    const codigo = normalizarCodigo(req.body?.codigo);
    if (!codigo) throw new HttpErro(400, "Informe o token de convite");

    const espaco = await prisma.espaco.findUnique({ where: { codigoConvite: codigo } });
    if (!espaco) {
        limiteConvite.falhou(chave);
        throw new HttpErro(404, "Token de convite inválido");
    }

    const jaEraMembro = Boolean(
        await prisma.membro.findUnique({ where: chaveMembro(req.usuario.id, espaco.id) })
    );

    if (!jaEraMembro) {
        await prisma.membro.create({
            data: { usuarioId: req.usuario.id, espacoId: espaco.id, papel: "MEMBRO" }
        });
    }

    limiteConvite.limpar(chave);
    definirSessao(res, req.usuario.id, espaco.id);
    res.json({ ok: true, jaEraMembro, espaco: { id: espaco.id, nome: espaco.nome } });
}

async function trocar(req, res) {
    const espacoId = lerId(req.body?.espacoId, "Empresa inválida");

    const membro = await prisma.membro.findUnique({ where: chaveMembro(req.usuario.id, espacoId) });
    if (!membro) throw new HttpErro(403, "Você não faz parte dessa empresa");

    definirSessao(res, req.usuario.id, espacoId);
    res.json({ ok: true });
}

async function listarMembros(req, res) {
    const membros = await prisma.membro.findMany({
        where: { espacoId: req.espacoId },
        orderBy: [{ papel: "asc" }, { createdAt: "asc" }],
        include: { usuario: { select: { id: true, nome: true, email: true } } }
    });

    res.json(
        membros.map(m => ({
            id: m.usuario.id,
            nome: m.usuario.nome,
            email: m.usuario.email,
            papel: m.papel,
            desde: m.createdAt,
            voce: m.usuario.id === req.usuario.id
        }))
    );
}

async function renomear(req, res) {
    const nome = String(req.body?.nome || "").trim();
    if (nome.length < 2 || nome.length > 80) {
        throw new HttpErro(400, "O nome deve ter entre 2 e 80 caracteres");
    }

    const espaco = await prisma.espaco.update({ where: { id: req.espacoId }, data: { nome } });
    res.json({ ok: true, nome: espaco.nome });
}

// O token antigo para de funcionar; quem já entrou continua com acesso.
async function novoCodigo(req, res) {
    const codigoConvite = await gerarNovoCodigo(prisma, req.espacoId);
    res.json({ ok: true, codigoConvite });
}

async function removerMembro(req, res) {
    const usuarioId = lerId(req.params.usuarioId, "Usuário inválido");
    if (usuarioId === req.usuario.id) throw new HttpErro(400, "O dono não pode remover a si mesmo");

    const { count } = await prisma.membro.deleteMany({ where: { usuarioId, espacoId: req.espacoId } });
    if (count === 0) throw new HttpErro(404, "Membro não encontrado");

    res.json({ ok: true });
}

async function sair(req, res) {
    if (req.papel === "DONO") {
        throw new HttpErro(400, "Você é o dono desta empresa e não pode sair dela");
    }

    await prisma.membro.deleteMany({ where: { usuarioId: req.usuario.id, espacoId: req.espacoId } });

    const outro = await prisma.membro.findFirst({
        where: { usuarioId: req.usuario.id },
        orderBy: { createdAt: "asc" }
    });
    if (outro) definirSessao(res, req.usuario.id, outro.espacoId);

    res.json({ ok: true });
}

module.exports = { entrar, trocar, listarMembros, renomear, novoCodigo, removerMembro, sair };
