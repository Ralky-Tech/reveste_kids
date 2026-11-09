// Testes automáticos do servidor simulado: sobe o servidor, testa as rotas usadas pelo app e desliga.
// Uso: npm run mock:testar
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pasta = path.dirname(fileURLToPath(import.meta.url));
const PORTA = 4199;
const B = `http://127.0.0.1:${PORTA}`;
const servidor = spawn(process.execPath, [path.join(pasta, "servidor.js"), `--porta=${PORTA}`], {
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 1500));
let falhas = 0;
const j = async (r) => [r.status, await r.json().catch(() => null)];
const post = (p, corpo, token) =>
  fetch(B + p, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(corpo),
  });
const put = (p, corpo, token) =>
  fetch(B + p, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(corpo),
  });
const get = (p, token) =>
  fetch(B + p, { headers: token ? { Authorization: "Bearer " + token } : {} });
const ok = (cond, msg) => {
  if (!cond) falhas++;
  console.log((cond ? "OK   " : "FALHA") + " " + msg);
};

// O navegador precisa do preflight para enviar Authorization e PATCH.
const preflight = await fetch(B + "/api/notifications/n-curtida/read", {
  method: "OPTIONS",
  headers: {
    Origin: "http://localhost:8081",
    "Access-Control-Request-Method": "PATCH",
    "Access-Control-Request-Headers": "authorization,content-type",
  },
});
ok(preflight.status === 204 && preflight.headers.get("access-control-allow-origin") === "*", "preflight web libera origem sem exigir login");
ok(preflight.headers.get("access-control-allow-methods").includes("PATCH") && preflight.headers.get("access-control-allow-headers").includes("Authorization"), "CORS permite PATCH, Authorization e Content-Type");
const preflightPut = await fetch(B + "/clothes/r-body", {
  method: "OPTIONS",
  headers: {
    Origin: "http://localhost:8081",
    "Access-Control-Request-Method": "PUT",
    "Access-Control-Request-Headers": "authorization,content-type",
  },
});
ok(preflightPut.status === 204 && preflightPut.headers.get("access-control-allow-methods").includes("PUT"), "CORS permite PUT");
const respostaWeb = await get("/clothes");
ok(respostaWeb.status === 401 && respostaWeb.headers.get("access-control-allow-origin") === "*", "respostas de erro também têm cabeçalhos CORS");

let [s, d] = await j(await post("/auth", { email: "teste@teste.com", password: "errada" }));
ok(s === 401 && d.error, "login com senha errada -> 401 com mensagem");
[s, d] = await j(await post("/auth", { email: "teste@teste.com", password: "123456" }));
const token = d.token;
ok(s === 200 && token.split(".").length === 3, "login certo devolve token no formato JWT");
const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
ok(payload.id === "u-teste" && payload.exp > Date.now() / 1000, "token tem id e exp (validade)");

[s, d] = await j(await get("/clothes"));
ok(s === 401, "feed sem token -> 401");
[s, d] = await j(await get("/clothes", token));
ok(s === 200 && d.length === 5, "feed com token devolve 5 peças");
ok(
  d.some((r) => r.userId === null),
  "existe peça com dono nulo (teste do ponto 1)",
);
ok(
  d.every((r) => r.media[0].url.startsWith(`${B}/imagens/`)),
  "imagens com endereço completo",
);
const roupaOriginal = d.find((r) => r._id === "r-body");
let respostaPut = await put("/clothes/r-body", { title: "Body editado" });
ok((await j(respostaPut))[0] === 401, "atualização sem login -> 401");
const dadosEdicao = {
  title: "Body atualizado",
  description: "Descrição atualizada",
  size: "G",
  category: "Camiseta",
  media: [{ type: "image", url: `${B}/imagens/body.jpg` }],
  condition: "Nova",
  style: "Festa",
};
[s, d] = await j(await put("/clothes/r-body", dadosEdicao, token));
ok(
  s === 200 &&
    d._id === "r-body" &&
    d.title === dadosEdicao.title &&
    d.description === dadosEdicao.description &&
    d.size === dadosEdicao.size &&
    d.category === dadosEdicao.category &&
    d.condition === dadosEdicao.condition &&
    d.style === dadosEdicao.style &&
    d.media[0].url === dadosEdicao.media[0].url &&
    d.userId._id === "u-teste" &&
    d.likesCount === roupaOriginal.likesCount,
  "proprietário atualiza a peça e recebe resposta formatada",
);
[s, d] = await j(await put("/clothes/r-body", { title: "Somente título" }, token));
ok(
  s === 200 &&
    d.title === "Somente título" &&
    d.description === dadosEdicao.description &&
    d.media[0].url === dadosEdicao.media[0].url,
  "campos não enviados permanecem inalterados",
);
[, d] = await j(await post("/auth", { email: "ana@teste.com", password: "123456" }));
const tokenAna = d.token;
[s, d] = await j(await put("/clothes/r-body", { title: "Alteração não autorizada" }, tokenAna));
ok(s === 403 && d.error, "outra pessoa não pode atualizar a peça");
[s, d] = await j(await get("/clothes/r-body", token));
ok(s === 200 && d.title === "Somente título", "tentativa não autorizada não altera a peça");
const img = await fetch(roupaOriginal.media[0].url);
ok(
  img.status === 200 && img.headers.get("content-type") === "image/jpeg",
  "imagem de exemplo é servida",
);

