# ReVeste Kids — App Mobile (PDM)

Versão mobile do **ReVeste Kids**, plataforma de troca de roupas infantis, desenvolvida para a disciplina
**Programação para Dispositivos Móveis (PDM)** da Fatec Registro, com React Native, Expo e Expo Router.

O app usa o mesmo backend do projeto web
([Ralky-Tech/reveste_kids](https://github.com/Ralky-Tech/reveste_kids)):
contas, peças e curtidas são as mesmas do site.

## Funcionalidades

- Tela de boas-vindas que reconhece quem já está logado
- Cadastro e login, com validação dos campos
- Feed com as peças dos outros usuários, curtidas e aviso de **match**
- Detalhes da peça com carrossel de fotos
- Cadastro de peça com fotos da **galeria** ou da **câmera**, categoria, tamanho, condição e estilo
- **Meu Closet** com as peças agrupadas por categoria
- Lista de matches
- Perfil com resumo de peças, curtidas e matches, e botão de sair

## Conteúdo das aulas aplicado no projeto

| Aula | Conteúdo | Onde está no código |
| --- | --- | --- |
| 01 | Desenvolvimento mobile, nativo x híbrido | Escolha do React Native + Expo |
| 02 | Ambiente, Expo, SDK 54 | Projeto criado com `npx create-expo-app@latest ReVesteKids --template default@sdk-54` |
| 03 | View, Text, Image, SafeAreaView, ScrollView, StyleSheet | `app/index.tsx` e todas as telas |
| 04 | Layout com Flexbox (card, container, logo, botão) | `app/index.tsx`, `components/RoupaCard.tsx` |
| 05 | Pressable, eventos e estilo pressionado | `components/Botao.tsx`, ícones do cabeçalho em `app/feed.tsx` |
| 06 | useState e renderização condicional | `app/index.tsx` (texto e botão mudam se já há login), formulários |
| 07 | useEffect e array de dependências | `app/index.tsx`, `app/roupas/[id].tsx` (`[id]`), `app/matches.tsx` |
| 08 | Expo Router: `_layout.tsx`, Stack, Link, `router.push`, `router.back`, parâmetros | `app/_layout.tsx`, `app/login.tsx` (Link), `app/roupas/[id].tsx` (useLocalSearchParams) |
| 09 | Componentes reutilizáveis e props | `components/` (Botao, Campo, Etiqueta, RoupaCard, Seletor) |
| 10 | FlatList e SectionList | `app/feed.tsx` (FlatList), `app/closet.tsx` (SectionList por categoria) |
| 11 | Formulários, TextInput controlado, validação com Alert | `app/login.tsx`, `app/cadastro.tsx`, `app/roupas/nova.tsx` |
| 12 | AsyncStorage | `utils/armazenamento.ts` (perfil salvo no aparelho; o token fica no SecureStore) |
| 13 | fetch e axios | `services/cloudinary.ts` (fetch), `services/api.ts` (axios) |
| 14 | Integração com API REST, URL base, interfaces TypeScript | `services/`, `types/roupa.ts` |
| 15 | Recursos nativos: câmera, galeria e permissões | `app/roupas/nova.tsx` (expo-image-picker) |

## Estrutura

```
ReVesteKids/
├── app/                    # Telas (cada arquivo é uma rota do Expo Router)
│   ├── _layout.tsx         # Navegação em pilha (Stack)
│   ├── index.tsx           # Boas-vindas
│   ├── login.tsx
│   ├── cadastro.tsx
│   ├── feed.tsx
│   ├── closet.tsx
│   ├── matches.tsx
│   ├── perfil.tsx
│   └── roupas/
│       ├── [id].tsx        # Detalhes da peça
│       └── nova.tsx        # Cadastro de peça
├── components/             # Componentes reutilizáveis
├── constants/              # Cores, listas de opções e configuração de ambiente
├── services/               # Comunicação com a API e o Cloudinary
├── types/                  # Interfaces TypeScript
├── utils/                  # Sessão (SecureStore + AsyncStorage) e funções de apoio
├── mock-server/            # Servidor simulado para testes, com imagens de exemplo
├── assets/images/          # Logo
└── .env.example            # Modelo das variáveis de ambiente
```

## Plataformas

O app é feito **somente para Android e iOS** (pelo Expo Go ou por um build nativo). A versão web
não é suportada: o token de login fica no `expo-secure-store`, que não existe no navegador. Se o app
for aberto num navegador, a tela inicial avisa e o login fica bloqueado.

## Como executar

Pré-requisitos: Node.js (versão LTS) e o app **Expo Go** compatível com o SDK 54 no celular.

**1. Instale as dependências:**

```
npm install
```

**2. Configure o ambiente.** Copie o `.env.example` para `.env` e preencha:

| Variável | O que é |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Endereço do backend, sem barra no final |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Conta do Cloudinary para as fotos |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Preset de upload sem assinatura |
| `EXPO_PUBLIC_CLOUDINARY_API_URL` | Opcional. Endereço do serviço de upload; vazio = Cloudinary real |

O `.env` não vai para o GitHub. Sem ele, a tela inicial mostra quais variáveis faltam.
`localhost` não funciona no celular: use o IP do computador na rede Wi-Fi.

**3. Inicie o app:**

```
npx expo start
```

Escaneie o QR Code com o Expo Go (celular e computador na mesma rede Wi-Fi). Em redes que bloqueiam a
conexão, use `npx expo start --tunnel`. Sempre que mudar o `.env`, reinicie o Expo.

## Testes com dados simulados (sem acessar a produção)

A pasta `mock-server/` tem um servidor simulado que imita as rotas do backend usadas pelo app e o
upload do Cloudinary. Ele usa apenas módulos do Node.js, guarda tudo na memória e já vem com dados de
exemplo, incluindo uma peça sem dono (conta apagada) e um match pronto para acontecer.

**1. Inicie o servidor simulado** num terminal:

```
npm run mock
```

Ele mostra as quatro linhas para colocar no `.env`, já com o IP do computador.

**2. Copie essas linhas para o `.env`**, inicie o app (`npx expo start`) em outro terminal e entre com
uma das contas de teste (senha `123456`): `teste@teste.com`, `ana@teste.com` ou `bruno@teste.com`.

**Roteiro de teste no Android** (conta `teste@teste.com`):

1. O feed mostra 4 peças de outras pessoas, incluindo "Casaco de lã (dono removido)", sem travar.
2. Curtir a "Jaqueta jeans" gera o aviso de match; a tela de matches mostra a Ana.
3. Cadastrar uma peça com foto da galeria e da câmera; ela aparece no Meu Closet, agrupada pela categoria.
4. Excluir a peça no Meu Closet.
5. Sair da conta e entrar de novo.

**Cenários de erro:**

| Comando | O que simula | O que o app deve fazer |
| --- | --- | --- |
| `npm run mock:sessao-curta` | Token que vence em 1 minuto | Depois de 1 minuto, avisar "Sessão expirada" e voltar ao login |
| `npm run mock:falha-upload` | Upload de foto recusado | Dizer qual foto falhou e permitir tentar de novo |
| `npm run mock:falha-cadastro` | Falha ao salvar a peça | Avisar e permitir tentar de novo sem reenviar as fotos |

## Verificações

```
npm run verificar
```

Executa a checagem de tipos (`npm run typecheck`), o lint (`npm run lint`) e o Expo Doctor
(`npm run doctor`, que precisa de internet). O comando `npm run mock:testar` sobe o servidor simulado,
testa todas as rotas usadas pelo app (27 verificações) e desliga.

## Segurança e tratamento de erros

- O token JWT fica no **expo-secure-store** (armazenamento criptografado do sistema). Os dados não
  secretos do perfil (id, e-mail, nome e validade do token) ficam no AsyncStorage.
- Ao abrir o app, sessões incompletas ou com token vencido são apagadas. Se o servidor responder 401,
  a sessão é encerrada e o app volta para o login; se não for possível apagar os dados salvos, a pessoa
  é avisada (eles são substituídos no próximo login).
- Falhas ao salvar ou apagar a sessão são avisadas na tela.
- Peças cujo dono não existe mais aparecem como "Usuário", sem travar o feed.
- No cadastro de peças, o tamanho de cada foto é conferido antes do envio (pelo seletor de imagens ou,
  se ele não informar, lendo o arquivo); fotos acima de 10 MB são recusadas. Cada envio tem tempo limite,
  que vale até a resposta ser lida por completo. Se algo falhar no meio, as fotos que já subiram não são
  reenviadas na nova tentativa.

## Dependências e vulnerabilidades

As bibliotecas que vieram no modelo do Expo e não eram usadas foram removidas. O `npm audit fix`
automático **não deve ser usado**: em teste, ele instalou uma segunda cópia do React Native (0.88),
incompatível com o SDK 54, e o app deixou de compilar. As correções foram aplicadas de forma controlada,
pelo campo `overrides` do `package.json`, só quando existe versão corrigida compatível:

| Pacote | Correção |
| --- | --- |
| `postcss` (alta) | Atualizado de 8.4.49 para 8.5.32 (mesma versão principal) |
| `node-forge` (alta) | Atualizado de 1.4.0 para 1.4.2 (mesma versão principal) |

As que restam vêm de 5 pacotes de origem, sem correção compatível com o SDK 54:

| Pacote de origem | Severidade | Onde é usado | Por que não foi corrigido |
| --- | --- | --- | --- |
| `decode-uri-component` (via `query-string`, `expo-router`) | Alta | No app, ao interpretar endereços internos | A versão corrigida (0.5.1) passou a ser só ESM e o `query-string` 7 usado pelo `expo-router` 6 não a carrega. Risco: travamento do próprio app ao abrir um link malicioso; não expõe dados |
| `image-size` (via Metro) | Alta | Só no computador, ao empacotar imagens | Corrigido apenas na versão 2, incompatível com o Metro do SDK 54. Não vai para o app |
| `glob`, `minimatch` (ferramentas do Expo, React Native e ESLint) | Moderada | Só no computador, durante desenvolvimento e lint | Corrigidos apenas em versões principais novas (glob 14, minimatch 11), que essas ferramentas não suportam. Não vão para o app |
| `deepmerge` (configuração do Expo) | Baixa | Só no computador, ao ler a configuração | Não há versão corrigida publicada |

Essas pendências devem desaparecer ao atualizar o projeto para um SDK do Expo mais novo, o que exige
um Expo Go compatível nos celulares de teste.

## Compatibilidade com o backend

O backend atual grava **categoria, tamanho, condição e estilo** das peças, e o app envia os quatro
campos. Os valores oferecidos no app seguem os exemplos usados no site (por exemplo, "Nova", "Seminova"
e "Usada" para a condição).

## Autor

Ricardo Sugano — Desenvolvimento de Software Multiplataforma, Fatec Registro.
