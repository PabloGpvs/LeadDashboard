const { Router } = require("express");
const rotaAsync = require("../utils/rotaAsync");
const { apenasDono } = require("../middlewares/autenticacao");
const espacos = require("../controllers/espacoController");

const router = Router();

router.post("/entrar", rotaAsync(espacos.entrar));
router.post("/trocar", rotaAsync(espacos.trocar));
router.post("/sair", rotaAsync(espacos.sair));
router.get("/membros", rotaAsync(espacos.listarMembros));

router.put("/nome", apenasDono, rotaAsync(espacos.renomear));
router.post("/codigo", apenasDono, rotaAsync(espacos.novoCodigo));
router.delete("/membros/:usuarioId", apenasDono, rotaAsync(espacos.removerMembro));

module.exports = router;
