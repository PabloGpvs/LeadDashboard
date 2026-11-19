import { $, iniciais, matizDoNome } from "./utils.js";
import { estado } from "./estado.js";
import { api } from "./api.js";
import { notificar } from "./notificacoes.js";
import { fecharSidebar } from "./navegacao.js";
import { carregarLeads } from "./dados.js";
import { limparFiltros } from "./leads.js";

export async function verificarSistema() {
    try {
        const resposta = await fetch("/health");
        if (!resposta.ok) throw new Error();
        $("statusPonto").className = "status-ponto online";
        $("statusTexto").textContent = "Sistema online";
        $("statusSistema").title = "Servidor e banco de dados respondendo";
    } catch {
        $("statusPonto").className = "status-ponto offline";
        $("statusTexto").textContent = "Sem conexão";
        $("statusSistema").title = "O servidor ou o banco de dados não está respondendo";
    }
}

export async function carregarUsuario() {
    try {
        estado.sessaoAtual = await api("/auth/me");
    } catch {
        return;
    }

    const { usuario, espacoAtual, espacos } = estado.sessaoAtual;

    $("avatarIniciais").textContent = iniciais(usuario.nome);
    $("btnAvatar").style.setProperty("--h", matizDoNome(usuario.nome));
    $("btnAvatar").title = usuario.nome;
    $("usuarioNome").textContent = usuario.nome;
    $("usuarioEmail").textContent = usuario.email;

    const seletor = $("seletorEspaco");
    seletor.innerHTML = "";
    espacos.forEach(espaco => {
        const option = document.createElement("option");
        option.value = espaco.id;
        const tipo = espaco.tipo === "EMPRESA" ? "Empresa" : "Pessoal";
        option.textContent = `${espaco.nome} · ${espaco.papel === "DONO" ? tipo : "Convidado"}`;
        seletor.appendChild(option);
    });
    seletor.value = espacoAtual.id;
    $("blocoEspaco").style.display = "";

    document.title = `${espacoAtual.nome} — LeadDashboard`;
}

export async function trocarEspaco(espacoId) {
    try {
        await api("/espacos/trocar", {
            method: "POST",
            body: JSON.stringify({ espacoId: Number(espacoId) })
        });
        limparFiltros(false);
        await carregarUsuario();
        await carregarLeads();
        notificar(`Agora você está em: ${estado.sessaoAtual.espacoAtual.nome}`);
        fecharSidebar();
    } catch (erro) {
        notificar(erro.message, "erro");
        if (estado.sessaoAtual) $("seletorEspaco").value = estado.sessaoAtual.espacoAtual.id;
    }
}

export async function sair() {
    try {
        await api("/auth/logout", { method: "POST" });
    } finally {
        window.location.href = "/login";
    }
}

export function alternarMenuUsuario() {
    const menu = $("menuUsuario");
    const abrir = menu.hidden;
    menu.hidden = !abrir;
    $("btnAvatar").setAttribute("aria-expanded", String(abrir));
}

export function fecharMenuUsuario() {
    $("menuUsuario").hidden = true;
    $("btnAvatar").setAttribute("aria-expanded", "false");
}
