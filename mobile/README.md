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
- Cadastro de peça com fotos da **galeria** ou da **câmera**, categoria, tamanho e estado
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
├── utils/                  # AsyncStorage e funções de apoio
├── assets/images/          # Logo
└── .env.example            # Modelo das variáveis de ambiente
```

## Como executar

Pré-requisitos: Node.js instalado e o app **Expo Go** (compatível com o SDK 54) no celular.

**1. Instale as dependências:**

```
npm install
```

**2. Configure o ambiente.** Copie o arquivo `.env.example` para `.env` e preencha:

| Variável | O que é |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Endereço do backend, sem barra no final |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Conta do Cloudinary para as fotos |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Preset de upload sem assinatura |

Para desenvolvimento e testes, use um backend local (pelo IP do computador na rede Wi-Fi, já que
`localhost` não funciona no celular) e um preset de testes do Cloudinary, para não gravar dados na
produção. O `.env` não vai para o GitHub. Sem ele, a tela inicial mostra quais variáveis faltam.

**3. Inicie o app:**

```
npx expo start
```

Depois, escaneie o QR Code com o Expo Go. O celular e o computador precisam estar na mesma rede Wi-Fi.
Em redes que bloqueiam a conexão (faculdade, empresa), use `npx expo start --tunnel`.
Sempre que mudar o `.env`, reinicie o Expo.

## Verificações

```
npm run verificar
```

Executa, em sequência, a checagem de tipos (`npm run typecheck`), o lint (`npm run lint`) e o
Expo Doctor (`npm run doctor`). O Expo Doctor precisa de internet para algumas verificações.

## Segurança e tratamento de erros

- O token JWT fica no **expo-secure-store** (armazenamento criptografado do sistema). Os dados não
  secretos do perfil (id, e-mail, nome e validade do token) ficam no AsyncStorage.
- Ao abrir o app, sessões incompletas ou com token vencido são apagadas. Se o servidor responder 401
  durante o uso, a sessão é encerrada e o app volta para o login.
- Falhas ao salvar ou apagar a sessão são avisadas na tela.
- No cadastro de peças, cada foto é enviada com tempo limite, fotos acima de 10 MB são recusadas e,
  se o envio falhar no meio, as fotos que já subiram não são reenviadas na nova tentativa.

## Tecnologias

React Native 0.81 · Expo SDK 54 · Expo Router · TypeScript · axios · AsyncStorage ·
expo-secure-store · expo-image-picker · @react-native-picker/picker · Cloudinary

## Compatibilidade com o backend

O app envia categoria, tamanho e estado das peças. Esses campos só são gravados se o modelo de
peças do backend os tiver; caso contrário, as peças aparecem sem essas informações e o Meu Closet as
agrupa em "Sem categoria".

## Autor

Ricardo Sugano — Desenvolvimento de Software Multiplataforma, Fatec Registro.
