import { ListaNotificacoes, Notificacao } from "../types/notificacao";
import api from "./api";

export async function listarNotificacoes(): Promise<ListaNotificacoes> {
  const resposta = await api.get<ListaNotificacoes>("/api/notifications");
  return resposta.data;
}

export async function marcarComoLida(id: string): Promise<Notificacao> {
  const resposta = await api.patch<Notificacao>(`/api/notifications/${encodeURIComponent(id)}/read`);
  return resposta.data;
}
