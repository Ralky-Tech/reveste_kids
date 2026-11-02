# Reveste Kids - Plataforma de Troca de Roupas

## Executar com Docker Compose (IEC / FATEC)

Requisitos: Git, Docker Engine/Docker Desktop em modo **Linux containers** com
Compose v2 ou superior, acesso de rede ao MongoDB Atlas e uma credencial
autorizada para o banco da equipe. Node/npm no computador não são necessários
para usar Compose. As imagens usam Node 24 e dependências dos `package-lock.json`.

### Configuração inicial (uma vez por integrante)

Na raiz do repositório, copie `.env.example` para `.env` e configure os valores
localmente. Não sobrescreva um `.env` existente. No PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

- `MONGODB_URI`: URI do banco Atlas autorizado para o uso do grupo. Nenhum MongoDB
  é criado pelo Compose. Não coloque a URI nos Dockerfiles ou argumentos de build.
- `JWTSECRET`: segredo da sessão, compartilhado apenas pelo canal privado da equipe.
  É obrigatório; o exemplo não contém uma senha padrão.
- `GOOGLE_CLIENT_ID`: Client ID **público** do cliente web Google. O Compose usa o
  mesmo valor no backend e no build do frontend. Client Secret não é utilizado.
  Sem esse valor o botão Google fica oculto; login tradicional continua disponível.
- `EMAIL_*`: configuração SMTP opcional para entrega de e-mails. Roupas, matches,
  notificações internas e chat continuam disponíveis sem SMTP; o envio de e-mail
  não será concluído até a configuração estar correta.
- `DOCKER_DNS_SERVER`: IP opcional do resolvedor acessível pela sua rede, se houver
  falha SRV do Atlas. Vazio preserva o DNS padrão. Afeta somente o Node no contêiner.

O Atlas precisa permitir o IP de saída do computador. Os índices Google
`google_sub_unique` e `email_case_insensitive_unique` devem estar provisionados
por um responsável; consulte [Google Auth](backend/docs/google-auth.md).
**O bootstrap Docker desativa `autoIndex` e `autoCreate` antes de importar modelos.**
Iniciar o sistema não é uma migração. Ações feitas na aplicação continuam gravando
no banco autorizado, conforme suas permissões; não use uma base sem autorização.

### Um comando para iniciar os dois serviços

```powershell
docker compose up -d --build
```

Abra **http://localhost:8080**. O backend fica acessível diretamente em
**http://localhost:4001** (`/health`, `/api-docs/`). As portas 5173 e 4000 usadas
por `npm run dev` não são ocupadas pelo Compose. Os serviços são publicados
somente no loopback do computador.

Se alguma porta já estiver ocupada, ajuste `FRONTEND_PORT` ou `BACKEND_PORT` no
`.env` local, sem encerrar o processo existente. `FRONTEND_ORIGIN` é opcional;
na configuração padrão o CORS acompanha `http://localhost:FRONTEND_PORT`.
O Swagger acompanha a porta pública do backend; `SWAGGER_SERVER_URL` permite
informar outra URL pública explicitamente sem mudar o padrão fora do Docker.

O navegador acessa `/backend/...` na origem do frontend. Nginx encaminha essa
rota ao serviço `backend:4000`, preservando `/api/...`. Socket.IO usa a mesma
origem com `/socket.io/`, incluindo upgrade WebSocket. **Não use
`http://backend:4000` como URL do navegador**: esse nome só existe na rede Docker.
React Router funciona também em links diretos, como `/feed` e `/register`.

Vite incorpora variáveis `VITE_*` durante o **build**. No Docker, API e Socket.IO
usam os valores públicos `/backend` e `/`; as configurações existentes de
Vercel/Render e os fallbacks para `npm run dev` são preservados. Alterar o Client
ID exige reconstruir a imagem frontend. Nenhuma senha ou URI é passada ao build.

Para Google Auth, autorize **http://localhost:8080** no cliente OAuth web do
Google (ou a porta que escolheu). As origens Vercel existentes devem permanecer
autorizadas. Se o cliente estiver em modo de teste, permita as contas de teste.
Não altere a configuração de produção para substituir as origens existentes.

### Status, logs e parada

```powershell
docker compose config --quiet
docker compose ps
docker compose logs -f
docker compose logs -f backend
docker compose down
```

`config --quiet` valida sem imprimir as variáveis resolvidas. Não compartilhe a
saída de `docker compose config` sem `--quiet`, `docker inspect` ou logs que
contenham dados sensíveis. Credenciais são fornecidas apenas em runtime, não nas
imagens; quem administra o Docker local ainda pode acessar o ambiente dos serviços.
`down` remove os contêineres/rede deste projeto, sem remover dados do Atlas.

Com npm instalado, os atalhos equivalentes na raiz são:

```powershell
npm run compose:up
npm run compose:logs
npm run compose:down
npm run compose:config
npm run compose -- ps
```

