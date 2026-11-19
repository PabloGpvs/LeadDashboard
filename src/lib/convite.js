const crypto = require("crypto");

// Tokens no formato XXXX-XXXX. O alfabeto não tem 0/O nem 1/I para evitar confusão.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function gerarCodigoConvite() {
    const bytes = crypto.randomBytes(8);
    let codigo = "";
    for (let i = 0; i < 8; i++) {
        codigo += ALFABETO[bytes[i] % ALFABETO.length];
        if (i === 3) codigo += "-";
    }
    return codigo;
}

// Aceita o token digitado de qualquer jeito ("k7qm2xpa", "K7QM 2XPA"...)
function normalizarCodigo(codigo) {
    const limpo = String(codigo || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    return limpo.length === 8 ? `${limpo.slice(0, 4)}-${limpo.slice(4)}` : limpo;
}

module.exports = { gerarCodigoConvite, normalizarCodigo };
