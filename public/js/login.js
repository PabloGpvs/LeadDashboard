document.getElementById("formLogin").addEventListener("submit", async event => {
    event.preventDefault();

    const botao = document.getElementById("btnEntrar");
    const erro = document.getElementById("loginErro");

    botao.disabled = true;
    botao.textContent = "Entrando...";
    erro.style.display = "none";

    try {
        const resposta = await fetch("/auth/login", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: document.getElementById("email").value.trim(),
                senha: document.getElementById("senha").value
            })
        });

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(dados.error || "Não foi possível entrar");
        }

        window.location.href = "/";
    } catch (e) {
        erro.textContent = e.message;
        erro.style.display = "block";
        botao.disabled = false;
        botao.textContent = "Entrar";
    }
});
