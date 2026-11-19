const STATUS = ["QUENTE", "MORNO", "FRIO"];
const ESTADOS = ["ATIVO", "INATIVO"];
const ORIGENS = ["Site", "Instagram", "Facebook", "WhatsApp", "Indicação", "Google", "Outro"];

const TAMANHO_MAXIMO = {
    nome: 120,
    email: 160,
    telefone: 30,
    empresa: 120,
    vendedor: 80,
    cidade: 80,
    feedback: 255,
    observacao: 2000
};

const UM_DIA_MS = 24 * 60 * 60 * 1000;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONE = /^[\d\s()+-]{8,}$/;

// "" vira null (campo limpo); undefined continua undefined (campo não enviado)
function texto(valor) {
    if (valor === undefined) return undefined;
    if (valor === null) return null;
    const limpo = String(valor).trim();
    return limpo === "" ? null : limpo;
}

function converterData(valor) {
    // "2026-11-19" vira meio-dia UTC para não "voltar um dia" no fuso do Brasil
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T12:00:00.000Z` : valor;
    return new Date(iso);
}

/**
 * Valida e normaliza os dados de um lead.
 * No cadastro (parcial = false) nome e e-mail são obrigatórios;
 * na edição (parcial = true) só os campos enviados são conferidos.
 */
function validarLead(body, { parcial = false } = {}) {
    const erros = [];
    const dados = {};

    if (!body || typeof body !== "object") {
        return { erros: ["Corpo da requisição inválido"], dados };
    }

    const enviou = campo => campo in body;

    for (const [campo, maximo] of Object.entries(TAMANHO_MAXIMO)) {
        if (!enviou(campo)) continue;
        const valor = texto(body[campo]);
        if (valor && valor.length > maximo) {
            erros.push(`${campo} deve ter no máximo ${maximo} caracteres`);
        }
        dados[campo] = valor;
    }

    if ((!parcial || enviou("nome")) && !dados.nome) {
        erros.push("Nome é obrigatório");
    }

    if (!parcial || enviou("email")) {
        if (!dados.email) erros.push("E-mail é obrigatório");
        else if (!REGEX_EMAIL.test(dados.email)) erros.push("E-mail inválido");
        else dados.email = dados.email.toLowerCase();
    }

    if (dados.telefone && !REGEX_TELEFONE.test(dados.telefone)) {
        erros.push("Telefone inválido");
    }

    if (enviou("status")) {
        const status = texto(body.status);
        if (status && !STATUS.includes(status))
            erros.push("Temperatura inválida (use QUENTE, MORNO ou FRIO)");
        dados.status = status || "MORNO";
    } else if (!parcial) {
        dados.status = "MORNO";
    }

    if (enviou("estado")) {
        const estado = texto(body.estado);
        if (estado && !ESTADOS.includes(estado)) erros.push("Estado inválido (use ATIVO ou INATIVO)");
        dados.estado = estado || "ATIVO";
    } else if (!parcial) {
        dados.estado = "ATIVO";
    }

    if (enviou("origem")) {
        const origem = texto(body.origem);
        if (origem && !ORIGENS.includes(origem)) erros.push("Origem inválida");
        dados.origem = origem;
    }

    if (enviou("dataUltimoContato")) {
        const valor = texto(body.dataUltimoContato);

        if (!valor) {
            dados.dataUltimoContato = null;
        } else {
            const data = converterData(valor);
            if (isNaN(data.getTime())) erros.push("Data do último contato inválida");
            else if (data.getTime() > Date.now() + UM_DIA_MS)
                erros.push("Data do último contato não pode estar no futuro");
            else dados.dataUltimoContato = data;
        }
    }

    return { erros, dados };
}

module.exports = { validarLead };
