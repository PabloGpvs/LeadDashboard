const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function primeiroNome(nome) {
    return String(nome).trim().split(" ")[0];
}

function validarCadastro(body = {}) {
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "")
        .trim()
        .toLowerCase();
    const senha = String(body.senha || "");
    const tipo = body.tipo === "EMPRESA" ? "EMPRESA" : "USUARIO";
    const nomeInformado = String(body.nomeEspaco || "").trim();

    // Conta pessoal ganha um espaço com o nome da pessoa; empresa usa o nome informado
    const nomeEspaco = tipo === "EMPRESA" ? nomeInformado : `Leads de ${primeiroNome(nome)}`;

    const erros = [];
    if (tipo === "EMPRESA" && nomeInformado.length < 2) erros.push("Informe o nome da empresa");
    if (nome.length < 2) erros.push("Informe seu nome");
    if (nome.length > 80) erros.push("Nome muito longo");
    if (!REGEX_EMAIL.test(email) || email.length > 160) erros.push("E-mail inválido");
    if (senha.length < 8) erros.push("A senha deve ter pelo menos 8 caracteres");
    if (senha.length > 128) erros.push("Senha muito longa");
    if (nomeEspaco.length > 80) erros.push("Nome da empresa muito longo");

    return { erros, dados: { nome, email, senha, tipo, nomeEspaco } };
}

module.exports = { validarCadastro, primeiroNome };
