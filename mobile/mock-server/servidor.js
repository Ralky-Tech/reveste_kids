// Servidor simulado (mock) do backend e do upload de fotos.
// Serve para testar o app no Android com dados de exemplo, sem acessar a produção.
// Usa apenas módulos do próprio Node.js: não precisa instalar nada.
//
// Como usar:  npm run mock
// Opções:     --porta=4000  --token-minutos=120  --falhar=upload|cadastro
//
// Os dados ficam só na memória: ao reiniciar o servidor, tudo volta ao estado inicial.

const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

// ---------------------------------------------------------------------------
// Opções da linha de comando
// ---------------------------------------------------------------------------
function opcao(nome, padrao) {
  const arg = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return arg ? arg.split("=")[1] : padrao;
}

const PORTA = Number(opcao("porta", 4000));
const TOKEN_MINUTOS = Number(opcao("token-minutos", 120));
const FALHAR = opcao("falhar", ""); // "upload" ou "cadastro", para testar o tratamento de erros
const PRESET = "teste"; // valor esperado em EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

const PASTA_IMAGENS = path.join(__dirname, "imagens");
const PASTA_UPLOADS = path.join(__dirname, "uploads");
fs.mkdirSync(PASTA_UPLOADS, { recursive: true });

// ---------------------------------------------------------------------------
// Dados de exemplo
// ---------------------------------------------------------------------------
const novoId = () => crypto.randomBytes(12).toString("hex");
const agora = () => new Date().toISOString();

const usuarios = [
  { _id: "u-teste", name: "Pessoa Teste", email: "teste@teste.com", password: "123456" },
  { _id: "u-ana", name: "Ana", email: "ana@teste.com", password: "123456" },
  { _id: "u-bruno", name: "Bruno", email: "bruno@teste.com", password: "123456" },
];

const roupas = [
  {
    _id: "r-jaqueta",
    title: "Jaqueta jeans",
    description: "Jaqueta jeans azul, pouco usada. Serviu por um inverno.",
    category: "Casaco",
    size: "6",
    condition: "Seminova",
    style: "Casual",
    media: [{ type: "image", url: "/imagens/jaqueta.jpg" }],
    userId: "u-ana",
    createdAt: "2026-10-30T10:00:00.000Z",
  },
  {
    _id: "r-vestido",
    title: "Vestido floral",
    description: "Vestido de festa com estampa floral.",
    category: "Vestido",
    size: "4",
    condition: "Nova",
    style: "Festa",
    media: [{ type: "image", url: "/imagens/vestido.jpg" }],
    userId: "u-ana",
    createdAt: "2026-10-29T10:00:00.000Z",
  },
  {
    _id: "r-tenis",
    title: "Tênis infantil",
    description: "Tênis número 28, solado em bom estado.",
    category: "Calçado",
    size: "8",
    condition: "Usada",
    style: "Esporte",
    media: [{ type: "image", url: "/imagens/tenis.jpg" }],
    userId: "u-bruno",
    createdAt: "2026-10-28T10:00:00.000Z",
  },
  {
    // Peça cujo dono teve a conta apagada: testa o tratamento de dono nulo
    _id: "r-casaco",
    title: "Casaco de lã (dono removido)",
    description: "Peça de teste sem dono, para conferir que o feed não trava.",
    category: "Casaco",
    size: "10",
    condition: "Seminova",
    style: "Inverno",
    media: [{ type: "image", url: "/imagens/casaco.jpg" }],
    userId: null,
    createdAt: "2026-10-27T10:00:00.000Z",
  },
  {
    _id: "r-body",
    title: "Body listrado",
    description: "Body de algodão, tamanho M.",
    category: "Body",
    size: "M",
    condition: "Seminova",
    style: "Casual",
    media: [{ type: "image", url: "/imagens/body.jpg" }],
    userId: "u-teste",
    createdAt: "2026-10-26T10:00:00.000Z",
  },
];

// A Ana já curtiu a peça da Pessoa Teste: se a Pessoa Teste curtir uma peça da Ana, dá match
const curtidas = [{ userId: "u-ana", clothingId: "r-body" }];

// ---------------------------------------------------------------------------
// Token simulado (mesmo formato de um JWT, mas sem assinatura válida)
// ---------------------------------------------------------------------------
const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");

function gerarToken(usuario) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_MINUTOS * 60;
  const payload = { id: usuario._id, email: usuario.email, role: "user", exp };
  return `${base64url({ alg: "none", typ: "JWT" })}.${base64url(payload)}.simulado`;
}

function usuarioDoToken(req) {
  const cabecalho = req.headers.authorization || "";
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;
    return usuarios.find((u) => u._id === payload.id) || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Funções de apoio
// ---------------------------------------------------------------------------
function enderecoBase(req) {
  return `http://${req.headers.host}`;
}

function urlCompleta(req, url) {
  return url.startsWith("/") ? enderecoBase(req) + url : url;
}

// Monta a peça como a API real devolve: dono "populado" e contagem de curtidas
function formatarRoupa(req, roupa) {
  const dono = usuarios.find((u) => u._id === roupa.userId);
  return {
    ...roupa,
    userId: dono ? { _id: dono._id, name: dono.name, email: dono.email } : null,
    media: roupa.media.map((m) => ({ ...m, url: urlCompleta(req, m.url) })),
    likesCount: curtidas.filter((c) => c.clothingId === roupa._id).length,
  };
}

function responder(res, status, dados) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(dados));
}

