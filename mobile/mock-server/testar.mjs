// Testes automáticos do servidor simulado: sobe o servidor, testa as rotas usadas pelo app e desliga.
// Uso: npm run mock:testar
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pasta = path.dirname(fileURLToPath(import.meta.url));
const PORTA = 4199;
const B = `http://127.0.0.1:${PORTA}`;
const servidor = spawn(process.execPath, [path.join(pasta, "servidor.js"), `--porta=${PORTA}`], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1500));
let falhas = 0;
const j = async (r) => [r.status, await r.json().catch(() => null)];
const post = (p, corpo, token) => fetch(B + p, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(corpo) });
const get = (p, token) => fetch(B + p, { headers: token ? { Authorization: "Bearer " + token } : {} });
const ok = (cond, msg) => {
  if (!cond) falhas++;
  console.log((cond ? "OK   " : "FALHA") + " " + msg);
};

let [s, d] = await j(await post("/auth", { email: "teste@teste.com", password: "errada" }));
ok(s === 401 && d.error, "login com senha errada -> 401 com mensagem");
[s, d] = await j(await post("/auth", { email: "teste@teste.com", password: "123456" }));
const token = d.token; ok(s === 200 && token.split(".").length === 3, "login certo devolve token no formato JWT");
const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
ok(payload.id === "u-teste" && payload.exp > Date.now() / 1000, "token tem id e exp (validade)");

[s, d] = await j(await get("/clothes"));
ok(s === 401, "feed sem token -> 401");
[s, d] = await j(await get("/clothes", token));
ok(s === 200 && d.length === 5, "feed com token devolve 5 peças");
ok(d.some((r) => r.userId === null), "existe peça com dono nulo (teste do ponto 1)");
ok(d.every((r) => r.media[0].url.startsWith(`${B}/imagens/`)), "imagens com endereço completo");
const img = await fetch(d[0].media[0].url); ok(img.status === 200 && img.headers.get("content-type") === "image/jpeg", "imagem de exemplo é servida");

[s, d] = await j(await post("/api/like/r-jaqueta", {}, token));
ok(s === 201 && d.matchCreated === true, "curtir peça da Ana gera match (Ana já curtiu o body)");
[s, d] = await j(await get("/api/matches", token));
ok(s === 200 && d.length === 1 && d[0].user.name === "Ana" && d[0].likedMyClothing._id === "r-body", "lista de matches correta");
[s, d] = await j(await post("/api/like/r-tenis", {}, token));
ok(d.matchCreated === false, "curtir peça do Bruno não gera match");
[s, d] = await j(await post("/api/like/r-casaco", {}, token));
ok(s === 201 && d.matchCreated === false, "curtir peça sem dono não quebra");
[s, d] = await j(await get("/api/my-likes", token));
ok(d.length === 3 && d[0].clothingId, "minhas curtidas");
s = (await fetch(B + "/api/like/r-tenis", { method: "DELETE", headers: { Authorization: "Bearer " + token } })).status;
[, d] = await j(await get("/api/my-likes", token)); ok(s === 200 && d.length === 2, "descurtir");
[s, d] = await j(await post("/api/like/r-body", {}, token)); ok(s === 400, "não pode curtir a própria peça");

// Upload no formato do app (FormData com upload_preset)
const fd = new FormData();
fd.append("file", new Blob([await readFile(path.join(pasta, "imagens", "tenis.jpg"))], { type: "image/jpeg" }), "foto.jpg");
fd.append("upload_preset", "teste");
[s, d] = await j(await fetch(B + "/cloudinary/v1_1/teste/image/upload", { method: "POST", body: fd }));
ok(s === 200 && d.secure_url.includes("/uploads/"), "upload devolve secure_url");
const fotoUrl = d.secure_url;
ok((await fetch(fotoUrl)).status === 200, "foto enviada pode ser aberta");
const fd2 = new FormData(); fd2.append("file", new Blob(["x"]), "a.jpg"); fd2.append("upload_preset", "errado");
[s, d] = await j(await fetch(B + "/cloudinary/v1_1/teste/image/upload", { method: "POST", body: fd2 }));
ok(s === 400 && d.error.message, "preset errado -> erro no formato do Cloudinary");

[s, d] = await j(await post("/clothes", { title: "Calça", description: "" }, token));
ok(s === 400, "cadastro sem descrição -> 400");
[s, d] = await j(await post("/clothes", { title: "Calça moletom", description: "Calça cinza", category: "Calça", size: "4", condition: "Nova", style: "Casual", media: [{ type: "image", url: fotoUrl }] }, token));
ok(s === 201 && d.style === "Casual" && d.userId.name === "Pessoa Teste", "cadastro de peça com estilo");
const nova = d._id;
[s, d] = await j(await get("/my-clothes", token)); ok(d.length === 2, "Meu Closet tem 2 peças");
[s, d] = await j(await get("/clothes/" + nova, token)); ok(s === 200 && d.title === "Calça moletom", "detalhes da peça");
s = (await fetch(B + "/clothes/r-jaqueta", { method: "DELETE", headers: { Authorization: "Bearer " + token } })).status;
ok(s === 403, "não pode excluir peça dos outros");
s = (await fetch(B + "/clothes/" + nova, { method: "DELETE", headers: { Authorization: "Bearer " + token } })).status;
ok(s === 200, "excluir a própria peça");
[s, d] = await j(await post("/user", { name: "Nova", email: "nova@teste.com", password: "123456" }));
ok(s === 201, "cadastro de usuário");
[s, d] = await j(await post("/user", { name: "Nova", email: "nova@teste.com", password: "123456" }));
ok(s === 400 && d.error, "e-mail repetido -> 400");
const vencido = token.split(".")[0] + "." + Buffer.from(JSON.stringify({ ...payload, exp: 1 })).toString("base64url") + ".x";
[s, d] = await j(await get("/clothes", vencido)); ok(s === 401, "token vencido -> 401 (o app volta para o login)");

servidor.kill();
await rm(path.join(pasta, "uploads"), { recursive: true, force: true });
console.log(falhas === 0 ? "\nTodos os testes passaram." : `\n${falhas} teste(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
