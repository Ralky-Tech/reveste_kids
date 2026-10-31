import { Roupa } from "../types/roupa";

// Id do dono da peça (a API às vezes manda o objeto do usuário, às vezes só o id)
export function idDoDono(roupa: Roupa): string {
  return typeof roupa.userId === "object" ? roupa.userId._id : roupa.userId;
}

export function nomeDoDono(roupa: Roupa): string {
  if (typeof roupa.userId === "object") {
    return roupa.userId.name || roupa.userId.email || "Usuário";
  }
  return "Usuário";
}

// Primeira imagem da peça. Para vídeo, o Cloudinary gera uma miniatura trocando a extensão por .jpg
export function capaDaRoupa(roupa: Roupa): string | null {
  const primeira = roupa.media?.[0];
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
