import { $ } from "./utils.js";
import { estado } from "./estado.js";
import { api } from "./api.js";
import { notificar } from "./notificacoes.js";
import {
    atualizarKpis,
    renderizarAtencao,
    renderizarBarras,
    renderizarDonut,
    renderizarGraficoLinha
} from "./dashboard.js";
import { aplicarFiltros, atualizarFiltroVendedores } from "./leads.js";

export async function carregarLeads() {
    $("carregando").hidden = false;

    try {
        estado.todosOsLeads = await api("/leads");
        atualizarTudo();
    } catch (erro) {
        console.error(erro);
        notificar(`Erro ao carregar os leads: ${erro.message}`, "erro");
    } finally {
        $("carregando").hidden = true;
    }
}

export function atualizarTudo() {
    atualizarKpis();
    renderizarGraficoLinha();
    renderizarDonut();
    renderizarBarras();
    renderizarAtencao();
    atualizarFiltroVendedores();
    aplicarFiltros(false);
    $("badgeLeads").textContent = estado.todosOsLeads.length;
}
