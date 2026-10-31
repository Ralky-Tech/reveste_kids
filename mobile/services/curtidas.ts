import { Match } from "../types/roupa";
import api from "./api";

// Devolve só os ids das peças que a pessoa já curtiu
export async function listarMinhasCurtidas(): Promise<string[]> {
  const resposta = await api.get("/api/my-likes");
  return resposta.data.map((curtida: any) => String(curtida.clothingId?._id || curtida.clothingId));
}

// Devolve { matchCreated: true } quando o interesse é mútuo
export async function curtir(roupaId: string) {
  const resposta = await api.post(`/api/like/${roupaId}`);
  return resposta.data;
}

export async function descurtir(roupaId: string) {
  await api.delete(`/api/like/${roupaId}`);
}

export async function listarMatches(): Promise<Match[]> {
  const resposta = await api.get("/api/matches");
  return resposta.data;
}
