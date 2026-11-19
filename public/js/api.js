export async function api(url, opcoes = {}) {
    const resposta = await fetch(url, {
        credentials: "same-origin",
        ...opcoes,
        headers: { "Content-Type": "application/json", ...(opcoes.headers || {}) }
    });

    if (resposta.status === 401) {
        window.location.href = "/login";
        throw new Error("Sessão expirada");
    }

    let corpo = null;
    try {
        corpo = await resposta.json();
    } catch {
        corpo = null;
    }

    if (!resposta.ok) {
        throw new Error((corpo && corpo.error) || `Erro ${resposta.status}`);
    }

    return corpo;
}
