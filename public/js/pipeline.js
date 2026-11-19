import { $, avatarHtml, diasDesde, escapeHtml, TEMPERATURAS, textoDias } from "./utils.js";
import { icone } from "./icones.js";
import { estado } from "./estado.js";
import { api } from "./api.js";
import { notificar } from "./notificacoes.js";
import { atualizarTudo } from "./dados.js";
import { correspondeBusca } from "./leads.js";

export function renderizarKanban() {
    const busca = $("busca").value.toLowerCase().trim();
    const fOrigem = $("filtroOrigem").value;
    const fVendedor = $("filtroVendedor").value;

    const visiveis = estado.todosOsLeads.filter(
        l =>
            l.estado !== "INATIVO" &&
            correspondeBusca(l, busca) &&
            (!fOrigem || l.origem === fOrigem) &&
            (!fVendedor || l.vendedor === fVendedor)
    );

    ["QUENTE", "MORNO", "FRIO"].forEach(status => {
        const doStatus = visiveis
            .filter(l => l.status === status)
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        $(`qtd${status}`).textContent = doStatus.length;

        $(`col${status}`).innerHTML = doStatus.length
            ? doStatus.map(cardKanban).join("")
            : `<div class="coluna-vazia">Solte um lead aqui</div>`;
    });
}

function cardKanban(lead) {
    const dias = diasDesde(lead.dataUltimoContato);
    const atrasado = dias !== null && dias > 30;

    return `
        <article class="card-lead" draggable="true" data-id="${lead.id}">
            <div class="card-topo">
                ${avatarHtml(lead.nome, "avatar-p")}
                <div class="card-titulo">
                    <strong>${escapeHtml(lead.nome)}</strong>
                    <small>${lead.empresa ? escapeHtml(lead.empresa) : escapeHtml(lead.email)}</small>
                </div>
            </div>
            ${lead.feedback ? `<p class="card-feedback">${escapeHtml(lead.feedback)}</p>` : ""}
            <div class="card-meta">
                ${lead.vendedor ? `<span>${icone("user")}${escapeHtml(lead.vendedor)}</span>` : ""}
                ${lead.origem ? `<span>${icone("tag")}${escapeHtml(lead.origem)}</span>` : ""}
                <span class="${atrasado ? "atrasado" : ""}">${icone("clock")}${textoDias(dias)}</span>
            </div>
            <div class="card-acoes">
                <button type="button" class="btn-icone btn-icone-p" data-acao="detalhes" data-id="${lead.id}" title="Ver detalhes">${icone("list")}</button>
                <button type="button" class="btn-icone btn-icone-p" data-acao="editar" data-id="${lead.id}" title="Editar">${icone("edit")}</button>
            </div>
        </article>`;
}

let idArrastando = null;

export function configurarArrastar() {
    const kanban = document.querySelector(".kanban");

    kanban.addEventListener("dragstart", event => {
        const card = event.target.closest(".card-lead");
        if (!card) return;
        idArrastando = Number(card.dataset.id);
        card.classList.add("arrastando");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(idArrastando));
    });

    kanban.addEventListener("dragend", event => {
        const card = event.target.closest(".card-lead");
        if (card) card.classList.remove("arrastando");
        document.querySelectorAll(".coluna.alvo").forEach(c => c.classList.remove("alvo"));
        idArrastando = null;
    });

    document.querySelectorAll(".coluna").forEach(coluna => {
        coluna.addEventListener("dragover", event => {
            if (idArrastando === null) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            coluna.classList.add("alvo");
        });

        coluna.addEventListener("dragleave", event => {
            if (!coluna.contains(event.relatedTarget)) coluna.classList.remove("alvo");
        });

        coluna.addEventListener("drop", async event => {
            event.preventDefault();
            coluna.classList.remove("alvo");
            const id = Number(event.dataTransfer.getData("text/plain") || idArrastando);
            await moverLead(id, coluna.dataset.status);
        });
    });
}

async function moverLead(id, novoStatus) {
    const lead = estado.todosOsLeads.find(l => l.id === id);
    if (!lead || lead.status === novoStatus) return;

    const anterior = lead.status;
    lead.status = novoStatus;
    lead.updatedAt = new Date().toISOString();
    atualizarTudo();

    try {
        await api(`/leads/${id}`, { method: "PUT", body: JSON.stringify({ status: novoStatus }) });
        notificar(`${lead.nome} → ${TEMPERATURAS[novoStatus].rotulo}`);
    } catch (erro) {
        lead.status = anterior;
        atualizarTudo();
        notificar(`Não foi possível mover: ${erro.message}`, "erro");
    }
}
