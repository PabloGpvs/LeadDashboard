import { $, animarNumero, avatarHtml, diasDesde, escapeHtml } from "./utils.js";
import { icone } from "./icones.js";
import { estado } from "./estado.js";

function ativos() {
    return estado.todosOsLeads.filter(l => l.estado !== "INATIVO");
}

export function atualizarKpis() {
    const lista = ativos();
    const total = lista.length;
    const contar = s => lista.filter(l => l.status === s).length;
    const pct = n => (total ? Math.round((n / total) * 100) : 0);

    const q = contar("QUENTE");
    const m = contar("MORNO");
    const f = contar("FRIO");

    animarNumero($("kpiTotal"), estado.todosOsLeads.length);
    animarNumero($("kpiQuente"), q);
    animarNumero($("kpiMorno"), m);
    animarNumero($("kpiFrio"), f);

    $("kpiTotalSub").textContent = `${total} ativo${total === 1 ? "" : "s"}`;
    $("kpiQuenteSub").textContent = `${pct(q)}% dos ativos`;
    $("kpiMornoSub").textContent = `${pct(m)}% dos ativos`;
    $("kpiFrioSub").textContent = `${pct(f)}% dos ativos`;

    document.querySelector('.kpi[data-kpi=""]').style.setProperty("--pct", "100%");
    document.querySelector('.kpi[data-kpi="QUENTE"]').style.setProperty("--pct", `${pct(q)}%`);
    document.querySelector('.kpi[data-kpi="MORNO"]').style.setProperty("--pct", `${pct(m)}%`);
    document.querySelector('.kpi[data-kpi="FRIO"]').style.setProperty("--pct", `${pct(f)}%`);
}

function inicioDaSemana(data) {
    const d = new Date(data);
    const dia = (d.getDay() + 6) % 7; // segunda = 0
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - dia);
    return d;
}

export function renderizarGraficoLinha() {
    const SEMANAS = 8;
    const atual = inicioDaSemana(new Date());
    const semanas = [];

    for (let i = SEMANAS - 1; i >= 0; i--) {
        const ini = new Date(atual);
        ini.setDate(ini.getDate() - i * 7);
        const fim = new Date(ini);
        fim.setDate(fim.getDate() + 7);
        const qtd = estado.todosOsLeads.filter(l => {
            const c = new Date(l.createdAt);
            return c >= ini && c < fim;
        }).length;
        semanas.push({ ini, qtd });
    }

    const totalPeriodo = semanas.reduce((s, x) => s + x.qtd, 0);
    $("totalSemanas").textContent = `${totalPeriodo} em ${SEMANAS} semanas`;

    // usa a largura real do painel para não distorcer texto e pontos
    const L = Math.max(300, Math.round($("graficoLinha").clientWidth || 640));
    const A = 220,
        ml = 34,
        mr = 16,
        mt = 18,
        mb = 30;
    const maxBruto = Math.max(...semanas.map(s => s.qtd), 1);
    const max = Math.max(4, Math.ceil(maxBruto * 1.2));
    const x = i => ml + (i * (L - ml - mr)) / (SEMANAS - 1);
    const y = v => mt + (A - mt - mb) * (1 - v / max);

    const pontos = semanas.map((s, i) => [x(i), y(s.qtd)]);

    // curva suave (Catmull-Rom → Bézier)
    let linha = `M${pontos[0][0]},${pontos[0][1]}`;
    for (let i = 0; i < pontos.length - 1; i++) {
        const p0 = pontos[i - 1] || pontos[i];
        const p1 = pontos[i];
        const p2 = pontos[i + 1];
        const p3 = pontos[i + 2] || p2;
        const c1x = p1[0] + (p2[0] - p0[0]) / 6,
            c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6,
            c2y = p2[1] - (p3[1] - p1[1]) / 6;
        linha += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
    }
    const area = `${linha} L${pontos[pontos.length - 1][0]},${A - mb} L${pontos[0][0]},${A - mb} Z`;

    const linhasGrade = [0, 0.25, 0.5, 0.75, 1]
        .map(f => {
            const v = Math.round(max * f);
            const yy = y(v);
            return `<line x1="${ml}" x2="${L - mr}" y1="${yy}" y2="${yy}" class="grade-linha"/>
                <text x="${ml - 8}" y="${yy + 3}" class="eixo" text-anchor="end">${v}</text>`;
        })
        .join("");

    const rotulos = semanas
        .map((s, i) => {
            const d = s.ini;
            const txt = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
            return `<text x="${x(i)}" y="${A - 8}" class="eixo" text-anchor="middle">${txt}</text>`;
        })
        .join("");

    const circulos = pontos
        .map(
            ([px, py], i) => `
        <g class="ponto-grafico">
            <circle cx="${px}" cy="${py}" r="10" class="ponto-halo"/>
            <circle cx="${px}" cy="${py}" r="3.5" class="ponto-nucleo"/>
            <title>Semana de ${semanas[i].ini.toLocaleDateString("pt-BR")}: ${semanas[i].qtd} lead(s)</title>
        </g>`
        )
        .join("");

    $("graficoLinha").innerHTML = `
        <svg viewBox="0 0 ${L} ${A}" role="img" aria-label="Leads novos por semana">
            <defs>
                <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--verde)" stop-opacity="0.32"/>
                    <stop offset="100%" stop-color="var(--verde)" stop-opacity="0"/>
                </linearGradient>
                <filter id="brilho" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            ${linhasGrade}
            <path d="${area}" fill="url(#gradArea)"/>
            <path d="${linha}" class="linha-principal" filter="url(#brilho)"/>
            ${circulos}
            ${rotulos}
        </svg>`;
}

