const crypto = require("crypto");

// Hash no formato "scrypt$<sal>$<hash>", usando o scrypt nativo do Node.

function gerarHashSenha(senha) {
    return new Promise((resolve, reject) => {
        const sal = crypto.randomBytes(16).toString("hex");
        crypto.scrypt(senha, sal, 64, (erro, chave) => {
            if (erro) return reject(erro);
            resolve(`scrypt$${sal}$${chave.toString("hex")}`);
        });
    });
}

function verificarSenha(senha, hashSalvo) {
    return new Promise(resolve => {
        const [algoritmo, sal, hash] = String(hashSalvo || "").split("$");
        if (algoritmo !== "scrypt" || !sal || !hash) return resolve(false);

        crypto.scrypt(senha, sal, 64, (erro, chave) => {
            if (erro) return resolve(false);
            const esperado = Buffer.from(hash, "hex");
            resolve(esperado.length === chave.length && crypto.timingSafeEqual(esperado, chave));
        });
    });
}

module.exports = { gerarHashSenha, verificarSenha };
