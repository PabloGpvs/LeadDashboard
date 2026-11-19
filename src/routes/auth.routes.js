const { Router } = require("express");
const rotaAsync = require("../utils/rotaAsync");
const auth = require("../controllers/authController");

const router = Router();

router.post("/registrar", rotaAsync(auth.registrar));
router.post("/login", rotaAsync(auth.login));
router.post("/logout", auth.logout);
router.get("/me", rotaAsync(auth.eu));

module.exports = router;
