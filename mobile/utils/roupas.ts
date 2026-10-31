import { Roupa } from "../types/roupa";

// Id do dono da peça. A API pode mandar o objeto do usuário, só o id,
// ou nulo (quando a conta do dono foi apagada).
export function idDoDono(roupa: Roupa): string {
  const dono = roupa?.userId;
  if (!dono) return "";
  if (typeof dono === "string") return dono;
  return dono._id || "";
}

export function nomeDoDono(roupa: Roupa): string {
  const dono = roupa?.userId;
  if (dono && typeof dono === "object") {
    return dono.name || dono.email || "Usuário";
  }
  return "Usuário";
}

// Primeira imagem da peça. Para vídeo, o Cloudinary gera uma miniatura trocando a extensão por .jpg
export function capaDaRoupa(roupa: Roupa): string | null {
  const primeira = roupa?.media?.[0];
  if (!primeira) return null;
  return primeira.type === "video" ? primeira.url.replace(/\.[^./]+$/, ".jpg") : primeira.url;
}

// Lê o id, o e-mail e a validade (exp) de dentro do token JWT
export function lerToken(
  token: string
): { id: string; email: string; expiraEm?: number } | null {
  try {
    let parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (parte.length % 4 !== 0) parte += "=";
    const dados = JSON.parse(atob(parte));
    if (!dados.id) return null;
    if (dados.exp && dados.exp * 1000 <= Date.now()) return null; // já vencido
    return {
      id: dados.id,
      email: dados.email,
      expiraEm: dados.exp ? dados.exp * 1000 : undefined,
    };
  } catch {
    return null;
  }
}
