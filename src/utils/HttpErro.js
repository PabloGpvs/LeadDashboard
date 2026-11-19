// Erro com status HTTP. Lançado nos controllers e respondido pelo middleware de erros.
class HttpErro extends Error {
    constructor(status, mensagem, detalhes) {
        super(mensagem);
        this.status = status;
        this.detalhes = detalhes;
    }
}

module.exports = HttpErro;
