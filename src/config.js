const crypto = require("crypto");

if (!process.env.SESSION_SECRET) {
    console.warn(
        "SESSION_SECRET não definido no .env — as sessões vão cair sempre que o servidor reiniciar."
    );
}

module.exports = {
    PORTA: process.env.PORT || 3000,
    PRODUCAO: process.env.NODE_ENV === "production",
    SEGREDO_SESSAO: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
    CORS_ORIGEM: process.env.CORS_ORIGIN || false
};