function lerJson(req) {
  return new Promise((resolve) => {
    let corpo = "";
    req.on("data", (parte) => (corpo += parte));
    req.on("end", () => {
      try {
        resolve(corpo ? JSON.parse(corpo) : {});
      } catch {
        resolve(null);
      }
    });
  });
}

function servirArquivo(res, pasta, nome) {
  const caminho = path.join(pasta, path.basename(nome));
  if (!fs.existsSync(caminho)) return responder(res, 404, { error: "Arquivo não encontrado" });
  res.writeHead(200, { "Content-Type": "image/jpeg" });
  fs.createReadStream(caminho).pipe(res);
}

function log(req, status) {
  console.log(`${new Date().toLocaleTimeString("pt-BR")}  ${req.method} ${req.url} -> ${status}`);
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------
async function rotear(req, res) {
  const url = new URL(req.url, enderecoBase(req));
  const partes = url.pathname.split("/").filter(Boolean);
  const metodo = req.method;

  // Arquivos de imagem
  if (metodo === "GET" && partes[0] === "imagens") return servirArquivo(res, PASTA_IMAGENS, partes[1]);
  if (metodo === "GET" && partes[0] === "uploads") return servirArquivo(res, PASTA_UPLOADS, partes[1]);

  // Cadastro de usuário
  if (metodo === "POST" && url.pathname === "/user") {
    const corpo = await lerJson(req);
    if (!corpo?.name || !corpo?.email || !corpo?.password) {
      return responder(res, 400, { error: "Preencha nome, e-mail e senha." });
    }
    if (usuarios.some((u) => u.email === corpo.email)) {
      return responder(res, 400, { error: "Este e-mail já está cadastrado." });
    }
    usuarios.push({ _id: novoId(), name: corpo.name, email: corpo.email, password: corpo.password });
    return responder(res, 201, { message: "Usuário criado com sucesso." });
  }

  // Login
  if (metodo === "POST" && url.pathname === "/auth") {
    const corpo = await lerJson(req);
    const usuario = usuarios.find((u) => u.email === corpo?.email && u.password === corpo?.password);
    if (!usuario) return responder(res, 401, { error: "E-mail ou senha inválidos." });
    return responder(res, 200, { token: gerarToken(usuario) });
  }

  // Upload simulado no formato do Cloudinary: /cloudinary/v1_1/<conta>/image/upload
  if (metodo === "POST" && partes[0] === "cloudinary" && partes.at(-1) === "upload") {
    if (FALHAR === "upload") {
      return responder(res, 500, { error: { message: "Falha simulada no upload" } });
    }
    const requisicao = new Request(url, {
      method: "POST",
      headers: req.headers,
      body: req,
      duplex: "half",
    });
    let formulario;
    try {
      formulario = await requisicao.formData();
    } catch {
      return responder(res, 400, { error: { message: "Formulário de upload inválido" } });
    }
    if (formulario.get("upload_preset") !== PRESET) {
      return responder(res, 400, { error: { message: "Upload preset inválido" } });
    }
    const arquivo = formulario.get("file");
    if (!arquivo || typeof arquivo === "string") {
      return responder(res, 400, { error: { message: "Nenhum arquivo enviado" } });
    }
    const bytes = Buffer.from(await arquivo.arrayBuffer());
    if (bytes.length > TAMANHO_MAXIMO) {
      return responder(res, 400, { error: { message: "Arquivo maior que 10 MB" } });
    }
    const nome = `${novoId()}.jpg`;
    fs.writeFileSync(path.join(PASTA_UPLOADS, nome), bytes);
    return responder(res, 200, { secure_url: `${enderecoBase(req)}/uploads/${nome}` });
  }

  // Daqui para baixo, todas as rotas exigem login
  const usuario = usuarioDoToken(req);
  if (!usuario) return responder(res, 401, { error: "Token inválido ou expirado." });

  // Peças
  if (metodo === "GET" && url.pathname === "/clothes") {
    return responder(res, 200, roupas.map((r) => formatarRoupa(req, r)));
  }
  if (metodo === "GET" && url.pathname === "/my-clothes") {
    const minhas = roupas.filter((r) => r.userId === usuario._id);
    return responder(res, 200, minhas.map((r) => formatarRoupa(req, r)));
  }
  if (metodo === "POST" && url.pathname === "/clothes") {
    if (FALHAR === "cadastro") {
      return responder(res, 500, { error: "Falha simulada ao cadastrar a peça." });
    }
    const corpo = await lerJson(req);
    if (!corpo?.title || !corpo?.description) {
      return responder(res, 400, { error: "Título e descrição são obrigatórios." });
    }
    const roupa = {
      _id: novoId(),
      title: corpo.title,
      description: corpo.description,
      category: corpo.category || "",
      size: corpo.size || "",
      condition: corpo.condition || "",
      style: corpo.style || "",
      media: Array.isArray(corpo.media) ? corpo.media : [],
      userId: usuario._id,
      createdAt: agora(),
    };
    roupas.push(roupa);
    return responder(res, 201, formatarRoupa(req, roupa));
  }
  if (partes[0] === "clothes" && partes[1]) {
    const roupa = roupas.find((r) => r._id === partes[1]);
    if (!roupa) return responder(res, 404, { error: "Peça não encontrada." });
    if (metodo === "GET") return responder(res, 200, formatarRoupa(req, roupa));
    if (metodo === "DELETE") {
      if (roupa.userId !== usuario._id) {
        return responder(res, 403, { error: "Você só pode excluir as suas peças." });
      }
      roupas.splice(roupas.indexOf(roupa), 1);
      return responder(res, 200, { message: "Peça excluída." });
    }
  }

  // Curtidas e matches
  if (metodo === "GET" && url.pathname === "/api/my-likes") {
    const minhas = curtidas.filter((c) => c.userId === usuario._id);
    return responder(res, 200, minhas.map((c) => ({ clothingId: c.clothingId })));
  }
  if (partes[0] === "api" && partes[1] === "like" && partes[2]) {
    const roupa = roupas.find((r) => r._id === partes[2]);
    if (!roupa) return responder(res, 404, { error: "Peça não encontrada." });

    if (metodo === "POST") {
      if (roupa.userId === usuario._id) {
        return responder(res, 400, { error: "Você não pode curtir a sua própria peça." });
      }
      if (!curtidas.some((c) => c.userId === usuario._id && c.clothingId === roupa._id)) {
        curtidas.push({ userId: usuario._id, clothingId: roupa._id });
      }
      // Match: o dono da peça já curtiu alguma peça de quem curtiu agora
      const matchCreated =
        !!roupa.userId &&
        curtidas.some(
          (c) =>
            c.userId === roupa.userId &&
            roupas.some((r) => r._id === c.clothingId && r.userId === usuario._id)
        );
      return responder(res, 201, { message: "Curtida registrada.", matchCreated });
    }
    if (metodo === "DELETE") {
      const indice = curtidas.findIndex(
        (c) => c.userId === usuario._id && c.clothingId === roupa._id
      );
      if (indice >= 0) curtidas.splice(indice, 1);
      return responder(res, 200, { message: "Curtida removida." });
    }
  }
  if (metodo === "GET" && url.pathname === "/api/matches") {
    const matches = [];
    for (const minha of curtidas.filter((c) => c.userId === usuario._id)) {
      const roupaDoOutro = roupas.find((r) => r._id === minha.clothingId);
      if (!roupaDoOutro?.userId) continue;
      const curtidaDeVolta = curtidas.find(
        (c) =>
          c.userId === roupaDoOutro.userId &&
          roupas.some((r) => r._id === c.clothingId && r.userId === usuario._id)
      );
      if (!curtidaDeVolta) continue;
      const outro = usuarios.find((u) => u._id === roupaDoOutro.userId);
      const minhaRoupa = roupas.find((r) => r._id === curtidaDeVolta.clothingId);
      matches.push({
        user: { _id: outro._id, name: outro.name, email: outro.email },
        myLikedClothing: formatarRoupa(req, roupaDoOutro),
        likedMyClothing: formatarRoupa(req, minhaRoupa),
      });
    }
    return responder(res, 200, matches);
  }

  return responder(res, 404, { error: "Rota não encontrada no servidor simulado." });
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
const servidor = http.createServer(async (req, res) => {
  res.on("finish", () => log(req, res.statusCode));
  try {
    await rotear(req, res);
  } catch (erro) {
    console.error(erro);
    if (!res.headersSent) responder(res, 500, { error: "Erro interno no servidor simulado." });
  }
});

servidor.listen(PORTA, "0.0.0.0", () => {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i.address);
  const ip = ips[0] || "SEU-IP";

  console.log("\nServidor simulado do ReVeste Kids rodando.");
  console.log(`Token válido por ${TOKEN_MINUTOS} minuto(s).${FALHAR ? ` Falha simulada: ${FALHAR}.` : ""}`);
  console.log("\nUse no arquivo .env (troque o IP se o celular estiver em outra rede):\n");
  console.log(`EXPO_PUBLIC_API_URL=http://${ip}:${PORTA}`);
  console.log(`EXPO_PUBLIC_CLOUDINARY_API_URL=http://${ip}:${PORTA}/cloudinary`);
  console.log("EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=teste");
  console.log(`EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=${PRESET}`);
  if (ips.length > 1) console.log(`\nOutros IPs deste computador: ${ips.slice(1).join(", ")}`);
  console.log("\nContas de teste (senha 123456): teste@teste.com, ana@teste.com, bruno@teste.com");
  console.log("Para parar o servidor: Ctrl + C\n");
});
