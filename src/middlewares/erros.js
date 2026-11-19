const HttpErro = require("../utils/HttpErro");

function rotaNaoEncontrada(req, res) {
    res.status(404).json({ error: "Rota não encontrada" });
}

// O Express só reconhece o middleware de erro se ele tiver os 4 parâmetros
function tratarErros(erro, req, res, next) {
    if (erro instanceof HttpErro) {
        const corpo = { error: erro.message };
        if (erro.detalhes) corpo.erros = erro.detalhes;
        return res.status(erro.status).json(corpo);
    }

    if (erro.type === "entity.parse.failed") {
        return res.status(400).json({ error: "JSON inválido" });
    }

    console.error(erro);
    res.status(500).json({ error: "Erro interno do servidor" });
}

module.exports = { rotaNaoEncontrada, tratarErros };
