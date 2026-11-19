import { $, escapeHtml } from "./utils.js";
import { icone } from "./icones.js";
import { api } from "./api.js";
import { notificar } from "./notificacoes.js";
import { abrirCamada, fecharCamada } from "./camadas.js";
import { carregarLeads } from "./dados.js";
import { mostrarView } from "./navegacao.js";
import {
    CAMPOS,
    lerArquivo,
    separarCabecalho,
    mapearColunas,
    montarLead,
    problemasDoLead,
    baixarModelo
} from "./planilha.js";

const MAXIMO_LINHAS = 2000;
const LINHAS_PREVIA = 8;

const importacao = {
    arquivo: null,
    abas: [],
    colunas: [],
    dados: [],
    mapa: {}
};

function mostrarEtapa(etapa) {
    ["Arquivo", "Mapa", "Resultado"].forEach(nome => {
        $(`impEtapa${nome}`).hidden = nome !== etapa;
    });
}

function mostrarErro(mensagem) {
    $("impErro").hidden = !mensagem;
    $("impErro").textContent = mensagem || "";
}

export function abrirImportacao() {
    $("inputPlanilha").value = "";
    mostrarErro(null);
    mostrarEtapa("Arquivo");
    abrirCamada("modalImportacao");
}

export function fecharImportacao() {
    fecharCamada("modalImportacao");
}

async function receberArquivo(arquivo) {
    if (!arquivo) return;

    const zona = $("zonaArquivo");
    zona.classList.add("lendo");

    try {
        importacao.arquivo = arquivo;
        importacao.abas = await lerArquivo(arquivo);
        escolherAba(0);
        mostrarEtapa("Mapa");
    } catch (erro) {
        console.error(erro);
        notificar(erro.message || "Não foi possível ler a planilha.", "erro");
    } finally {
        zona.classList.remove("lendo");
        $("inputPlanilha").value = "";
    }
}

function escolherAba(indice) {
    const aba = importacao.abas[indice];
    const { colunas, dados } = separarCabecalho(aba.linhas);

    importacao.colunas = colunas;
    importacao.dados = dados;
    importacao.mapa = mapearColunas(colunas);

    $("impNomeArquivo").textContent = importacao.arquivo.name;

    const seletor = $("impAba");
    seletor.innerHTML = importacao.abas
        .map((a, i) => `<option value="${i}">${escapeHtml(a.nome)}</option>`)
        .join("");
    seletor.value = indice;
    $("impBlocoAba").hidden = importacao.abas.length < 2;

    renderizarMapa();
    renderizarPrevia();
}

function exemploDaColuna(indice) {
    const linha = importacao.dados.find(d => {
        const valor = d.valores[indice];
        return valor !== null && valor !== undefined && String(valor).trim() !== "";
    });
    if (!linha) return "";
    const valor = linha.valores[indice];
    return valor instanceof Date ? valor.toLocaleDateString("pt-BR") : String(valor);
}

function renderizarMapa() {
    const opcoes = importacao.colunas.map((coluna, i) => {
        const exemplo = exemploDaColuna(i);
        const texto = exemplo ? `${coluna} — ex.: ${exemplo.slice(0, 28)}` : coluna;
        return `<option value="${i}">${escapeHtml(texto)}</option>`;
    });

    $("impMapa").innerHTML = CAMPOS.map(
        campo => `
        <label class="mapa-linha ${importacao.mapa[campo.chave] !== undefined ? "mapeado" : ""}">
            <span class="mapa-campo">${campo.rotulo}${campo.obrigatorio ? " <em>*</em>" : ""}</span>
            <span class="mapa-seta">${icone("chevR")}</span>
            <select data-campo="${campo.chave}">
                <option value="">— não importar —</option>
                ${opcoes.join("")}
            </select>
        </label>`
    ).join("");

    $("impMapa")
        .querySelectorAll("select")
        .forEach(select => {
            const indice = importacao.mapa[select.dataset.campo];
            select.value = indice === undefined ? "" : String(indice);
        });
}

function leadsDaPlanilha() {
    return importacao.dados.map(d => {
        const lead = montarLead(d.valores, importacao.mapa);
        return { numero: d.numero, lead, problemas: problemasDoLead(lead) };
    });
}

const ROTULO_TEMPERATURA = { QUENTE: "Quente", MORNO: "Morno", FRIO: "Frio" };

function valorPrevia(lead, campo) {
    const valor = campo === "status" ? ROTULO_TEMPERATURA[lead.status] || lead.status : lead[campo];
    return valor ? escapeHtml(valor) : '<span class="vazio">—</span>';
}