[s, d] = await j(await post("/api/like/r-jaqueta", {}, token));
ok(s === 201 && d.matchCreated === true, "curtir peça da Ana gera match (Ana já curtiu o body)");
[s, d] = await j(await get("/api/matches", token));
ok(
  s === 200 && d.length === 1 && d[0].user.name === "Ana" && d[0].likedMyClothing._id === "r-body",
  "lista de matches correta",
);
[s, d] = await j(await post("/api/like/r-tenis", {}, token));
ok(d.matchCreated === false, "curtir peça do Bruno não gera match");
[s, d] = await j(await post("/api/like/r-casaco", {}, token));
ok(s === 400 && d.error, "curtir peça sem dono é recusado (400)");
[s, d] = await j(await get("/api/my-likes", token));
ok(d.length === 2 && d[0].clothingId, "minhas curtidas");
s = (
  await fetch(B + "/api/like/r-tenis", {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  })
).status;
[, d] = await j(await get("/api/my-likes", token));
ok(s === 200 && d.length === 1, "descurtir");
[s, d] = await j(await post("/api/like/r-body", {}, token));
ok(s === 400, "não pode curtir a própria peça");

// Upload no formato do app (FormData com upload_preset)
const fd = new FormData();
fd.append(
  "file",
  new Blob([await readFile(path.join(pasta, "imagens", "tenis.jpg"))], { type: "image/jpeg" }),
  "foto.jpg",
);
fd.append("upload_preset", "teste");
[s, d] = await j(
  await fetch(B + "/cloudinary/v1_1/teste/image/upload", { method: "POST", body: fd }),
);
ok(s === 200 && d.secure_url.includes("/uploads/"), "upload devolve secure_url");
const fotoUrl = d.secure_url;
ok((await fetch(fotoUrl)).status === 200, "foto enviada pode ser aberta");
const fd2 = new FormData();
fd2.append("file", new Blob(["x"]), "a.jpg");
fd2.append("upload_preset", "errado");
[s, d] = await j(
  await fetch(B + "/cloudinary/v1_1/teste/image/upload", { method: "POST", body: fd2 }),
);
ok(s === 400 && d.error.message, "preset errado -> erro no formato do Cloudinary");

