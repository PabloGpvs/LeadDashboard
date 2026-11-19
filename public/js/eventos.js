import { $ } from "./utils.js";
import { estado } from "./estado.js";
import { alternarMenuUsuario, fecharMenuUsuario, sair, trocarEspaco } from "./sessao.js";
import { abrirSidebar, fecharSidebar, mostrarView } from "./navegacao.js";
import { renderizarGraficoLinha } from "./dashboard.js";
import {
    alternarOrdenacao,
    aplicarFiltros,
    excluirLead,
    exportarCSV,
    limparFiltros,
    renderizarTabela
} from "./leads.js";
import { configurarArrastar } from "./pipeline.js";
import { abrirDrawer, definirStatusForm, fecharDrawer, salvarLead } from "./formulario.js";
import { abrirDetalhes, fecharModal } from "./detalhes.js";
import {
    abrirEquipe,
    copiarToken,
    entrarComToken,
    fecharEquipe,
    gerarNovoToken,
    removerMembro,
    renomearEspaco,
    sairDoEspaco
} from "./equipe.js";
import { abrirImportacao, fecharImportacao } from "./importacao.js";
import { fecharRelatorio } from "./relatorio.js";

export function configurarEventos() {
    // Navegação
    window.addEventListener("hashchange", () => mostrarView(location.hash.slice(1)));

    let timerResize;
    window.addEventListener("resize", () => {
        clearTimeout(timerResize);
        timerResize = setTimeout(() => {
            if (estado.viewAtual === "dashboard") renderizarGraficoLinha();
        }, 150);
    });
    $("btnMenu").addEventListener("click", abrirSidebar);
    $("sidebarFundo").addEventListener("click", fecharSidebar);

    // Busca global
    let timer;
    $("busca").addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (estado.viewAtual === "dashboard" && $("busca").value.trim()) mostrarView("leads");
            aplicarFiltros();
        }, 180);
    });

    // Filtros
    ["filtroStatus", "filtroOrigem", "filtroVendedor", "filtroEstado"].forEach(id => {
        $(id).addEventListener("change", () => aplicarFiltros());
    });
    $("btnLimparFiltros").addEventListener("click", () => limparFiltros());
    $("btnExportar").addEventListener("click", exportarCSV);

    // KPIs → filtram a lista
    document.querySelectorAll(".kpi").forEach(kpi => {
        kpi.addEventListener("click", () => {
            limparFiltros(false);
            $("filtroStatus").value = kpi.dataset.kpi;
            if (kpi.dataset.kpi) $("filtroEstado").value = "ATIVO";
            aplicarFiltros();
            mostrarView("leads");
        });
    });

    // Ordenação e paginação
    document.querySelectorAll("th.ordenavel").forEach(th => {
        th.addEventListener("click", () => alternarOrdenacao(th.dataset.campo));
    });
    $("itensPorPagina").addEventListener("change", e => {
        estado.itensPorPagina = Number(e.target.value);
        estado.paginaAtual = 1;
        renderizarTabela();
    });
    $("btnPaginaAnterior").addEventListener("click", () => {
        if (estado.paginaAtual > 1) {
            estado.paginaAtual--;
            renderizarTabela();
        }
    });
    $("btnProximaPagina").addEventListener("click", () => {
        estado.paginaAtual++;
        renderizarTabela();
    });

    // Gaveta
    $("btnNovoLead").addEventListener("click", () => abrirDrawer());
    $("btnFecharDrawer").addEventListener("click", fecharDrawer);
    $("btnCancelar").addEventListener("click", fecharDrawer);
    $("drawerFundo").addEventListener("mousedown", e => {
        if (e.target === $("drawerFundo")) fecharDrawer();
    });
    $("formLead").addEventListener("submit", salvarLead);
    document.querySelectorAll("#chipsStatus .chip").forEach(chip => {
        chip.addEventListener("click", () => definirStatusForm(chip.dataset.valor));
    });

    // Ações com data-acao (tabela, kanban, modal, atenção)
    document.addEventListener("click", e => {
        const alvo = e.target.closest("[data-acao]");
        if (!alvo) return;
        const id = Number(alvo.dataset.id);
        const acao = alvo.dataset.acao;
        if (acao === "novo") abrirDrawer();
        if (acao === "importar") abrirImportacao();
        if (acao === "editar") {
            const lead = estado.todosOsLeads.find(l => l.id === id);
            if (lead) abrirDrawer(lead);
        }
        if (acao === "excluir") excluirLead(id);
        if (acao === "detalhes") abrirDetalhes(id);
    });

    // Modais
    $("btnFecharModal").addEventListener("click", fecharModal);
    $("modalFundo").addEventListener("mousedown", e => {
        if (e.target === $("modalFundo")) fecharModal();
    });

    // Equipe
    $("btnEquipe").addEventListener("click", abrirEquipe);
    $("btnEquipeMenu").addEventListener("click", abrirEquipe);
    $("btnFecharEquipe").addEventListener("click", fecharEquipe);
    $("modalEquipe").addEventListener("mousedown", e => {
        if (e.target === $("modalEquipe")) fecharEquipe();
    });
    $("btnCopiarToken").addEventListener("click", copiarToken);
    $("btnNovoToken").addEventListener("click", gerarNovoToken);
    $("formEntrarEspaco").addEventListener("submit", entrarComToken);
    $("formRenomear").addEventListener("submit", renomearEspaco);
    $("btnSairEspaco").addEventListener("click", sairDoEspaco);
    $("seletorEspaco").addEventListener("change", e => trocarEspaco(e.target.value));
    $("listaMembros").addEventListener("click", e => {
        const b = e.target.closest("[data-remover-membro]");
        if (b) removerMembro(Number(b.dataset.removerMembro), b.dataset.nome);
    });

    // Menu do usuário
    $("btnAvatar").addEventListener("click", e => {
        e.stopPropagation();
        alternarMenuUsuario();
    });
    document.addEventListener("click", e => {
        if (!e.target.closest(".usuario-menu")) fecharMenuUsuario();
    });
    $("btnSair").addEventListener("click", sair);

    // Teclado
    document.addEventListener("keydown", e => {
        const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

        if (e.key === "Escape") {
            if (!$("menuUsuario").hidden) fecharMenuUsuario();
            else if (!$("modalImportacao").hidden) fecharImportacao();
            else if (!$("modalRelatorio").hidden) fecharRelatorio();
            else if (!$("modalEquipe").hidden) fecharEquipe();
            else if (!$("modalFundo").hidden) fecharModal();
            else if (!$("drawerFundo").hidden) fecharDrawer();
            else fecharSidebar();
            return;
        }

        if (!digitando && e.key === "/") {
            e.preventDefault();
            $("busca").focus();
        }

        const algoAberto = [
            "drawerFundo",
            "modalFundo",
            "modalEquipe",
            "modalImportacao",
            "modalRelatorio"
        ].some(id => !$(id).hidden);
        if (
            !digitando &&
            !algoAberto &&
            e.key.toLowerCase() === "n" &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey
        ) {
            e.preventDefault();
            abrirDrawer();
        }
    });

    configurarArrastar();
}
