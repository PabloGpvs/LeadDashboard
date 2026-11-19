const { Router } = require("express");
const rotaAsync = require("../utils/rotaAsync");
const leads = require("../controllers/leadController");

const router = Router();

router.get("/", rotaAsync(leads.listar));
router.get("/:id", rotaAsync(leads.buscar));
router.post("/", rotaAsync(leads.criar));
router.put("/:id", rotaAsync(leads.atualizar));
router.delete("/:id", rotaAsync(leads.excluir));

module.exports = router;
