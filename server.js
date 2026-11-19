require("dotenv").config();

const app = require("./src/app");
const prisma = require("./src/lib/prisma");
const { PORTA } = require("./src/config");

const servidor = app.listen(PORTA, () => {
    console.log(`LeadDashboard rodando em http://localhost:${PORTA}`);
});

async function encerrar() {
    servidor.close();
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
}

process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
