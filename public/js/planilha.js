// Leitura de planilhas (.xlsx e .csv) e conversão das linhas em leads.

const SCRIPT_XLSX = "/vendor/read-excel-file.min.js";

export const CAMPOS = [
    { chave: "nome", rotulo: "Nome", obrigatorio: true },
    { chave: "email", rotulo: "E-mail", obrigatorio: true },
    { chave: "telefone", rotulo: "Telefone" },
    { chave: "empresa", rotulo: "Empresa" },
    { chave: "cidade", rotulo: "Cidade" },
    { chave: "vendedor", rotulo: "Vendedor" },
    { chave: "origem", rotulo: "Origem" },
    { chave: "status", rotulo: "Temperatura" },
    { chave: "estado", rotulo: "Ativo / inativo" },
    { chave: "dataUltimoContato", rotulo: "Último contato" },
    { chave: "feedback", rotulo: "Feedback" },
    { chave: "observacao", rotulo: "Observações" }
];

// Nomes de coluna que costumam aparecer em planilhas de clientes
const SINONIMOS = {
    nome: ["nome", "nome completo", "cliente", "contato", "lead", "name"],
    email: ["email", "e mail", "mail", "endereco de email"],
    telefone: ["telefone", "celular", "fone", "tel", "whatsapp", "whats", "phone", "contato telefonico"],
    empresa: ["empresa", "companhia", "company", "organizacao", "razao social"],
    cidade: ["cidade", "municipio", "city"],
    vendedor: ["vendedor", "responsavel", "consultor", "atendente", "owner", "vendedora"],
    origem: ["origem", "canal", "fonte", "source", "como conheceu"],
    status: ["temperatura", "status", "qualificacao"],
    estado: ["situacao", "ativo", "ativo inativo"],
    dataUltimoContato: [
        "ultimo contato",
        "data do ultimo contato",
        "data ultimo contato",
        "data de contato",
        "data contato"
    ],
    feedback: ["feedback", "retorno"],
    observacao: ["observacao", "observacoes", "obs", "notas", "anotacoes", "comentarios"]
};

const ORIGENS = ["Site", "Instagram", "Facebook", "WhatsApp", "Indicação", "Google", "Outro"];

const TEMPERATURAS = {
    QUENTE: ["quente", "hot", "alta"],
    MORNO: ["morno", "morna", "warm", "media"],
    FRIO: ["frio", "fria", "cold", "baixa"]
};

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function simplificar(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function carregarScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Não foi possível carregar o leitor de Excel"));
        document.head.appendChild(script);
    });
}

async function lerXlsx(arquivo) {
    if (!window.readXlsxFile) await carregarScript(SCRIPT_XLSX);
    const abas = await window.readXlsxFile(arquivo);
    return abas.map(aba => ({ nome: aba.sheet, linhas: aba.data }));
}

// O Excel brasileiro costuma salvar CSV em Windows-1252, não em UTF-8
async function lerTexto(arquivo) {
    const bytes = await arquivo.arrayBuffer();
    const utf8 = new TextDecoder("utf-8").decode(bytes);
    const texto = utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
    return texto.replace(/^﻿/, "");
}

function detectarSeparador(texto) {
    const primeiraLinha = texto.split(/\r?\n/, 1)[0];
    const contar = c => primeiraLinha.split(c).length - 1;
    return [";", ",", "\t"].sort((a, b) => contar(b) - contar(a))[0];
}

export function lerCsv(texto) {
    const separador = detectarSeparador(texto);
    const linhas = [];
    let linha = [];
    let celula = "";
    let entreAspas = false;

    for (let i = 0; i < texto.length; i++) {
        const c = texto[i];

        if (entreAspas) {
            if (c === '"' && texto[i + 1] === '"') {
                celula += '"';
                i++;
            } else if (c === '"') {
                entreAspas = false;
            } else {
                celula += c;
            }
        } else if (c === '"') {
            entreAspas = true;
        } else if (c === separador) {
            linha.push(celula);
            celula = "";
        } else if (c === "\n" || c === "\r") {
            if (c === "\r" && texto[i + 1] === "\n") i++;
            linha.push(celula);
            linhas.push(linha);
            linha = [];
            celula = "";
        } else {
            celula += c;
        }
    }

    if (celula !== "" || linha.length) {
        linha.push(celula);
        linhas.push(linha);
    }

    return linhas;
}

export async function lerArquivo(arquivo) {
    const nome = arquivo.name.toLowerCase();

    if (nome.endsWith(".xlsx")) return lerXlsx(arquivo);
    if (nome.endsWith(".csv") || nome.endsWith(".txt")) {
        return [{ nome: "CSV", linhas: lerCsv(await lerTexto(arquivo)) }];
    }
    if (nome.endsWith(".xls")) {
        throw new Error("Arquivos .xls (Excel antigo) não são suportados. Salve como .xlsx ou .csv.");
    }
    throw new Error("Formato não suportado. Use uma planilha .xlsx ou .csv.");
}