Os comandos de desenvolvimento existentes continuam iguais: `npm run dev` na
raiz, ou nos diretórios frontend/backend. O backend Docker executa
`docker-entrypoint.js`, enquanto Render continua usando seu `npm start`.

### Validação local sem acessar Atlas

```powershell
npm --prefix backend ci
npm --prefix backend test
npm --prefix frontend ci
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
```

Para validar **as imagens e o proxy** sem iniciar a aplicação real, use um
terminal separado, sem carregar credenciais reais, e a sobreposição de CI:

```powershell
$env:MONGODB_URI = 'mongodb://example.invalid/reveste_ci'
$env:JWTSECRET = 'ci-placeholder-not-a-real-secret'
$env:GOOGLE_CLIENT_ID = ''
$env:FRONTEND_PORT = '18080'
$env:BACKEND_PORT = '14001'
$env:COMPOSE_PROJECT_NAME = 'reveste-ci'
docker compose -f compose.yaml -f compose.ci.yaml config --quiet
docker compose -f compose.yaml -f compose.ci.yaml up -d --build --wait --wait-timeout 120
docker compose -f compose.yaml -f compose.ci.yaml exec -T backend node tests/docker-verify.mjs
docker compose -f compose.yaml -f compose.ci.yaml down
```

Essa sobreposição substitui somente o processo backend por um servidor simulado,
sem modelos ou banco. Verifica SPA, CORS, proxy HTTP, caminhos `/api` e Socket.IO
WebSocket. **Ela não serve para uso funcional da aplicação.** Feche esse terminal
ao terminar para descartar as variáveis de teste. Se usar outro nome de projeto,
repita o mesmo nome no comando de parada; não pare os serviços de outro integrante.

### GitHub Actions: integração e entrega contínuas, sem deploy

O workflow `.github/workflows/ci.yaml` executa em `push` e `pull_request` para
`main`, além de execução manual:

1. Backend: `npm ci`, sintaxe JavaScript e `npm test`, com dependências externas
   isoladas. Não existe script de lint/build do backend; ele é executado como Node.
2. Frontend: `npm ci`, lint, testes e build. O `dist` é disponibilizado como artefato.
3. Docker: build das duas imagens, verificação de runtime e teste Compose offline.

As Actions são fixadas por SHA, têm permissão de leitura e não precisam de
segredos Atlas, Google ou registry. **Não há push de imagens, merge, chamada a
Render/Vercel ou deploy automático pelo workflow.** O empacotamento prepara a
entrega; a publicação continua sob o fluxo já existente de Render/Vercel e deve
ser autorizada separadamente. Não altere esses serviços para validar este PR.

---

Aplicação fullstack desenvolvida com Node.js, Express, MongoDB Atlas, React e Cloudinary, permitindo a troca de roupas entre usuários através de uma experiência moderna inspirada em redes sociais como TikTok e Instagram.

---

# Sobre o projeto

O Reveste Kids é uma plataforma onde usuários podem:

* Cadastrar roupas
* Curtir peças de outros usuários
* Criar matches automáticos
* Explorar closets públicos
* Receber notificações em tempo real
* Conversar e negociar trocas

Tudo isso com uma interface moderna, fluida e responsiva.

---

# Objetivo

Projeto desenvolvido para a disciplina Desenvolvimento Web III, com foco em:

* Construção de aplicação fullstack real
* Integração com serviços externos
* Arquitetura moderna
* Responsividade
* Experiência mobile-first
* Boas práticas de desenvolvimento
* Versionamento com Git e GitHub

---

# Tecnologias utilizadas

## Backend

* Node.js
* Express
* MongoDB Atlas
* Mongoose
* JWT
* Dotenv
* Swagger UI
* Nodemailer
* Socket.IO
* Multer
* Cloudinary SDK

---

## Frontend

* React
* Vite
* React Router DOM
* CSS moderno
* Fetch API
* LocalStorage

---

## Upload de mídia

* Cloudinary

---

## Ferramentas

* Git
* GitHub
* Swagger
* Insomnia
* Vercel
* Render

---

# Funcionalidades

## Autenticação

* Cadastro de usuários
* Login com JWT
* Persistência de sessão
* Proteção de rotas
* Logout seguro

---

## Gestão de roupas

* Cadastro de peças
* Upload de múltiplas imagens
* Upload de vídeos
* Edição completa
* Exclusão de peças
* Organização por closet

---

## Feed estilo TikTok

* Scroll vertical fluido
* Reprodução automática de vídeos
* Suporte a imagens e vídeos
* Carousel de mídia
* Layout responsivo
* Navegação mobile-first
* Interações rápidas

---

## Likes

* Curtir peças
* Remover curtidas
* Bloqueio de auto-like
* Persistência de curtidas

---

## Matches

* Match automático por interesse mútuo
* Interface de conversa
* Visualização das peças envolvidas
* Histórico de interações

---

## Central de notificações

* Notificações internas em tempo real
* Atualização automática via WebSocket
* Contador de notificações
* Alertas visuais
* Alerta sonoro para novas notificações

---

## Notificações por e-mail

