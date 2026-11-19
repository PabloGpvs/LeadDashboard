import {
    $,
    diasDesde,
    escapeHtml,
    formatarData,
    formatarDataHora,
    iniciais,
    matizDoNome,
    ouTraco,
    tagEstado,
    tagTemperatura,
    textoDias
} from "./utils.js";
import { icone } from "./icones.js";
import { estado } from "./estado.js";
import { abrirCamada, fecharCamada } from "./camadas.js";

export function abrirDetalhes(id) {
    const lead = estado.todosOsLeads.find(l => l.id === id);
    if (!lead) return;

    const dias = diasDesde(lead.dataUltimoContato);
    const item = (ic, rotulo, valor) => `
        <div class="detalhe">
            <span class="detalhe-rotulo">${icone(ic)}${rotulo}</span>
            <span class="detalhe-valor">${valor}</span>
        </div>`;

    const avatar = $("modalAvatar");
    avatar.textContent = iniciais(lead.nome);
    avatar.style.setProperty("--h", matizDoNome(lead.nome));
    $("modalTitulo").textContent = lead.nome;

    $("modalCorpo").innerHTML = `
        <div class="detalhe-tags">${tagTemperatura(lead)}${tagEstado(lead.estado)}${lead.origem ? `<span class="tag tag-contorno">${escapeHtml(lead.origem)}</span>` : ""}</div>

        <div class="detalhes-grade">
            ${item("mail", "E-mail", lead.email ? `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>` : "—")}
            ${item("phone", "Telefone", ouTraco(lead.telefone))}
            ${item("building", "Empresa", ouTraco(lead.empresa))}
            ${item("pin", "Cidade", ouTraco(lead.cidade))}
            ${item("user", "Vendedor", ouTraco(lead.vendedor))}
            ${item("calendar", "Último contato", `${formatarData(lead.dataUltimoContato, true)} <small>(${textoDias(dias)})</small>`)}
            ${item("clock", "Criado em", `<span class="mono">${formatarDataHora(lead.createdAt)}</span>`)}
            ${item("refresh", "Atualizado em", `<span class="mono">${formatarDataHora(lead.updatedAt)}</span>`)}
        </div>

        <div class="bloco">
            <span class="bloco-rotulo">${icone("message")}Feedback</span>
            <p class="bloco-texto-forte">${ouTraco(lead.feedback)}</p>
        </div>

        <div class="bloco">
            <span class="bloco-rotulo">${icone("list")}Observações</span>
            <p class="bloco-texto-forte pre">${lead.observacao ? escapeHtml(lead.observacao) : `<span class="vazio">Nenhuma observação.</span>`}</p>
        </div>

        <div class="modal-acoes">
            <button type="button" class="btn-perigo" data-acao="excluir" data-id="${lead.id}">${icone("trash")}Excluir</button>
            <button type="button" class="btn-neon" data-acao="editar" data-id="${lead.id}">${icone("edit")}<span>Editar</span></button>
        </div>`;

    abrirCamada("modalFundo");
}

export function fecharModal() {
    fecharCamada("modalFundo");
}
