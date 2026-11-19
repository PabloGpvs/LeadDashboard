export const $ = id => document.getElementById(id);

export function escapeHtml(valor) {
    if (valor === null || valor === undefined) return "";
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function ouTraco(valor) {
    return valor ? escapeHtml(valor) : `<span class="vazio">—</span>`;
}

export function formatarData(valor, utc) {
    if (!valor) return "—";
    const data = new Date(valor);
    if (isNaN(data.getTime())) return "—";
    return data.toLocaleDateString("pt-BR", utc ? { timeZone: "UTC" } : undefined);
}

export function formatarDataHora(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    if (isNaN(data.getTime())) return "—";
    return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function paraInputData(valor) {
    if (!valor) return "";
    const data = new Date(valor);
    return isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
}

export function diasDesde(valor) {
    if (!valor) return null;
    return Math.floor((Date.now() - new Date(valor).getTime()) / 86400000);
}

export function textoDias(dias) {
    if (dias === null) return "nunca";
    if (dias <= 0) return "hoje";
    if (dias === 1) return "ontem";
    return `há ${dias} dias`;
}

export function iniciais(nome) {
    const partes = String(nome || "?")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!partes.length) return "?";
    const primeira = partes[0][0] || "";
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
    return (primeira + ultima).toUpperCase();
}

// Cor estável por nome (para avatares)
export function matizDoNome(nome) {
    let hash = 0;
    for (const ch of String(nome || "")) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const matizes = [142, 158, 172, 190, 200, 262, 280, 330, 38, 120];
    return matizes[hash % matizes.length];
}

export function avatarHtml(nome, classe = "") {
    return `<span class="avatar ${classe}" style="--h:${matizDoNome(nome)}">${escapeHtml(iniciais(nome))}</span>`;
}

export const TEMPERATURAS = {
    QUENTE: { rotulo: "Quente", classe: "tag-quente" },
    MORNO: { rotulo: "Morno", classe: "tag-morno" },
    FRIO: { rotulo: "Frio", classe: "tag-frio" }
};

export function tagTemperatura(lead) {
    if (lead.estado === "INATIVO") return `<span class="tag tag-neutra">—</span>`;
    const t = TEMPERATURAS[lead.status];
    if (!t) return `<span class="tag tag-neutra">${escapeHtml(lead.status || "—")}</span>`;
    return `<span class="tag ${t.classe}"><i class="ponto"></i>${t.rotulo}</span>`;
}

export function tagEstado(estado) {
    return estado === "INATIVO"
        ? `<span class="tag tag-neutra">Inativo</span>`
        : `<span class="tag tag-ativo"><i class="ponto"></i>Ativo</span>`;
}

export function animarNumero(el, destino) {
    const inicio = Number(el.dataset.valor || 0);
    el.dataset.valor = destino;
    if (inicio === destino || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = destino;
        return;
    }
    const duracao = 650;
    const t0 = performance.now();
    function passo(agora) {
        const p = Math.min(1, (agora - t0) / duracao);
        const suave = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(inicio + (destino - inicio) * suave);
        if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
}
