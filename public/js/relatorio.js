import { $, escapeHtml } from "./utils.js";
import { estado } from "./estado.js";
import { notificar } from "./notificacoes.js";
import { abrirCamada, fecharCamada } from "./camadas.js";

// Gera uma planilha .xlsx com os leads de um ou mais vendedores.

const SCRIPT_XLSX = "/vendor/write-excel-file.min.js";
const SEM_VENDEDOR = "__sem_vendedor__";

const VERDE = "#16A34A";
const CINZA = "#6B7280";

const COLUNAS = [
    { titulo: "Nome", largura: 26, valor: l => l.nome },
    { titulo: "E-mail", largura: 30, valor: l => l.email },
    { titulo: "Telefone", largura: 17, valor: l => l.telefone },
    { titulo: "Empresa", largura: 22, valor: l => l.empresa },
    { titulo: "Cidade", largura: 16, valor: l => l.cidade },
    { titulo: "Vendedor", largura: 16, valor: l => l.vendedor, soNaAbaUnica: true },
    { titulo: "Origem", largura: 12, valor: l => l.origem },
    {
        titulo: "Temperatura",
        largura: 13,
        valor: l => (l.estado === "INATIVO" ? "" : rotuloTemperatura(l.status))
    },
    { titulo: "Situação", largura: 10, valor: l => (l.estado === "INATIVO" ? "Inativo" : "Ativo") },
    { titulo: "Último contato", largura: 15, valor: l => dataExcel(l.dataUltimoContato) },
    { titulo: "Criado em", largura: 12, valor: l => dataExcel(l.createdAt) },
    { titulo: "Feedback", largura: 32, valor: l => l.feedback },
    { titulo: "Observações", largura: 40, valor: l => l.observacao }
];

function rotuloTemperatura(status) {
    return { QUENTE: "Quente", MORNO: "Morno", FRIO: "Frio" }[status] || status || "";
}

// Datas sem horário: usa meio-dia UTC para não "voltar um dia" ao abrir no Excel
function dataExcel(valor) {
    if (!valor) return null;
    const data = new Date(valor);
    if (isNaN(data)) return null;
    return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate(), 12));
}

function chaveVendedor(lead) {
    return lead.vendedor || SEM_VENDEDOR;
}

function nomeVendedor(chave) {
    return chave === SEM_VENDEDOR ? "Sem vendedor" : chave;
}

function carregarScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Não foi possível carregar o gerador de Excel"));
        document.head.appendChild(script);
    });
}

// ---------- filtros da tela ----------

function vendedoresComContagem() {
    const contagem = new Map();
    estado.todosOsLeads.forEach(lead => {
        const chave = chaveVendedor(lead);
        contagem.set(chave, (contagem.get(chave) || 0) + 1);
    });

    return [...contagem.entries()].sort((a, b) => {
        if (a[0] === SEM_VENDEDOR) return 1;
        if (b[0] === SEM_VENDEDOR) return -1;
        return b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR");
    });
}

function vendedoresMarcados() {
    return [...document.querySelectorAll("#relVendedores input:checked")].map(i => i.value);
}

function temperaturasMarcadas() {
    return [...document.querySelectorAll("#relTemperaturas .chip.ativo")].map(c => c.dataset.valor);
}

function leadsSelecionados() {
    const vendedores = new Set(vendedoresMarcados());
    const temperaturas = new Set(temperaturasMarcadas());
    const situacao = $("relSituacao").value;
    const de = $("relDe").value;
    const ate = $("relAte").value;

    return estado.todosOsLeads.filter(lead => {
        if (!vendedores.has(chaveVendedor(lead))) return false;
        if (situacao && lead.estado !== situacao) return false;
        // inativos não têm temperatura, então o filtro de temperatura vale só para ativos
        if (lead.estado !== "INATIVO" && !temperaturas.has(lead.status)) return false;

        const criado = new Date(lead.createdAt).toISOString().slice(0, 10);
        if (de && criado < de) return false;
        if (ate && criado > ate) return false;

        return true;
    });
}

function atualizarContador() {
    const leads = leadsSelecionados();
    const vendedores = vendedoresMarcados();
    const total = leads.length;

    $("relContador").textContent =
        total === 1 ? "1 lead vai para a planilha" : `${total} leads vão para a planilha`;

    $("relFormatoBloco").hidden = vendedores.length < 2;

    const botao = $("relGerar");
    botao.disabled = total === 0;
    botao.querySelector("span").textContent = total ? `Gerar planilha (${total})` : "Gerar planilha";

    const todos = document.querySelectorAll("#relVendedores input");
    $("relTodos").textContent = vendedores.length === todos.length ? "Desmarcar todos" : "Marcar todos";
}

