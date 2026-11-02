import { Roupa } from "../types/roupa";
import api from "./api";

// Funções de acesso à API REST de peças (Aula 14)

export async function listarRoupas(): Promise<Roupa[]> {
  const resposta = await api.get("/clothes");
  return resposta.data;
}

export async function buscarRoupa(id: string): Promise<Roupa> {
  const resposta = await api.get(`/clothes/${id}`);
  return resposta.data;
}

export async function listarMinhasRoupas(): Promise<Roupa[]> {
  const resposta = await api.get("/my-clothes");
  return resposta.data;
}

export async function criarRoupa(roupa: Omit<Roupa, "_id" | "userId">) {
  const resposta = await api.post("/clothes", roupa);
  return resposta.data;
}

export async function excluirRoupa(id: string) {
  await api.delete(`/clothes/${id}`);
}
