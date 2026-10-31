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
| 12 | AsyncStorage | `utils/armazenamento.ts` (login salvo no aparelho) |
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
├── constants/              # Cores e listas de opções
├── services/               # Comunicação com a API e o Cloudinary
├── types/                  # Interfaces TypeScript
├── utils/                  # AsyncStorage e funções de apoio
└── assets/images/          # Logo
```

## Como executar

Pré-requisitos: Node.js instalado e o app **Expo Go** (compatível com o SDK 54) no celular.

```
npm install
npx expo start
```

Depois, escaneie o QR Code com o Expo Go. O celular e o computador precisam estar na mesma rede Wi-Fi.
Em redes que bloqueiam a conexão (faculdade, empresa), use `npx expo start --tunnel`.

O backend fica no Render, no plano gratuito. Quando ninguém usa, ele "dorme", e a primeira requisição
pode levar cerca de 50 segundos. O endereço está em `services/api.ts`.

## Tecnologias

React Native 0.81 · Expo SDK 54 · Expo Router · TypeScript · axios · AsyncStorage ·
expo-image-picker · @react-native-picker/picker · Cloudinary

## Observação

O token de login fica no AsyncStorage, como visto na Aula 12. Em um app de produção, o ideal seria usar um
armazenamento criptografado, como o `expo-secure-store`.

## Autor

Ricardo Sugano — Desenvolvimento de Software Multiplataforma, Fatec Registro.