const vazia = linha => !linha || linha.every(c => c === null || c === undefined || String(c).trim() === "");

// A primeira linha com conteúdo é o cabeçalho; o resto são os dados
export function separarCabecalho(linhas) {
    const inicio = linhas.findIndex(l => !vazia(l));
    if (inicio === -1) return { colunas: [], dados: [] };

    const colunas = linhas[inicio].map((c, i) => String(c ?? "").trim() || `Coluna ${i + 1}`);
    const dados = [];

    linhas.slice(inicio + 1).forEach((valores, i) => {
        if (!vazia(valores)) dados.push({ numero: inicio + i + 2, valores });
    });

    return { colunas, dados };
}

export function mapearColunas(colunas) {
    const nomes = colunas.map(simplificar);
    const mapa = {};
    const usadas = new Set();

    for (const campo of CAMPOS) {
        const opcoes = SINONIMOS[campo.chave];
        let indice = nomes.findIndex((n, i) => !usadas.has(i) && opcoes.includes(n));
        if (indice === -1) {
            indice = nomes.findIndex(
                (n, i) => !usadas.has(i) && opcoes.some(o => o.length > 3 && n.includes(o))
            );
        }
        if (indice !== -1) {
            mapa[campo.chave] = indice;
            usadas.add(indice);
        }
    }

    return mapa;
}

function paraTexto(valor) {
    if (valor === null || valor === undefined) return "";
    if (valor instanceof Date) return valor.toISOString().slice(0, 10);
    return String(valor).trim();
}

function normalizarData(valor) {
    if (valor instanceof Date && !isNaN(valor)) return valor.toISOString().slice(0, 10);

    const texto = paraTexto(valor);
    if (!texto) return "";

    const br = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (br) {
        const [, dia, mes, ano] = br;
        const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
        return `${anoCompleto}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    }

    return texto.slice(0, 10);
}

function normalizarTemperatura(valor) {
    const texto = simplificar(valor);
    if (!texto) return "MORNO";
    for (const [status, nomes] of Object.entries(TEMPERATURAS)) {
        if (nomes.includes(texto) || texto === status.toLowerCase()) return status;
    }
    return paraTexto(valor).toUpperCase();
}

function normalizarEstado(valor) {
    const texto = simplificar(valor);
    if (!texto) return "ATIVO";
    if (["inativo", "inativa", "nao", "n", "false", "0", "perdido"].includes(texto)) return "INATIVO";
    if (["ativo", "ativa", "sim", "s", "true", "1"].includes(texto)) return "ATIVO";
    return paraTexto(valor).toUpperCase();
}

function normalizarOrigem(valor) {
    const texto = simplificar(valor);
    if (!texto) return "";
    return ORIGENS.find(o => simplificar(o) === texto) || "Outro";
}

const NORMALIZADORES = {
    status: normalizarTemperatura,
    estado: normalizarEstado,
    origem: normalizarOrigem,
    dataUltimoContato: normalizarData
};

export function montarLead(valores, mapa) {
    const lead = {};
    for (const [campo, indice] of Object.entries(mapa)) {
        const bruto = valores[indice];
        lead[campo] = NORMALIZADORES[campo] ? NORMALIZADORES[campo](bruto) : paraTexto(bruto);
    }
    return lead;
}

// Checagem rápida para a prévia; a validação completa acontece no servidor
export function problemasDoLead(lead) {
    const problemas = [];
    if (!lead.nome) problemas.push("sem nome");
    if (!lead.email) problemas.push("sem e-mail");
    else if (!REGEX_EMAIL.test(lead.email)) problemas.push("e-mail inválido");
    if (lead.status && !["QUENTE", "MORNO", "FRIO"].includes(lead.status))
        problemas.push("temperatura desconhecida");
    if (lead.estado && !["ATIVO", "INATIVO"].includes(lead.estado))
        problemas.push("ativo/inativo desconhecido");
    return problemas;
}

export function baixarModelo() {
    const cabecalho = CAMPOS.map(c => c.rotulo).join(";");
    const exemplo = [
        "Maria Silva",
        "maria@empresa.com",
        "(11) 99999-0000",
        "Empresa Exemplo",
        "São Paulo",
        "Ana",
        "Instagram",
        "Quente",
        "Ativo",
        "15/11/2026",
        "Pediu proposta",
        ""
    ].join(";");

    const blob = new Blob(["﻿" + cabecalho + "\r\n" + exemplo + "\r\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-importacao-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
}
