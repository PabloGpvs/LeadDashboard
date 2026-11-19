// Estado compartilhado entre os módulos da tela.
export const estado = {
    todosOsLeads: [],
    leadsFiltrados: [],
    leadEditando: null,
    sessaoAtual: null,
    ordenacao: { campo: "createdAt", direcao: "desc" },
    paginaAtual: 1,
    itensPorPagina: 10,
    viewAtual: "dashboard"
};
