const prisma = require("../lib/prisma");
const HttpErro = require("../utils/HttpErro");
const lerId = require("../utils/lerId");
const { validarLead } = require("../validacoes/lead");

// Todas as consultas filtram por req.espacoId: cada espaço só enxerga os próprios leads.

function validarOuFalhar(body, opcoes) {
    const { erros, dados } = validarLead(body, opcoes);
    if (erros.length) throw new HttpErro(400, erros.join(". "), erros);
    return dados;
}

async function buscarDoEspaco(id, espacoId) {
    const lead = await prisma.lead.findFirst({ where: { id, espacoId } });
    if (!lead) throw new HttpErro(404, "Lead não encontrado");
    return lead;
}

async function listar(req, res) {
    const leads = await prisma.lead.findMany({
        where: { espacoId: req.espacoId },
        orderBy: { createdAt: "desc" }
    });
    res.json(leads);
}

async function buscar(req, res) {
    res.json(await buscarDoEspaco(lerId(req.params.id), req.espacoId));
}

async function criar(req, res) {
    const dados = validarOuFalhar(req.body);
    const lead = await prisma.lead.create({ data: { ...dados, espacoId: req.espacoId } });
    res.status(201).json(lead);
}

async function atualizar(req, res) {
    const id = lerId(req.params.id);
    const dados = validarOuFalhar(req.body, { parcial: true });

    if (Object.keys(dados).length === 0) throw new HttpErro(400, "Nenhum campo para atualizar");

    // updateMany para garantir que o lead é do espaço atual
    const { count } = await prisma.lead.updateMany({
        where: { id, espacoId: req.espacoId },
        data: dados
    });
    if (count === 0) throw new HttpErro(404, "Lead não encontrado");

    res.json(await buscarDoEspaco(id, req.espacoId));
}

async function excluir(req, res) {
    const id = lerId(req.params.id);

    const { count } = await prisma.lead.deleteMany({ where: { id, espacoId: req.espacoId } });
    if (count === 0) throw new HttpErro(404, "Lead não encontrado");

    res.json({ message: "Lead excluído com sucesso" });
}

module.exports = { listar, buscar, criar, atualizar, excluir };
