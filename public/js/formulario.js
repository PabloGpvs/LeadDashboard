import { $, paraInputData } from "./utils.js";
import { estado } from "./estado.js";
import { api } from "./api.js";
import { notificar } from "./notificacoes.js";
import { carregarLeads } from "./dados.js";
import { renderizarTabela } from "./leads.js";
import { fecharModal } from "./detalhes.js";
import { fecharEquipe } from "./equipe.js";

export function definirStatusForm(valor) {
    $("status").value = valor;
    document.querySelectorAll("#chipsStatus .chip").forEach(chip => {
        const ativo = chip.dataset.valor === valor;
        chip.classList.toggle("ativo", ativo);
        chip.setAttribute("aria-checked", String(ativo));
    });
}

export function abrirDrawer(lead = null) {
    fecharModal();
    fecharEquipe();
    estado.leadEditando = lead ? lead.id : null;
    mostrarErroFormulario(null);
    $("formLead").reset();

    if (lead) {
        $("eyebrowFormulario").textContent = `// editando · #${String(lead.id).padStart(4, "0")}`;
        $("tituloFormulario").textContent = lead.nome;
        $("btnSalvar").querySelector("span").textContent = "Salvar alterações";

        $("nome").value = lead.nome || "";
        $("email").value = lead.email || "";
        $("telefone").value = lead.telefone || "";
        $("empresa").value = lead.empresa || "";
        $("vendedor").value = lead.vendedor || "";
        $("cidade").value = lead.cidade || "";
        $("estado").value = lead.estado || "ATIVO";
        $("origem").value = lead.origem || "";
        $("feedback").value = lead.feedback || "";
        $("observacao").value = lead.observacao || "";
        $("dataUltimoContato").value = paraInputData(lead.dataUltimoContato);
        definirStatusForm(lead.status || "MORNO");
    } else {
        $("eyebrowFormulario").textContent = "// novo registro";
        $("tituloFormulario").textContent = "Novo lead";
        $("btnSalvar").querySelector("span").textContent = "Cadastrar lead";
        definirStatusForm("MORNO");
    }

    $("drawerFundo").hidden = false;
    requestAnimationFrame(() => $("drawerFundo").classList.add("aberta"));
    setTimeout(() => $("nome").focus(), 120);
    renderizarTabela();
}

export function fecharDrawer() {
    if ($("drawerFundo").hidden) return;
    $("drawerFundo").classList.remove("aberta");
    setTimeout(() => {
        $("drawerFundo").hidden = true;
    }, 250);
    estado.leadEditando = null;
    renderizarTabela();
}

function lerFormulario() {
    return {
        nome: $("nome").value.trim(),
        email: $("email").value.trim(),
        telefone: $("telefone").value.trim(),
        empresa: $("empresa").value.trim(),
        vendedor: $("vendedor").value.trim(),
        cidade: $("cidade").value.trim(),
        status: $("status").value,
        estado: $("estado").value,
        dataUltimoContato: $("dataUltimoContato").value,
        origem: $("origem").value,
        feedback: $("feedback").value.trim(),
        observacao: $("observacao").value.trim()
    };
}

function validarFormulario(d) {
    const erros = [];
    if (!d.nome) erros.push("Informe o nome");
    if (!d.email) erros.push("Informe o e-mail");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) erros.push("E-mail inválido");
    if (d.telefone && !/^[\d\s()+-]{8,}$/.test(d.telefone)) erros.push("Telefone inválido");
    if (d.dataUltimoContato && d.dataUltimoContato > new Date().toISOString().slice(0, 10)) {
        erros.push("A data do último contato não pode estar no futuro");
    }
    return erros;
}

function mostrarErroFormulario(mensagem) {
    $("formErro").hidden = !mensagem;
    $("formErro").textContent = mensagem || "";
}

export async function salvarLead(event) {
    event.preventDefault();

    const dados = lerFormulario();
    const erros = validarFormulario(dados);
    if (erros.length) {
        mostrarErroFormulario(erros.join(". ") + ".");
        return;
    }
    mostrarErroFormulario(null);

    const botao = $("btnSalvar");
    const texto = botao.querySelector("span");
    const original = texto.textContent;
    botao.disabled = true;
    texto.textContent = "Salvando...";

    try {
        if (estado.leadEditando) {
            await api(`/leads/${estado.leadEditando}`, { method: "PUT", body: JSON.stringify(dados) });
            notificar("Lead atualizado.");
        } else {
            await api("/leads", { method: "POST", body: JSON.stringify(dados) });
            notificar("Lead cadastrado.");
        }
        fecharDrawer();
        await carregarLeads();
    } catch (erro) {
        mostrarErroFormulario(erro.message);
        notificar(`Erro ao salvar: ${erro.message}`, "erro");
    } finally {
        botao.disabled = false;
        texto.textContent = original;
    }
}
