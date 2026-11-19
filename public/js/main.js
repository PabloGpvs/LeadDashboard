import { hidratarIcones } from "./icones.js";
import { carregarUsuario, verificarSistema } from "./sessao.js";
import { mostrarView } from "./navegacao.js";
import { carregarLeads } from "./dados.js";
import { configurarEventos } from "./eventos.js";
import { configurarImportacao } from "./importacao.js";
import { configurarRelatorio } from "./relatorio.js";

hidratarIcones();
configurarEventos();
configurarImportacao();
configurarRelatorio();
mostrarView(location.hash.slice(1) || "dashboard");
verificarSistema();
setInterval(verificarSistema, 30000);
carregarUsuario();
carregarLeads();
