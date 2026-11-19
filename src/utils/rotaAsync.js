// Repassa para o middleware de erros qualquer exceção de um handler async,
// evitando repetir try/catch em todas as rotas.
const rotaAsync = handler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

module.exports = rotaAsync;
