import { $ } from "./utils.js";
import { estado } from "./estado.js";
import { renderizarGraficoLinha } from "./dashboard.js";

const VIEWS = {
    dashboard: { titulo: "Visão geral", eyebrow: "// visão geral" },
    leads: { titulo: "Leads", eyebrow: "// base de contatos" },
    pipeline: { titulo: "Pipeline", eyebrow: "// funil por temperatura" }
};

export function mostrarView(nome) {
    if (!VIEWS[nome]) nome = "dashboard";
    estado.viewAtual = nome;

    document.querySelectorAll(".view").forEach(v => {
        v.classList.toggle("ativa", v.id === `view-${nome}`);
    });

    document.querySelectorAll(".nav-item[data-view]").forEach(a => {
        a.classList.toggle("ativo", a.dataset.view === nome);
    });

    $("tituloPagina").textContent = VIEWS[nome].titulo;
    $("eyebrow").textContent = VIEWS[nome].eyebrow;

    if (location.hash !== `#${nome}`) history.replaceState(null, "", `#${nome}`);

    if (nome === "dashboard") requestAnimationFrame(renderizarGraficoLinha);

    fecharSidebar();
    window.scrollTo({ top: 0 });
}

export function abrirSidebar() {
    document.body.classList.add("sidebar-aberta");
}

export function fecharSidebar() {
    document.body.classList.remove("sidebar-aberta");
}
