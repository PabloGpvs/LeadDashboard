import { $ } from "./utils.js";
import { icone } from "./icones.js";

export function notificar(mensagem, tipo = "sucesso") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    const ic = tipo === "erro" ? "alert" : tipo === "aviso" ? "alert" : "check";
    toast.innerHTML = `${icone(ic)}<span></span>`;
    toast.querySelector("span").textContent = mensagem;
    $("toasts").appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("visivel"));

    setTimeout(
        () => {
            toast.classList.remove("visivel");
            setTimeout(() => toast.remove(), 300);
        },
        tipo === "erro" ? 5000 : 3000
    );
}
