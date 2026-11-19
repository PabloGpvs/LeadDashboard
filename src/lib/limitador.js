// Limite de tentativas por chave (normalmente o IP), guardado em memória.
// Serve para dificultar força bruta no login, no cadastro e nos convites.

const JANELA_MS = 15 * 60 * 1000;

const MENSAGEM_BLOQUEIO = "Muitas tentativas. Aguarde 15 minutos e tente novamente.";

function criarLimitador(maximo = 5) {
    const tentativas = new Map();

    function expirou(registro) {
        return Date.now() - registro.inicio > JANELA_MS;
    }

    return {
        bloqueado(chave) {
            const registro = tentativas.get(chave);
            if (!registro) return false;
            if (expirou(registro)) {
                tentativas.delete(chave);
                return false;
            }
            return registro.qtd >= maximo;
        },

        falhou(chave) {
            const registro = tentativas.get(chave);
            if (!registro || expirou(registro)) {
                tentativas.set(chave, { qtd: 1, inicio: Date.now() });
            } else {
                registro.qtd++;
            }
        },

        limpar(chave) {
            tentativas.delete(chave);
        }
    };
}

module.exports = { criarLimitador, MENSAGEM_BLOQUEIO };
