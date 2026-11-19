# LeadDashboard

Um mini-CRM para acompanhar leads: quem são, de onde vieram, quem está cuidando e se estão
quentes, mornos ou frios. Cada conta tem o próprio espaço de leads e pode convidar outras
pessoas com um token.

Feito com Node.js, Express, Prisma e PostgreSQL. O front é HTML, CSS e JavaScript puro
(módulos ES), sem framework.

## O que dá pra fazer

- Criar conta como **usuário** (uso pessoal) ou **empresa** (para a equipe)
- Cadastrar, editar e excluir leads
- Ver a **visão geral**: totais, leads novos por semana, temperatura, origem, vendedores
  e quem está sem contato há muito tempo
- Filtrar, buscar, ordenar e exportar a lista para CSV
- Importar leads de uma planilha Excel (.xlsx) ou CSV — dá pra baixar uma planilha modelo,
  e as colunas são reconhecidas automaticamente (dá pra ajustar antes de importar)
- Arrastar leads entre Quente, Morno e Frio no **pipeline**
- Compartilhar o espaço: cada espaço tem um token de convite (ex.: `K7QM-2XPA`); quem
  cola o token em *Equipe e convite* passa a ver os leads dele

Atalhos: `/` busca, `N` novo lead, `Esc` fecha o que estiver aberto.

## Rodando localmente

Precisa de Node.js 18+ e um PostgreSQL.

```bash
npm install
cp .env.example .env      # coloque a DATABASE_URL e um SESSION_SECRET
npm run db:push           # cria/atualiza as tabelas
npm run dev
```

Depois é só abrir http://localhost:3000 e criar uma conta. No Windows, o `iniciar.bat` faz
tudo isso de uma vez (e abre o VS Code e o navegador).

> A primeira conta criada fica com os leads que já existiam no banco antes de existir
> separação por conta.

### Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Conexão com o PostgreSQL |
| `SESSION_SECRET` | Assina o cookie de sessão. Sem ele, todo mundo é deslogado quando o servidor reinicia |
| `PORT` | Porta do servidor (padrão 3000) |
| `NODE_ENV` | Em `production` o cookie passa a exigir HTTPS |

## Estrutura

```
server.js                 sobe o servidor
src/
  app.js                  configuração do Express e das rotas
  config.js               variáveis de ambiente
  routes/                 só declara os caminhos da API
  controllers/            o que cada rota faz
  services/               regras usadas por mais de um controller
  validacoes/             validação dos dados de lead e de cadastro
  middlewares/            login obrigatório e tratamento de erros
  lib/                    prisma, sessão, senha, token de convite, limite de tentativas
  utils/
prisma/schema.prisma      Lead, Usuario, Espaco e Membro
public/
  index.html              dashboard
  login.html, cadastro.html
  css/                    um arquivo por área da tela
  js/                     módulos do front (main.js é o ponto de entrada)
  vendor/                 read-excel-file, para ler planilhas .xlsx no navegador
```

## API

Tudo em `/leads` e `/espacos` exige login e só enxerga os dados do espaço atual.

| Método | Rota | |
|---|---|---|
| `POST` | `/auth/registrar` | `{ nome, email, senha, tipo, nomeEspaco? }` |
| `POST` | `/auth/login` | `{ email, senha }` |
| `POST` | `/auth/logout` | |
| `GET` | `/auth/me` | usuário, espaço atual e lista de espaços |
| `GET` | `/leads` | lista os leads |
| `GET` | `/leads/:id` | |
| `POST` | `/leads` | `nome` e `email` são obrigatórios |
| `PUT` | `/leads/:id` | atualiza só os campos enviados |
| `DELETE` | `/leads/:id` | |
| `POST` | `/leads/importar` | `{ leads: [...], ignorarDuplicados }` — até 2.000 por vez |
| `POST` | `/espacos/entrar` | `{ codigo }` entra num espaço pelo token |
| `POST` | `/espacos/trocar` | `{ espacoId }` |
| `GET` | `/espacos/membros` | |
| `POST` | `/espacos/sair` | |
| `PUT` | `/espacos/nome` | só o dono |
| `POST` | `/espacos/codigo` | gera um token novo (só o dono) |
| `DELETE` | `/espacos/membros/:usuarioId` | só o dono |
| `GET` | `/health` | testa a conexão com o banco |

Valores aceitos: `status` = `QUENTE`, `MORNO` ou `FRIO` · `estado` = `ATIVO` ou `INATIVO` ·
`origem` = `Site`, `Instagram`, `Facebook`, `WhatsApp`, `Indicação`, `Google` ou `Outro`.

## Deploy

Funciona em qualquer serviço que rode Node (Render, Railway...). Configure as variáveis
acima com `NODE_ENV=production`, use `npm install && npm run db:push` como build e
`npm start` para iniciar.
