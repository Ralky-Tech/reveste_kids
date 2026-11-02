# Testes, cobertura e pre-commit

Use Node.js **24 LTS**, a mesma versão principal do CI e dos Dockerfiles.

## Instalação em um clone novo

Na raiz:

```sh
npm ci
npm run setup
```

O `prepare` do primeiro comando instala Husky 9 automaticamente. O segundo instala as dependências
do backend e do frontend a partir dos respectivos lockfiles. Instalar somente um subprojeto não
prepara o hook da raiz. Instalações com `--ignore-scripts` precisam de `npm run prepare` posteriormente.
CI, `NODE_ENV=production` e `HUSKY=0` pulam a instalação dos hooks.

O instalador recusa substituir `core.hooksPath` personalizado ou um pre-commit existente.
Em linked worktrees ele ativa `extensions.worktreeConfig` no repositório compartilhado e grava
`core.hooksPath` apenas no `config.worktree` da worktree atual. As outras worktrees mantêm seus hooks.
Não é necessário instalar Husky globalmente. Git for Windows executa o hook em seu shell POSIX;
`.gitattributes` mantém o arquivo com finais de linha LF.

## Comandos

| Comando na raiz | Ação |
|---|---|
| `npm test` | Testes de backend e frontend, com `node:test` |
| `npm run test:backend` | Suíte do backend |
| `npm run test:frontend` | Suíte do frontend |
| `npm run lint` | ESLint do frontend |
| `npm run precommit:check` | Backend → lint → frontend; interrompe na primeira falha |
| `npm run coverage` ou `npm run test:coverage` | Cobertura dos dois projetos, sequencialmente |

Nos diretórios `backend` e `frontend`, `npm test` continua disponível;
`npm run coverage` e `npm run test:coverage` geram a cobertura daquele projeto.

O hook `.husky/pre-commit` executa `npm run precommit:check`. Não altera arquivos automaticamente,
não roda cobertura, mutação, Docker, build nem deploy. É preciso instalar as dependências dos três
diretórios antes de fazer commits. O ESLint permanece com as regras existentes, ignorando os relatórios gerados.

Para executar o hook pelo Git sem fazer commit:

```sh
git hook run pre-commit
```

Hooks locais podem ser ignorados pelo usuário; mantenha também os testes/lint do CI como verificação
no servidor. Não foi adicionado limite mínimo de cobertura arbitrário.

## Relatórios

A coleta é nativa: `node --test --experimental-test-coverage`. O runner usa os reporters `spec`
(terminal), `lcov` (Node) e um reporter HTML local que lê o evento público `test:coverage`.
Não usa Jest, Vitest, Istanbul, c8 ou serviços externos. Testes e `node_modules` ficam fora do relatório.
Os testes do backend seguem o glob já existente; os do frontend seguem o arquivo já configurado.
Se a seleção de testes mudar, atualize também `scripts/coverage.mjs`.

Os arquivos abaixo são recriados em cada execução e ignorados pelo Git:

| Projeto | HTML | LCOV | Dados nativos |
|---|---|---|---|
| Backend | `backend/coverage/index.html` | `backend/coverage/lcov.info` | `backend/coverage/summary.json` |
| Frontend | `frontend/coverage/index.html` | `frontend/coverage/lcov.info` | `frontend/coverage/summary.json` |

Abra o HTML diretamente no navegador. Todos os recursos são locais. O HTML mostra linhas, branches,
funções, respectivos contadores, linhas não cobertas e um inventário de fontes JS/JSX sem medição.

**Escopo:** o Node mede arquivos JavaScript carregados durante os testes. Arquivos não carregados não
entram nos denominadores. Não há inferência de 0% para arquivos sem contadores; JSX não é transformado
nem testado por esta configuração. Portanto, 100% no utilitário de busca não significa 100% no frontend.
Os testes atuais usam hooks de carregamento e mocks, alguns acrescentando linhas à fonte do controller:
os números/linhas são os produzidos pelo Node para essas fontes carregadas, e não uma certificação do
código de produção inteiro. As definições de branches e funções seguem V8/Node, podendo diferir de
outras ferramentas. A coleta ainda utiliza uma flag experimental do Node 24.

Os testes atuais isolam persistência e autenticação externa; nenhum servidor ou conexão Atlas precisa
ser iniciado para esses comandos. Não copie `.env` de produção para executar a suíte.

Referências: [Node 24 — test runner](https://nodejs.org/docs/latest-v24.x/api/test.html),
[Husky — instalação](https://typicode.github.io/husky/get-started.html) e
[Husky — configuração](https://typicode.github.io/husky/how-to.html).