[s, d] = await j(await post("/clothes", { title: "Calça", description: "" }, token));
ok(s === 400, "cadastro sem descrição -> 400");
[s, d] = await j(
  await post(
    "/clothes",
    {
      title: "Calça moletom",
      description: "Calça cinza",
      category: "Calça",
      size: "4",
      condition: "Nova",
      style: "Casual",
      media: [{ type: "image", url: fotoUrl }],
    },
    token,
  ),
);
ok(
  s === 201 && d.style === "Casual" && d.userId.name === "Pessoa Teste",
  "cadastro de peça com estilo",
);
const nova = d._id;
[s, d] = await j(await get("/my-clothes", token));
ok(d.length === 2, "Meu Closet tem 2 peças");
[s, d] = await j(await get("/clothes/" + nova, token));
ok(s === 200 && d.title === "Calça moletom", "detalhes da peça");
s = (
  await fetch(B + "/clothes/r-jaqueta", {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  })
).status;
ok(s === 403, "não pode excluir peça dos outros");
s = (
  await fetch(B + "/clothes/" + nova, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token },
  })
).status;
ok(s === 200, "excluir a própria peça");
[s, d] = await j(
  await post("/user", { name: "Nova", email: "nova@teste.com", password: "123456" }),
);
ok(s === 201, "cadastro de usuário");
[s, d] = await j(
  await post("/user", { name: "Nova", email: "nova@teste.com", password: "123456" }),
);
ok(s === 400 && d.error, "e-mail repetido -> 400");
const vencido =
  token.split(".")[0] +
  "." +
  Buffer.from(JSON.stringify({ ...payload, exp: 1 })).toString("base64url") +
  ".x";
[s, d] = await j(await get("/clothes", vencido));
ok(s === 401, "token vencido -> 401 (o app volta para o login)");

// Central de notificações: contrato, autenticação, isolamento e persistência em memória.
const patch = (p, credencial) => fetch(B + p, {
  method: "PATCH",
  headers: credencial ? { Authorization: "Bearer " + credencial } : {},
});
[s, d] = await j(await get("/api/notifications"));
ok(s === 401, "notificações sem login -> 401");
[s, d] = await j(await get("/api/notifications", vencido));
ok(s === 401, "notificações com token vencido -> 401");
[s, d] = await j(await get("/api/notifications", token));
ok(s === 200 && d.notifications.length === 3 && d.unreadCount === 2, "lista inicial tem três notificações e duas não lidas");
ok(d.notifications.every((n) => n.userId === payload.id), "lista somente notificações da pessoa autenticada");
ok(d.notifications.every((n, i, lista) => i === 0 || lista[i - 1].createdAt >= n.createdAt), "notificações da mais nova para a mais antiga");
[s, d] = await j(await patch("/api/notifications/n-curtida/read"));
ok(s === 401, "marcar notificação sem login -> 401");
[s, d] = await j(await patch("/api/notifications/n-curtida/read", vencido));
ok(s === 401, "marcar notificação com token vencido -> 401");
[s, d] = await j(await patch("/api/notifications/n-ana/read", token));
ok(s === 404, "não permite marcar notificação de outra pessoa");
[s, d] = await j(await patch("/api/notifications/inexistente/read", token));
ok(s === 404 && d.error, "notificação inexistente -> 404 com mensagem");
[s, d] = await j(await patch("/api/notifications/n-curtida/read", token));
ok(s === 200 && d.read === true, "marca notificação como lida");
[s, d] = await j(await patch("/api/notifications/n-curtida/read", token));
ok(s === 200 && d.read === true, "marcar novamente mantém a leitura (idempotência)");
[, d] = await j(await get("/api/notifications", token));
ok(d.unreadCount === 1 && d.notifications.find((n) => n._id === "n-curtida").read, "nova consulta preserva leitura e reduz contador para um");
await patch("/api/notifications/n-match/read", token);
[, d] = await j(await get("/api/notifications", token));
ok(d.unreadCount === 0 && d.notifications.every((n) => n.read), "todas lidas zeram o contador");
[, d] = await j(await post("/auth", { email: "ana@teste.com", password: "123456" }));
[, d] = await j(await get("/api/notifications", d.token));
ok(d.unreadCount === 1 && d.notifications[0]._id === "n-ana", "notificação da Ana permanece não lida");
[, d] = await j(await post("/auth", { email: "bruno@teste.com", password: "123456" }));
[s, d] = await j(await get("/api/notifications", d.token));
ok(s === 200 && d.notifications.length === 0 && d.unreadCount === 0, "conta sem notificações devolve lista vazia e contador zero");

servidor.kill();
await rm(path.join(pasta, "uploads"), { recursive: true, force: true });
console.log(falhas === 0 ? "\nTodos os testes passaram." : `\n${falhas} teste(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
