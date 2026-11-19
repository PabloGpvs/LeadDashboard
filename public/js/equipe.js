import { $, avatarHtml, escapeHtml } from "./utils.js";
import { icone } from "./icones.js";
import { estado } from "./estado.js";
import { api } from "./api.js";
import { notificar } from "./notificacoes.js";
import { abrirCamada, fecharCamada } from "./camadas.js";
import { carregarUsuario, fecharMenuUsuario, sair } from "./sessao.js";
import { fecharSidebar } from "./navegacao.js";
import { carregarLeads } from "./dados.js";
import { limparFiltros } from "./leads.js";

export async function abrirEquipe() {
    fecharMenuUsuario();
    await carregarUsuario();
    if (!estado.sessaoAtual) return;

    const { espacoAtual } = estado.sessaoAtual;
    const ehDono = espacoAtual.papel === "DONO";

    $("equipeNomeEspaco").textContent = espacoAtual.nome;
    $("tokenConvite").textContent = espacoAtual.codigoConvite;
    $("btnNovoToken").hidden = !ehDono;
    $("blocoRenomear").hidden = !ehDono;
    $("inputNomeEspaco").value = espacoAtual.nome;
    $("blocoSair").hidden = ehDono;
    $("inputToken").value = "";

    abrirCamada("modalEquipe");
    fecharSidebar();
    await carregarMembros();
}

export function fecharEquipe() {
    fecharCamada("modalEquipe");
}

async function carregarMembros() {
    const lista = $("listaMembros");
    lista.innerHTML = `<li class="membro"><div class="esqueleto"></div></li>`;

    try {
        const membros = await api("/espacos/membros");
        const ehDono = estado.sessaoAtual.espacoAtual.papel === "DONO";

        $("tituloMembros").textContent = `Membros · ${membros.length}`;

        lista.innerHTML = membros
            .map(
                m => `
            <li class="membro">
                ${avatarHtml(m.nome, "avatar-p")}
                <div class="membro-texto">
                    <strong>${escapeHtml(m.nome)}${m.voce ? " <small>(você)</small>" : ""}</strong>
                    <small>${escapeHtml(m.email)}</small>
                </div>
                <span class="tag ${m.papel === "DONO" ? "tag-ativo" : "tag-neutra"}">${m.papel === "DONO" ? "Dono" : "Membro"}</span>
                ${ehDono && !m.voce ? `<button type="button" class="btn-icone btn-icone-p perigo" data-remover-membro="${m.id}" data-nome="${escapeHtml(m.nome)}" title="Remover">${icone("trash")}</button>` : ""}
            </li>`
            )
            .join("");
    } catch (erro) {
        lista.innerHTML = `<li class="membro">${escapeHtml(erro.message)}</li>`;
    }
}

export async function copiarToken() {
    const token = $("tokenConvite").textContent;
    try {
        await navigator.clipboard.writeText(token);
        notificar("Token copiado.");
    } catch {
        const range = document.createRange();
        range.selectNodeContents($("tokenConvite"));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        notificar("Token selecionado — aperte Ctrl+C.", "aviso");
    }
}

export async function gerarNovoToken() {
    if (!confirm("Gerar um novo token? O atual para de funcionar (quem já entrou continua com acesso)."))
        return;
    try {
        const dados = await api("/espacos/codigo", { method: "POST" });
        $("tokenConvite").textContent = dados.codigoConvite;
        notificar("Novo token gerado.");
    } catch (erro) {
        notificar(erro.message, "erro");
    }
}

export async function entrarComToken(event) {
    event.preventDefault();
    const codigo = $("inputToken").value.trim();
    if (!codigo) {
        notificar("Cole o token de convite.", "aviso");
        return;
    }

    const botao = $("btnEntrarEspaco");
    botao.disabled = true;

    try {
        const dados = await api("/espacos/entrar", { method: "POST", body: JSON.stringify({ codigo }) });
        fecharEquipe();
        limparFiltros(false);
        await carregarUsuario();
        await carregarLeads();
        notificar(
            dados.jaEraMembro
                ? `Você já fazia parte de "${dados.espaco.nome}".`
                : `Você entrou em "${dados.espaco.nome}".`
        );
    } catch (erro) {
        notificar(erro.message, "erro");
    } finally {
        botao.disabled = false;
    }
}

export async function renomearEspaco(event) {
    event.preventDefault();
    try {
        await api("/espacos/nome", {
            method: "PUT",
            body: JSON.stringify({ nome: $("inputNomeEspaco").value.trim() })
        });
        await carregarUsuario();
        $("equipeNomeEspaco").textContent = estado.sessaoAtual.espacoAtual.nome;
        notificar("Nome atualizado.");
    } catch (erro) {
        notificar(erro.message, "erro");
    }
}

export async function removerMembro(usuarioId, nome) {
    if (!confirm(`Remover ${nome}? Essa pessoa perde o acesso aos leads deste espaço.`)) return;
    try {
        await api(`/espacos/membros/${usuarioId}`, { method: "DELETE" });
        notificar(`${nome} foi removido(a).`);
        await carregarMembros();
    } catch (erro) {
        notificar(erro.message, "erro");
    }
}

export async function sairDoEspaco() {
    const nome = estado.sessaoAtual ? estado.sessaoAtual.espacoAtual.nome : "este espaço";
    if (!confirm(`Sair de "${nome}"? Você perde o acesso até usar o token de novo.`)) return;
    try {
        await api("/espacos/sair", { method: "POST" });
        fecharEquipe();
        limparFiltros(false);
        await carregarUsuario();
        await carregarLeads();
        notificar(`Você saiu de "${nome}".`);
    } catch (erro) {
        notificar(erro.message, "erro");
    }
}
