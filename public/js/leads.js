import {
    $,
    avatarHtml,
    diasDesde,
    escapeHtml,
    formatarData,
    ouTraco,
    tagEstado,
    tagTemperatura,
    textoDias
} from "./utils.js";
import { icone } from "./icones.js";
import { estado } from "./estado.js";
import { api } from "./api.js";
import { notificar } from "./notificacoes.js";
import { carregarLeads } from "./dados.js";
import { renderizarKanban } from "./pipeline.js";
import { fecharDrawer } from "./formulario.js";
import { fecharModal } from "./detalhes.js";

export function atualizarFiltroVendedores() {
    const select = $("filtroVendedor");
    const selecionado = select.value;

    const vendedores = [...new Set(estado.todosOsLeads.map(l => l.vendedor).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
    );

    select.innerHTML = `<option value="">Todos</option>`;
    $("listaVendedores").innerHTML = "";

    vendedores.forEach(v => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        select.appendChild(o);

        const s = document.createElement("option");
        s.value = v;
        $("listaVendedores").appendChild(s);
    });

    if (vendedores.includes(selecionado)) select.value = selecionado;
}

export function correspondeBusca(lead, busca) {
    if (!busca) return true;
    return [lead.nome, lead.email, lead.empresa, lead.telefone, lead.vendedor, lead.cidade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(busca);
}

export function aplicarFiltros(voltarParaPrimeira = true) {
    const busca = $("busca").value.toLowerCase().trim();
    const fStatus = $("filtroStatus").value;
    const fOrigem = $("filtroOrigem").value;
    const fVendedor = $("filtroVendedor").value;
    const fEstado = $("filtroEstado").value;

    estado.leadsFiltrados = estado.todosOsLeads.filter(
        lead =>
            correspondeBusca(lead, busca) &&
            (!fStatus || (lead.status === fStatus && lead.estado !== "INATIVO")) &&
            (!fOrigem || lead.origem === fOrigem) &&
            (!fVendedor || lead.vendedor === fVendedor) &&
            (!fEstado || lead.estado === fEstado)
    );

    ordenarLeads();
    if (voltarParaPrimeira) estado.paginaAtual = 1;

    renderizarTabela();
    renderizarKanban();
}

export function limparFiltros(reaplicar = true) {
    $("busca").value = "";
    $("filtroStatus").value = "";
    $("filtroOrigem").value = "";
    $("filtroVendedor").value = "";
    $("filtroEstado").value = "";
    if (reaplicar) aplicarFiltros();
}

const ORDEM_STATUS = { QUENTE: 0, MORNO: 1, FRIO: 2 };

function ordenarLeads() {
    const { campo, direcao } = estado.ordenacao;
    const fator = direcao === "asc" ? 1 : -1;

    estado.leadsFiltrados.sort((a, b) => {
        const va = a[campo],
            vb = b[campo];
        if (!va && !vb) return 0;
        if (!va) return 1;
        if (!vb) return -1;
        if (campo === "createdAt" || campo === "dataUltimoContato")
            return (new Date(va) - new Date(vb)) * fator;
        if (campo === "status") return ((ORDEM_STATUS[va] ?? 9) - (ORDEM_STATUS[vb] ?? 9)) * fator;
        return String(va).localeCompare(String(vb), "pt-BR", { sensitivity: "base" }) * fator;
    });

    document.querySelectorAll("th.ordenavel").forEach(th => {
        th.classList.remove("asc", "desc");
        if (th.dataset.campo === campo) th.classList.add(direcao);
    });
}

export function alternarOrdenacao(campo) {
    if (estado.ordenacao.campo === campo) {
        estado.ordenacao.direcao = estado.ordenacao.direcao === "asc" ? "desc" : "asc";
    } else {
        const ehData = campo === "createdAt" || campo === "dataUltimoContato";
        estado.ordenacao = { campo, direcao: ehData ? "desc" : "asc" };
    }
    ordenarLeads();
    renderizarTabela();
}

export function renderizarTabela() {
    const tabela = $("listaLeads");
    const total = estado.leadsFiltrados.length;
    const totalPaginas = Math.max(1, Math.ceil(total / estado.itensPorPagina));
    if (estado.paginaAtual > totalPaginas) estado.paginaAtual = totalPaginas;

    $("resultadoBusca").textContent = total === 1 ? "1 lead" : `${total} leads`;

    if (total === 0) {
        tabela.innerHTML = "";
        $("semResultados").hidden = false;
        const vazioTotal = estado.todosOsLeads.length === 0;
        $("semResultadosTitulo").textContent = vazioTotal
            ? "Nenhum lead por aqui ainda"
            : "Nenhum lead encontrado";
        $("semResultadosTexto").textContent = vazioTotal
            ? "Cadastre o primeiro lead para começar a acompanhar suas oportunidades."
            : "Ajuste a busca ou os filtros para ver mais resultados.";
        $("paginacao").hidden = true;
        return;
    }

    $("semResultados").hidden = true;

    const inicio = (estado.paginaAtual - 1) * estado.itensPorPagina;
    const pagina = estado.leadsFiltrados.slice(inicio, inicio + estado.itensPorPagina);

    tabela.innerHTML = pagina
        .map(lead => {
            const dias = diasDesde(lead.dataUltimoContato);
            const atrasado = lead.estado !== "INATIVO" && dias !== null && dias > 30;

            return `
            <tr class="${estado.leadEditando === lead.id ? "linha-editando" : ""} ${lead.estado === "INATIVO" ? "linha-inativa" : ""}">
                <td data-label="Contato">
                    <button type="button" class="contato" data-acao="detalhes" data-id="${lead.id}">
                        ${avatarHtml(lead.nome)}
                        <span class="contato-texto">
                            <strong>${escapeHtml(lead.nome)}${lead.observacao ? `<span class="marcador-obs" title="Tem observações"></span>` : ""}</strong>
                            <small>${escapeHtml(lead.email || "")}${lead.telefone ? ` · ${escapeHtml(lead.telefone)}` : ""}</small>
                        </span>
                    </button>
                </td>
                <td data-label="Empresa">
                    <span class="celula-dupla">
                        <span>${ouTraco(lead.empresa)}</span>
                        ${lead.cidade ? `<small>${escapeHtml(lead.cidade)}</small>` : ""}
                    </span>
                </td>
                <td data-label="Vendedor">${ouTraco(lead.vendedor)}</td>
                <td data-label="Origem">${lead.origem ? `<span class="tag tag-contorno">${escapeHtml(lead.origem)}</span>` : ouTraco(null)}</td>
                <td data-label="Temperatura">${tagTemperatura(lead)}</td>
                <td data-label="Estado">${tagEstado(lead.estado)}</td>
                <td data-label="Último contato" class="${atrasado ? "atrasado" : ""}" title="${lead.dataUltimoContato ? textoDias(dias) : "Nunca contatado"}">
                    <span class="mono">${formatarData(lead.dataUltimoContato, true)}</span>${atrasado ? icone("alert", "ico-alerta") : ""}
                </td>
                <td data-label="Criado"><span class="mono texto-3">${formatarData(lead.createdAt)}</span></td>
                <td class="td-acoes">
                    <div class="acoes">
                        <button type="button" class="btn-icone btn-icone-p" data-acao="editar" data-id="${lead.id}" title="Editar">${icone("edit")}</button>
                        <button type="button" class="btn-icone btn-icone-p perigo" data-acao="excluir" data-id="${lead.id}" title="Excluir">${icone("trash")}</button>
                    </div>
                </td>
            </tr>`;
        })
        .join("");

    $("paginacao").hidden = false;
    $("textoPagina").textContent =
        `${String(estado.paginaAtual).padStart(2, "0")} / ${String(totalPaginas).padStart(2, "0")}`;
    $("btnPaginaAnterior").disabled = estado.paginaAtual <= 1;
    $("btnProximaPagina").disabled = estado.paginaAtual >= totalPaginas;
}

export async function excluirLead(id) {
    const lead = estado.todosOsLeads.find(l => l.id === id);
    const nome = lead ? lead.nome : "este lead";

    if (!confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) return;

    try {
        await api(`/leads/${id}`, { method: "DELETE" });
        if (estado.leadEditando === id) fecharDrawer();
        fecharModal();
        notificar("Lead excluído.");
        await carregarLeads();
    } catch (erro) {
        notificar(`Erro ao excluir: ${erro.message}`, "erro");
    }
}

export function exportarCSV() {
    if (!estado.leadsFiltrados.length) {
        notificar("Não há leads para exportar com os filtros atuais.", "aviso");
        return;
    }

    const colunas = [
        ["ID", l => l.id],
        ["Criado em", l => formatarData(l.createdAt)],
        ["Nome", l => l.nome],
        ["E-mail", l => l.email],
        ["Telefone", l => l.telefone],
        ["Empresa", l => l.empresa],
        ["Vendedor", l => l.vendedor],
        ["Cidade", l => l.cidade],
        ["Origem", l => l.origem],
        ["Temperatura", l => (l.estado === "INATIVO" ? "" : l.status)],
        ["Estado", l => l.estado],
        ["Último contato", l => (l.dataUltimoContato ? formatarData(l.dataUltimoContato, true) : "")],
        ["Feedback", l => l.feedback],
        ["Observações", l => l.observacao]
    ];

    const celula = v => {
        let t = v === null || v === undefined ? "" : String(v);
        if (/^[=+\-@]/.test(t)) t = "'" + t;
        return `"${t.replace(/"/g, '""')}"`;
    };

    const linhas = [
        colunas.map(([t]) => celula(t)).join(";"),
        ...leadsFiltrados.map(l => colunas.map(([, f]) => celula(f(l))).join(";"))
    ];

    const blob = new Blob(["﻿" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    notificar(`${estado.leadsFiltrados.length} lead(s) exportado(s).`);
}