* Integração com Nodemailer
* Aviso automático de curtidas
* Comunicação entre usuários
* Templates personalizados

---

## Busca de closets públicos

* Exploração de closets de outros usuários
* Visualização de peças públicas
* Curtidas diretamente pela busca
* Filtros de pesquisa
* Navegação responsiva

---

## Meu Closet

* Visualização das próprias peças
* Edição via modal
* Upload e remoção de mídias
* Exclusão de itens

---

## Cadastro de peças

* Interface moderna
* Upload separado de imagens e vídeos
* Preview em tempo real
* Integração com Cloudinary

---

## Tema claro e escuro

* Alternância dinâmica de tema
* Persistência da preferência do usuário
* Ajuste automático de ícones
* Padronização visual entre páginas

---

# Upload com Cloudinary

* Upload direto pelo frontend
* Suporte a imagens e vídeos
* CDN global
* Otimização automática
* Preview em tempo real

## Estrutura de mídia

```json
{
  "media": [
    {
      "type": "image",
      "url": "https://..."
    },
    {
      "type": "video",
      "url": "https://..."
    }
  ]
}
```

---

# Estrutura do projeto

```bash
reveste_kids/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── sockets/
│   └── index.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── FeedTikTok.jsx
│   │   │   ├── MyCloset.jsx
│   │   │   ├── AddClothing.jsx
│   │   │   ├── Matches.jsx
│   │   │   ├── SearchClosets.jsx
│   │   │   └── NotificationCenter.jsx
│   │   ├── services/
│   │   └── App.jsx
│   └── vite.config.js
│
└── README.md
```

---

# Como executar

## 1. Clonar o projeto

```bash
git clone https://github.com/toledorp/reveste_kids.git
```

---

## 2. Acessar a pasta do projeto

```bash
cd reveste_kids
```

---

## 3. Instalar dependências

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

# Configuração de ambiente

Crie um arquivo `.env` no backend:

```env
PORT=4000

MONGO_URI=sua_string_mongodb

JWT_SECRET=sua_chave_jwt

CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=sua_api_secret

EMAIL_USER=seu_email
EMAIL_PASS=sua_senha

FRONTEND_URL=http://localhost:5173
```

---

# Executando o projeto

Na raiz do projeto:

```bash
npm run dev
```

Ou separadamente:

## Backend

```bash
cd backend
npm run dev
```

## Frontend

```bash
cd frontend
npm run dev
```

---

# Acessos locais

Frontend:

```bash
http://localhost:5173
```

Backend:

```bash
http://localhost:4000
```

Swagger:

```bash
http://localhost:4000/api-docs
```

---

# Deploy

## Frontend

Hospedado na Vercel.

Exemplo:

```bash
https://reveste-kids-sepia.vercel.app
```

---

## Backend

Hospedado na Render.

---

# Autenticação

* JWT
* Login e cadastro
* Proteção de rotas
* Persistência de sessão

---

# API - Principais rotas

## Auth

```bash
POST /user
POST /auth
```

---

## Roupas

```bash
GET /clothes
POST /clothes
PUT /clothes/:id
DELETE /clothes/:id
GET /clothes/user
```

---

## Likes

```bash
POST /like/:id
DELETE /like/:id
```

---

## Matches

```bash
GET /matches
```

---

## Notificações

```bash
GET /notifications
POST /notifications
```

---

# Swagger

Documentação disponível em:

```bash
http://localhost:4000/api-docs
```

---

# Diferenciais

* Interface inspirada no TikTok
* Upload de imagens e vídeos
* Match automático entre usuários
* Sistema de notificações em tempo real
* Busca de closets públicos
* Tema claro/escuro
* UX moderna e responsiva
* Arquitetura fullstack completa
* Integração com Cloudinary
* Estrutura pronta para deploy
* Projeto escalável

---

# Testes

* Insomnia
* Swagger
* Testes manuais
* Testes de integração
* Validação responsiva

---

# Banco de dados

* MongoDB Atlas

---

# Integrações implementadas

* Cloudinary
* MongoDB Atlas
* Nodemailer
* Socket.IO
* Vercel
* Render

---

# Organização das branches

Exemplos de branches utilizadas durante o desenvolvimento:

```bash
main
feat/theme-toggle-camila
feat/search-closets-felipe
feat/notification-center
fix/closet-layout
release/v1.0.0
```

---

# Melhorias futuras

* Sistema completo de trocas
* Chat em tempo real
* Sistema de avaliações
* Geolocalização
* Aplicativo mobile
* Recomendação inteligente de peças
* Integração com IA

---

# Responsividade

Projeto desenvolvido para:

* Desktop
* Tablets
* Smartphones

---

# Segurança

* JWT Authentication
* Hash de senhas com Bcrypt
* Proteção de rotas
* Controle de autenticação
* Validação básica de dados

---

# Autores

* Camila Machado de Souza
* Felipe Guedes
* Kaio Sumikawa
* Ricardo Sugano
* Rogerio Pupo Toledo

---

# Licença

Projeto acadêmico sem fins comerciais.
