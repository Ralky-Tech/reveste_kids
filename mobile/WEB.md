# Executar o aplicativo no navegador

Na pasta `mobile`, mantenha dois terminais abertos:

```powershell
npm run mock
```

```powershell
npm run web
```

Se o mock já estava aberto antes da mudança de código, encerre com Ctrl+C e execute novamente:
ele precisa carregar as rotas e os cabeçalhos CORS novos. Reinicie também o Expo.

O `.env` continua na pasta `mobile`. Copie as quatro linhas exibidas pelo mock. Para testar
somente no notebook, pode usar:

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_CLOUDINARY_API_URL=http://localhost:4000/cloudinary
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=teste
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=teste
```

Para usar o mesmo `.env` no celular, use o IP da rede informado pelo mock no lugar de `localhost`.

## O que mudou

- Dependências web compatíveis com Expo SDK 54: React DOM, React Native Web e Metro Runtime.
- Plataforma web habilitada em `app.json`, com Metro e saída SPA. O `_layout.tsx` não foi alterado.
- Comando `npm run web`; a tecla `w` do `npx expo start` também abre a versão web.
- Sessão no `sessionStorage` da aba, preservada em recargas e removida no logout ou ao fechar a aba.
  No Android/iOS, continuam SecureStore para o token e AsyncStorage para o perfil.
- Alertas e confirmações no navegador mantêm as ações de logout, exclusão e sessão expirada.
- Galeria envia o objeto File do seletor do navegador como multipart. No celular, mantém o formato nativo.
- A câmera usa o seletor de captura do navegador. A oferta de câmera depende do navegador/dispositivo;
  o botão Galeria permite selecionar um arquivo no notebook.
- Mock responde a OPTIONS e permite Authorization, Content-Type, GET, POST, PATCH e DELETE via CORS.

Esta configuração de CORS é do servidor simulado. Outro backend precisa configurar suas próprias
origens permitidas. O sessionStorage é acessível ao JavaScript da página e não equivale ao
armazenamento criptografado nativo.

## Conferência manual para a gravação

1. Entre com `teste@teste.com`, senha `123456`.
2. Mostre o feed, abra o sino e marque uma notificação como lida. Volte para conferir o contador.
3. Recarregue a página: a sessão e a leitura devem continuar enquanto a aba e o mock estiverem abertos.
4. Curta a jaqueta e confira o aviso de match.
5. Cadastre uma peça usando uma imagem pela Galeria. Confira a peça no Closet e exclua pelos detalhes.
6. No Perfil, cancele uma tentativa de logout para conferir a confirmação. Depois confirme a saída.
7. Teste uma senha incorreta para conferir a mensagem de erro de login.

Não foi possível executar os cliques automaticamente: não havia navegador conectado à ferramenta
de controle nesta sessão. Os testes automatizados do mock não substituem essa conferência visual.

## Validação executada

- TypeScript e lint aprovados.
- Exportação web com Metro concluída (883 módulos).
- Exportação Android concluída após as adaptações (1.104 módulos).
- 45 verificações do mock aprovadas, incluindo preflight e cabeçalhos CORS.
- Verificação isolada do código de sessão web: salvar, carregar, logout, expiração e remoção
  de sessão incompleta, sem chamar SecureStore.
- Verificação isolada dos diálogos web: cancelar, confirmar e executar a ação de botão único.

O comando completo `npm run verificar` chegou ao Expo Doctor, mas a checagem de schema de
`app.json` voltou a falhar por conexão TLS com a API do Expo (`fetch failed`). É necessário
repetir essa etapa com acesso à API para confirmar a verificação completa e o CI do futuro PR.

Referência de instalação: [documentação oficial de suporte web do Expo](https://docs.expo.dev/workflow/web/).