export function renderizarDonut() {
    const lista = ativos();
    const total = lista.length;
    const dados = [
        { chave: "QUENTE", rotulo: "Quentes", cor: "var(--quente)" },
        { chave: "MORNO", rotulo: "Mornos", cor: "var(--morno)" },
        { chave: "FRIO", rotulo: "Frios", cor: "var(--frio)" }
    ].map(d => ({ ...d, qtd: lista.filter(l => l.status === d.chave).length }));

    const r = 62;
    const C = 2 * Math.PI * r;
    const folga = total > 0 ? 4 : 0;
    let acumulado = 0;

    const arcos = dados
        .map(d => {
            if (!d.qtd) return "";
            const comp = (d.qtd / total) * C;
            const traco = Math.max(0, comp - folga);
            const arco = `<circle cx="80" cy="80" r="${r}" class="donut-arco" stroke="${d.cor}"
            stroke-dasharray="${traco} ${C - traco}" stroke-dashoffset="${-acumulado}"
            style="filter: drop-shadow(0 0 6px ${d.cor})"><title>${d.rotulo}: ${d.qtd}</title></circle>`;
            acumulado += comp;
            return arco;
        })
        .join("");

    const legenda = dados
        .map(d => {
            const pct = total ? Math.round((d.qtd / total) * 100) : 0;
            return `
            <li>
                <span class="legenda-cor" style="--cor:${d.cor}"></span>
                <span class="legenda-nome">${d.rotulo}</span>
                <span class="legenda-valor mono">${d.qtd}</span>
                <span class="legenda-pct mono">${pct}%</span>
            </li>`;
        })
        .join("");

    $("graficoDonut").innerHTML = `
        <div class="donut">
            <svg viewBox="0 0 160 160" role="img" aria-label="Distribuição por temperatura">
                <circle cx="80" cy="80" r="${r}" class="donut-trilho"/>
                <circle cx="80" cy="80" r="48" class="donut-anel-interno"/>
                <g transform="rotate(-90 80 80)">${arcos}</g>
            </svg>
            <div class="donut-centro">
                <strong class="mono">${total}</strong>
                <span>ativos</span>
            </div>
        </div>
        <ul class="legenda">${legenda}</ul>`;
}

function contarPor(lista, campo, rotuloVazio) {
    const contagem = {};
    lista.forEach(item => {
        const chave = item[campo] || rotuloVazio;
        contagem[chave] = (contagem[chave] || 0) + 1;
    });
    return Object.entries(contagem).sort((a, b) => b[1] - a[1]);
}

function barrasHtml(itens, total, cor) {
    if (!total || !itens.length) {
        return `<p class="grafico-vazio">Sem leads ativos ainda.</p>`;
    }
    const maior = itens[0][1];
    return itens
        .map(([rotulo, qtd]) => {
            const pct = Math.round((qtd / total) * 100);
            const largura = Math.max(4, Math.round((qtd / maior) * 100));
            return `
            <div class="barra-item">
                <div class="barra-info">
                    <span>${escapeHtml(rotulo)}</span>
                    <span class="mono">${qtd}<em>${pct}%</em></span>
                </div>
                <div class="barra-trilho"><div class="barra" style="width:${largura}%; --cor:${cor}"></div></div>
            </div>`;
        })
        .join("");
}

export function renderizarBarras() {
    const lista = ativos();
    $("graficoOrigem").innerHTML = barrasHtml(
        contarPor(lista, "origem", "Não informada").slice(0, 6),
        lista.length,
        "var(--verde)"
    );
    $("graficoVendedor").innerHTML = barrasHtml(
        contarPor(lista, "vendedor", "Sem vendedor").slice(0, 6),
        lista.length,
        "var(--ciano)"
    );
}

export function renderizarAtencao() {
    const lista = ativos()
        .map(l => ({ lead: l, dias: diasDesde(l.dataUltimoContato) }))
        .filter(x => (x.dias === null ? diasDesde(x.lead.createdAt) > 7 : x.dias > 30))
        .sort((a, b) => (b.dias ?? 9999) - (a.dias ?? 9999));

    $("totalAtencao").textContent = lista.length;

    if (!lista.length) {
        $("listaAtencao").innerHTML = `
            <li class="atencao-ok">${icone("check")}<span>Tudo em dia. Nenhum lead parado.</span></li>`;
        return;
    }

    $("listaAtencao").innerHTML = lista
        .slice(0, 6)
        .map(
            ({ lead, dias }) => `
        <li>
            <button type="button" class="atencao-item" data-acao="detalhes" data-id="${lead.id}">
                ${avatarHtml(lead.nome, "avatar-p")}
                <span class="atencao-texto">
                    <strong>${escapeHtml(lead.nome)}</strong>
                    <small>${lead.empresa ? escapeHtml(lead.empresa) : "Sem empresa"}</small>
                </span>
                <span class="atencao-dias mono">${dias === null ? "sem contato" : `${dias}d`}</span>
            </button>
        </li>`
        )
        .join("");
}
