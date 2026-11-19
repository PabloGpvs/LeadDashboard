const HttpErro = require("./HttpErro");

function lerId(valor, mensagem = "ID inválido") {
    const id = Number(valor);
    if (!Number.isInteger(id) || id <= 0) throw new HttpErro(400, mensagem);
    return id;
}

module.exports = lerId;
