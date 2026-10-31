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

// Lê o id e o e-mail de dentro do token JWT
export function lerToken(token: string): { id: string; email: string } | null {
  try {
    let parte = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (parte.length % 4 !== 0) parte += "=";
    const dados = JSON.parse(atob(parte));
    return { id: dados.id, email: dados.email };
  } catch {
    return null;
  }
}
