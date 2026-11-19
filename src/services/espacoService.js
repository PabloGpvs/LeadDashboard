const { gerarCodigoConvite } = require("../lib/convite");

const TENTATIVAS = 5;

function codigoRepetido(erro) {
    return erro && erro.code === "P2002";
}

// Cria um espaço já com o dono como membro. Se o token sorteado já existir
// (muito improvável), sorteia outro.
async function criarEspacoComDono(db, { usuarioId, nome, tipo = "USUARIO" }) {
    for (let i = 0; i < TENTATIVAS; i++) {
        try {
            return await db.espaco.create({
                data: {
                    nome,
                    tipo,
                    codigoConvite: gerarCodigoConvite(),
                    membros: { create: { usuarioId, papel: "DONO" } }
                }
            });
        } catch (erro) {
            if (!codigoRepetido(erro)) throw erro;
        }
    }
    throw new Error("Não foi possível gerar um token de convite único");
}

async function gerarNovoCodigo(db, espacoId) {
    for (let i = 0; i < TENTATIVAS; i++) {
        try {
            const espaco = await db.espaco.update({
                where: { id: espacoId },
                data: { codigoConvite: gerarCodigoConvite() }
            });
            return espaco.codigoConvite;
        } catch (erro) {
            if (!codigoRepetido(erro)) throw erro;
        }
    }
    throw new Error("Não foi possível gerar um token de convite único");
}

module.exports = { criarEspacoComDono, gerarNovoCodigo };