function renderizarVendedores(preSelecionados) {
    const lista = vendedoresComContagem();

    if (!lista.length) {
        $("relVendedores").innerHTML = `<p class="grafico-vazio">Nenhum lead cadastrado ainda.</p>`;
        return;
    }

    $("relVendedores").innerHTML = lista
        .map(
            ([chave, qtd]) => `
        <label class="rel-vendedor">
            <input type="checkbox" value="${escapeHtml(chave)}" ${!preSelecionados || preSelecionados.includes(chave) ? "checked" : ""}>
            <span class="rel-vendedor-nome ${chave === SEM_VENDEDOR ? "vazio" : ""}">${escapeHtml(nomeVendedor(chave))}</span>
            <span class="rel-vendedor-qtd mono">${qtd}</span>
        </label>`
        )
        .join("");
}

export function abrirRelatorio(vendedor) {
    renderizarVendedores(vendedor ? [vendedor] : null);
    document.querySelectorAll("#relTemperaturas .chip").forEach(c => c.classList.add("ativo"));
    $("relSituacao").value = "";
    $("relDe").value = "";
    $("relAte").value = "";
    $("relResumo").checked = true;
    document.querySelector('input[name="relFormato"][value="abas"]').checked = true;

    atualizarContador();
    abrirCamada("modalRelatorio");
}

export function fecharRelatorio() {
    fecharCamada("modalRelatorio");
}

// ---------- montagem do arquivo ----------

function nomeDaAba(nome, usados) {
    // Excel: até 31 caracteres e sem : \ / ? * [ ]
    const base =
        String(nome)
            .replace(/[:\\/?*[\]]/g, " ")
            .trim()
            .slice(0, 31) || "Leads";
    let final = base;
    for (let i = 2; usados.has(final.toLowerCase()); i++) {
        const sufixo = ` (${i})`;
        final = base.slice(0, 31 - sufixo.length) + sufixo;
    }
    usados.add(final.toLowerCase());
    return final;
}

function slug(texto) {
    return String(texto)
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
}

function cabecalho(titulo, subtitulo, colunas) {
    const largura = colunas.length;
    return [
        [{ value: titulo, fontWeight: "bold", fontSize: 14, columnSpan: largura }],
        [{ value: subtitulo, textColor: CINZA, columnSpan: largura }],
        [],
        colunas.map(c => ({
            value: c.titulo,
            fontWeight: "bold",
            textColor: "#FFFFFF",
            backgroundColor: VERDE,
            alignVertical: "center",
            height: 20
        }))
    ];
}

function abaDeLeads({ nomeAba, titulo, leads, incluirVendedor, usados }) {
    const colunas = COLUNAS.filter(c => incluirVendedor || !c.soNaAbaUnica);
    const geradoEm = new Date().toLocaleDateString("pt-BR");
    const subtitulo = `Gerado em ${geradoEm} · ${leads.length} lead${leads.length === 1 ? "" : "s"}`;

    const ordenados = [...leads].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return {
        sheet: nomeDaAba(nomeAba, usados),
        data: [
            ...cabecalho(titulo, subtitulo, colunas),
            ...ordenados.map(lead => colunas.map(c => c.valor(lead) ?? null))
        ],
        columns: colunas.map(c => ({ width: c.largura })),
        stickyRowsCount: 4,
        dateFormat: "dd/mm/yyyy"
    };
}

