const { carregarSessao } = require("../lib/sessao");

// Bloqueia quem não está logado e deixa disponíveis, para as rotas seguintes:
// req.usuario, req.espaco, req.espacoId e req.papel (DONO ou MEMBRO).
async function exigirLogin(req, res, next) {
    let sessao;

    try {
        sessao = await carregarSessao(req);
    } catch (erro) {
        console.error("Erro ao validar sessão:", erro.message);
        return res.status(503).json({ error: "Banco de dados indisponível" });
    }

    if (sessao) {
        req.usuario = sessao.usuario;
        req.espaco = sessao.membro.espaco;
        req.espacoId = sessao.membro.espacoId;
        req.papel = sessao.membro.papel;
        return next();
    }

    const pediuPagina = req.method === "GET" && (req.headers.accept || "").includes("text/html");
    if (pediuPagina) return res.redirect("/login");

    res.status(401).json({ error: "Não autenticado" });
}

function apenasDono(req, res, next) {
    if (req.papel !== "DONO") {
        return res.status(403).json({ error: "Só o dono da empresa pode fazer isso" });
    }
    next();
}

module.exports = { exigirLogin, apenasDono };
