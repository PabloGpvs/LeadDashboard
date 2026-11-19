const prisma = require("../lib/prisma");
const HttpErro = require("../utils/HttpErro");
const { criarLimitador, MENSAGEM_BLOQUEIO } = require("../lib/limitador");
const { gerarHashSenha, verificarSenha } = require("../lib/senha");
const { definirSessao, limparSessao, carregarSessao } = require("../lib/sessao");
const { criarEspacoComDono } = require("../services/espacoService");
const { validarCadastro, primeiroNome } = require("../validacoes/conta");

const limiteLogin = criarLimitador(5);
const limiteCadastro = criarLimitador(10);

const MSG_EMAIL_EM_USO = "Já existe uma conta com esse e-mail";

async function registrar(req, res) {
    if (limiteCadastro.bloqueado(req.ip)) throw new HttpErro(429, MENSAGEM_BLOQUEIO);

    const { erros, dados } = validarCadastro(req.body);
    if (erros.length) throw new HttpErro(400, erros.join(". "), erros);

    const { nome, email, senha, tipo, nomeEspaco } = dados;

    if (await prisma.usuario.findUnique({ where: { email } })) {
        limiteCadastro.falhou(req.ip);
        throw new HttpErro(409, MSG_EMAIL_EM_USO);
    }

    const senhaHash = await gerarHashSenha(senha);

    let usuario, espaco;
    try {
        ({ usuario, espaco } = await prisma.$transaction(async tx => {
            const primeiroEspacoDoSistema = (await tx.espaco.count()) === 0;

            const usuario = await tx.usuario.create({ data: { nome, email, senhaHash } });
            const espaco = await criarEspacoComDono(tx, { usuarioId: usuario.id, nome: nomeEspaco, tipo });

            // Leads cadastrados antes de existir separação por conta ficam com a primeira conta
            if (primeiroEspacoDoSistema) {
                await tx.lead.updateMany({ where: { espacoId: null }, data: { espacoId: espaco.id } });
            }

            return { usuario, espaco };
        }));
    } catch (erro) {
        if (erro.code === "P2002") throw new HttpErro(409, MSG_EMAIL_EM_USO);
        throw erro;
    }

    definirSessao(res, usuario.id, espaco.id);
    res.status(201).json({ ok: true, usuario: usuario.nome });
}

async function login(req, res) {
    if (limiteLogin.bloqueado(req.ip)) throw new HttpErro(429, MENSAGEM_BLOQUEIO);

    const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
    const senha = String(req.body?.senha || "");

    const usuario = email ? await prisma.usuario.findUnique({ where: { email } }) : null;

    // Roda o scrypt mesmo sem usuário para a resposta levar o mesmo tempo
    const senhaCorreta = await verificarSenha(senha, usuario ? usuario.senhaHash : "scrypt$00$00");

    if (!usuario || !senhaCorreta) {
        limiteLogin.falhou(req.ip);
        throw new HttpErro(401, "E-mail ou senha incorretos");
    }

    let membro = await prisma.membro.findFirst({
        where: { usuarioId: usuario.id },
        orderBy: { createdAt: "asc" }
    });

    // Não deveria acontecer, mas se a conta ficou sem nenhum espaço, cria um
    if (!membro) {
        const espaco = await criarEspacoComDono(prisma, {
            usuarioId: usuario.id,
            nome: `Leads de ${primeiroNome(usuario.nome)}`
        });
        membro = { espacoId: espaco.id };
    }

    limiteLogin.limpar(req.ip);
    definirSessao(res, usuario.id, membro.espacoId);
    res.json({ ok: true, usuario: usuario.nome });
}

function logout(req, res) {
    limparSessao(res);
    res.json({ ok: true });
}

async function eu(req, res) {
    const sessao = await carregarSessao(req);
    if (!sessao) throw new HttpErro(401, "Não autenticado");

    const { usuario, membro } = sessao;

    const [membros, totalMembros] = await Promise.all([
        prisma.membro.findMany({
            where: { usuarioId: usuario.id },
            orderBy: { createdAt: "asc" },
            include: { espaco: { select: { id: true, nome: true, tipo: true } } }
        }),
        prisma.membro.count({ where: { espacoId: membro.espacoId } })
    ]);

    res.json({
        usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
        espacoAtual: {
            id: membro.espaco.id,
            nome: membro.espaco.nome,
            tipo: membro.espaco.tipo,
            papel: membro.papel,
            codigoConvite: membro.espaco.codigoConvite,
            totalMembros
        },
        espacos: membros.map(m => ({
            id: m.espaco.id,
            nome: m.espaco.nome,
            tipo: m.espaco.tipo,
            papel: m.papel
        }))
    });
}

module.exports = { registrar, login, logout, eu };
