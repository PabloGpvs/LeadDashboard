const path = require("path");
const express = require("express");
const cors = require("cors");

const prisma = require("./lib/prisma");
const { CORS_ORIGEM } = require("./config");
const { exigirLogin } = require("./middlewares/autenticacao");
const { rotaNaoEncontrada, tratarErros } = require("./middlewares/erros");

const authRoutes = require("./routes/auth.routes");
const leadRoutes = require("./routes/lead.routes");
const espacoRoutes = require("./routes/espaco.routes");

const PASTA_PUBLICA = path.join(__dirname, "..", "public");
const pagina = nome => (req, res) => res.sendFile(path.join(PASTA_PUBLICA, nome));

const app = express();

app.use(cors({ origin: CORS_ORIGEM, credentials: true }));
// limite maior por causa da importação de planilhas
app.use(express.json({ limit: "2mb" }));

// Arquivos estáticos (CSS, JS) são públicos — os dados ficam protegidos na API
app.use(express.static(PASTA_PUBLICA, { index: false }));

app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok", banco: "ok" });
    } catch (erro) {
        console.error("Health check falhou:", erro.message);
        res.status(503).json({ status: "erro", banco: "indisponível" });
    }
});

app.get("/login", pagina("login.html"));
app.get("/cadastro", pagina("cadastro.html"));
app.use("/auth", authRoutes);

app.use(exigirLogin);

app.get("/", pagina("index.html"));
app.use("/leads", leadRoutes);
app.use("/espacos", espacoRoutes);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

module.exports = app;
