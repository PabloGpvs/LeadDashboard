let tipoConta = "USUARIO";

document.querySelectorAll(".opcao-tipo").forEach(botao => {
    botao.addEventListener("click", () => {
        tipoConta = botao.dataset.tipo;

        document.querySelectorAll(".opcao-tipo").forEach(b => {
            const ativo = b === botao;
            b.classList.toggle("ativo", ativo);
            b.setAttribute("aria-checked", String(ativo));
        });

        const ehEmpresa = tipoConta === "EMPRESA";
        document.getElementById("grupoNomeEspaco").style.display = ehEmpresa ? "flex" : "none";
        if (ehEmpresa) document.getElementById("nomeEspaco").focus();
    });
});

document.getElementById("formCadastro").addEventListener("submit", async event => {
    event.preventDefault();

    const botao = document.getElementById("btnCadastrar");
    const erro = document.getElementById("cadastroErro");

    const dados = {
        nome: document.getElementById("nome").value.trim(),
        email: document.getElementById("email").value.trim(),
        senha: document.getElementById("senha").value,
        tipo: tipoConta,
        nomeEspaco: tipoConta === "EMPRESA" ? document.getElementById("nomeEspaco").value.trim() : ""
    };
    const confirmar = document.getElementById("confirmarSenha").value;

    const problemas = [];
    if (dados.nome.length < 2) problemas.push("Informe seu nome");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) problemas.push("E-mail inválido");
    if (dados.senha.length < 8) problemas.push("A senha deve ter pelo menos 8 caracteres");
    else if (dados.senha !== confirmar) problemas.push("As senhas não conferem");
    if (dados.tipo === "EMPRESA" && dados.nomeEspaco.length < 2) problemas.push("Informe o nome da empresa");

    if (problemas.length) {
        erro.textContent = problemas.join(". ") + ".";
        erro.style.display = "block";
        return;
    }

    botao.disabled = true;
    botao.textContent = "Criando conta...";
    erro.style.display = "none";

    try {
        const resposta = await fetch("/auth/registrar", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        const corpo = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(corpo.error || "Não foi possível criar a conta");
        }

        window.location.href = "/";
    } catch (e) {
        erro.textContent = e.message;
        erro.style.display = "block";
        botao.disabled = false;
        botao.textContent = "Criar conta";
    }
});