function abaDeResumo(grupos, nomeEmpresa, usados) {
    const titulos = ["Vendedor", "Leads", "Quentes", "Mornos", "Frios", "Ativos", "Inativos"];
    const conta = (leads, teste) => leads.filter(teste).length;

    const linhas = grupos.map(({ nome, leads }) => [
        nome,
        leads.length,
        conta(leads, l => l.estado !== "INATIVO" && l.status === "QUENTE"),
        conta(leads, l => l.estado !== "INATIVO" && l.status === "MORNO"),
        conta(leads, l => l.estado !== "INATIVO" && l.status === "FRIO"),
        conta(leads, l => l.estado !== "INATIVO"),
        conta(leads, l => l.estado === "INATIVO")
    ]);

    const totais = titulos.map((_, i) =>
        i === 0
            ? { value: "Total", fontWeight: "bold" }
            : { value: linhas.reduce((soma, linha) => soma + linha[i], 0), fontWeight: "bold" }
    );

    const colunas = titulos.map(titulo => ({ titulo }));
    const subtitulo = `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;

    return {
        sheet: nomeDaAba("Resumo", usados),
        data: [...cabecalho(`${nomeEmpresa} — Resumo por vendedor`, subtitulo, colunas), ...linhas, totais],
        columns: [{ width: 24 }, ...titulos.slice(1).map(() => ({ width: 10 }))],
        stickyRowsCount: 4
    };
}

async function gerarPlanilha() {
    const leads = leadsSelecionados();
    if (!leads.length) return;

    const botao = $("relGerar");
    const texto = botao.querySelector("span");
    const original = texto.textContent;
    botao.disabled = true;
    texto.textContent = "Gerando...";

    try {
        if (!window.writeXlsxFile) await carregarScript(SCRIPT_XLSX);

        const empresa = estado.sessaoAtual?.espacoAtual?.nome || "LeadDashboard";
        const vendedores = vendedoresMarcados();
        const umaAba = vendedores.length > 1 && $("relFormatoUnico").checked;
        const usados = new Set();

        const grupos = vendedores
            .map(chave => ({
                nome: nomeVendedor(chave),
                leads: leads.filter(l => chaveVendedor(l) === chave)
            }))
            .filter(g => g.leads.length);

        const abas = [];

        if (grupos.length > 1 && $("relResumo").checked) {
            abas.push(abaDeResumo(grupos, empresa, usados));
        }

        if (grupos.length === 1) {
            abas.push(
                abaDeLeads({
                    nomeAba: grupos[0].nome,
                    titulo: `${empresa} — Leads de ${grupos[0].nome}`,
                    leads: grupos[0].leads,
                    incluirVendedor: false,
                    usados
                })
            );
        } else if (umaAba) {
            abas.push(
                abaDeLeads({
                    nomeAba: "Leads",
                    titulo: `${empresa} — Leads de ${grupos.length} vendedores`,
                    leads,
                    incluirVendedor: true,
                    usados
                })
            );
        } else {
            grupos.forEach(grupo =>
                abas.push(
                    abaDeLeads({
                        nomeAba: grupo.nome,
                        titulo: `${empresa} — Leads de ${grupo.nome}`,
                        leads: grupo.leads,
                        incluirVendedor: false,
                        usados
                    })
                )
            );
        }

        const quem = grupos.length === 1 ? slug(grupos[0].nome) : `${grupos.length}-vendedores`;
        const nomeArquivo = `leads-${slug(empresa)}-${quem}-${new Date().toISOString().slice(0, 10)}.xlsx`;

        const blob = await window.writeXlsxFile(abas, { fontFamily: "Calibri", fontSize: 11 }).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        notificar(`Planilha gerada com ${leads.length} lead(s).`);
        fecharRelatorio();
    } catch (erro) {
        console.error(erro);
        notificar(erro.message || "Não foi possível gerar a planilha.", "erro");
    } finally {
        botao.disabled = false;
        texto.textContent = original;
    }
}

export function configurarRelatorio() {
    $("btnRelatorio").addEventListener("click", () => abrirRelatorio());
    $("btnRelatorioDash").addEventListener("click", () => abrirRelatorio());
    $("btnFecharRelatorio").addEventListener("click", fecharRelatorio);
    $("relCancelar").addEventListener("click", fecharRelatorio);
    $("modalRelatorio").addEventListener("mousedown", e => {
        if (e.target === $("modalRelatorio")) fecharRelatorio();
    });

    $("relTodos").addEventListener("click", () => {
        const caixas = [...document.querySelectorAll("#relVendedores input")];
        const marcar = caixas.some(c => !c.checked);
        caixas.forEach(c => (c.checked = marcar));
        atualizarContador();
    });

    $("relTemperaturas").addEventListener("click", e => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        chip.classList.toggle("ativo");
        atualizarContador();
    });

    ["relVendedores", "relSituacao", "relDe", "relAte"].forEach(id =>
        $(id).addEventListener("change", atualizarContador)
    );
    document
        .querySelectorAll('input[name="relFormato"]')
        .forEach(r => r.addEventListener("change", atualizarContador));

    $("relGerar").addEventListener("click", gerarPlanilha);
}
