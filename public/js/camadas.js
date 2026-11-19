import { $ } from "./utils.js";

export function abrirCamada(id) {
    const el = $(id);
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("aberta"));
}

export function fecharCamada(id) {
    const el = $(id);
    if (el.hidden) return;
    el.classList.remove("aberta");
    setTimeout(() => {
        el.hidden = true;
    }, 200);
}