function renderizarPrevia() {
    const linhas = leadsDaPlanilha();
    const validas = linhas.filter(l => !l.problemas.length).length;
    const comProblema = linhas.length - validas;
    const faltaObrigatorio = CAMPOS.some(c => c.obrigatorio && importacao.mapa[c.chave] === undefined);

    $("impResumo").innerHTML = `
        <span class="pilula">${linhas.length} linha${linhas.length === 1 ? "" : "s"}</span>
        <span class="pilula pilula-ok">${validas} pronta${validas === 1 ? "" : "s"}</span>
        ${comProblema ? `<span class="pilula pilula-alerta">${comProblema} com problema</span>` : ""}`;

    const colunasPrevia = ["nome", "email", "telefone", "empresa", "status"];

    $("impPrevia").innerHTML = `
        <thead><tr>
            <th>Linha</th>
            ${colunasPrevia.map(c => `<th>${CAMPOS.find(x => x.chave === c).rotulo}</th>`).join("")}
            <th></th>
        </tr></thead>
        <tbody>
            ${linhas
                .slice(0, LINHAS_PREVIA)
                .map(
                    ({ numero, lead, problemas }) => `
                <tr class="${problemas.length ? "previa-erro" : ""}">
                    <td class="mono texto-3">${numero}</td>
                    ${colunasPrevia.map(c => `<td>${valorPrevia(lead, c)}</td>`).join("")}
                    <td>${
                        problemas.length
                            ? `<span class="tag tag-quente" title="${escapeHtml(problemas.join(", "))}">${escapeHtml(problemas[0])}</span>`
                            : `<span class="tag tag-ativo"><i class="ponto"></i>ok</span>`
                    }</td>
                </tr>`
                )
                .join("")}
        </tbody>`;

    $("impMaisLinhas").textContent =
        linhas.length > LINHAS_PREVIA ? `Mostrando ${LINHAS_PREVIA} de ${linhas.length} linhas.` : "";

    let erro = null;
    if (!linhas.length) erro = "Não encontrei linhas com dados nessa planilha.";
    else if (faltaObrigatorio) erro = "Escolha quais colunas têm o Nome e o E-mail do lead.";
    else if (linhas.length > MAXIMO_LINHAS)
        erro = `A planilha tem ${linhas.length} linhas. Importe no máximo ${MAXIMO_LINHAS} por vez.`;
    mostrarErro(erro);

    const botao = $("impConfirmar");
    botao.disabled = Boolean(erro) || validas === 0;
    botao.querySelector("span").textContent = `Importar ${validas} lead${validas === 1 ? "" : "s"}`;
}

async function confirmarImportacao() {
    const linhas = leadsDaPlanilha();
    const botao = $("impConfirmar");
    const texto = botao.querySelector("span");
    const original = texto.textContent;

    botao.disabled = true;
    texto.textContent = "Importando...";

    try {
        const resultado = await api("/leads/importar", {
            method: "POST",
            body: JSON.stringify({
                ignorarDuplicados: $("impIgnorarDuplicados").checked,
                leads: linhas.map(l => ({ linha: l.numero, ...l.lead }))
            })
        });

        mostrarResultado(resultado);
        await carregarLeads();
    } catch (erro) {
        mostrarErro(erro.message);
        botao.disabled = false;
        texto.textContent = original;
    }
}

function mostrarResultado({ importados, duplicados, erros }) {
    const listaErros = erros
        .slice(0, 12)
        .map(e => `<li><span class="mono">linha ${e.linha}</span>${escapeHtml(e.motivos.join(", "))}</li>`)
        .join("");

    $("impResultado").innerHTML = `
        <div class="resultado-icone">${icone(importados ? "check" : "alert")}</div>
        <strong class="resultado-titulo">${
            importados
                ? `${importados} lead${importados === 1 ? "" : "s"} importado${importados === 1 ? "" : "s"}`
                : "Nenhum lead importado"
        }</strong>
        <div class="resultado-numeros">
            ${duplicados ? `<span class="pilula">${duplicados} já existia${duplicados === 1 ? "" : "m"} (pulado${duplicados === 1 ? "" : "s"})</span>` : ""}
            ${erros.length ? `<span class="pilula pilula-alerta">${erros.length} com erro</span>` : ""}
        </div>
        ${
            erros.length
                ? `<ul class="resultado-erros">${listaErros}</ul>${
                      erros.length > 12
                          ? `<p class="bloco-texto">e mais ${erros.length - 12} linha(s) com erro.</p>`
                          : ""
                  }`
                : ""
        }`;

    mostrarEtapa("Resultado");
    if (importados) notificar(`${importados} lead(s) importado(s).`);
}

export function configurarImportacao() {
    const zona = $("zonaArquivo");
    const input = $("inputPlanilha");

    input.addEventListener("change", () => receberArquivo(input.files[0]));

    ["dragenter", "dragover"].forEach(tipo =>
        zona.addEventListener(tipo, e => {
            e.preventDefault();
            zona.classList.add("arrastando");
        })
    );
    ["dragleave", "drop"].forEach(tipo =>
        zona.addEventListener(tipo, e => {
            e.preventDefault();
            zona.classList.remove("arrastando");
        })
    );
    zona.addEventListener("drop", e => receberArquivo(e.dataTransfer.files[0]));

    $("btnImportar").addEventListener("click", abrirImportacao);
    $("btnFecharImportacao").addEventListener("click", fecharImportacao);
    $("modalImportacao").addEventListener("mousedown", e => {
        if (e.target === $("modalImportacao")) fecharImportacao();
    });
    $("btnModelo").addEventListener("click", baixarModelo);
    $("impAba").addEventListener("change", e => escolherAba(Number(e.target.value)));
    $("impVoltar").addEventListener("click", () => mostrarEtapa("Arquivo"));
    $("impConfirmar").addEventListener("click", confirmarImportacao);
    $("impConcluir").addEventListener("click", () => {
        fecharImportacao();
        mostrarView("leads");
    });

    $("impMapa").addEventListener("change", e => {
        const select = e.target.closest("select[data-campo]");
        if (!select) return;

        const campo = select.dataset.campo;
        if (select.value === "") {
            delete importacao.mapa[campo];
        } else {
            const indice = Number(select.value);
            // cada coluna só pode alimentar um campo
            for (const [outro, i] of Object.entries(importacao.mapa)) {
                if (i === indice && outro !== campo) delete importacao.mapa[outro];
            }
            importacao.mapa[campo] = indice;
        }

        renderizarMapa();
        renderizarPrevia();
    });
}
