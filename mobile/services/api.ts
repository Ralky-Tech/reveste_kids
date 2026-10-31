import axios from "axios";
import { carregarSessao } from "../utils/armazenamento";

// Instância centralizada do axios (Aulas 13 e 14)
// O backend fica no Render. O tempo limite é maior porque o plano
// gratuito do Render pode levar uns 50 segundos para "acordar".
const api = axios.create({
  baseURL: "https://reveste-kids-backend.onrender.com",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Antes de cada requisição, coloca o token salvo no AsyncStorage
api.interceptors.request.use(async (config) => {
  const sessao = await carregarSessao();
  if (sessao?.token) {
    config.headers.Authorization = `Bearer ${sessao.token}`;
  }
  return config;
});

// Transforma qualquer erro numa mensagem amigável para mostrar no Alert
export function mensagemDeErro(erro: any): string {
  if (erro?.code === "ECONNABORTED") {
    return "O servidor demorou para responder. Tente de novo em instantes.";
  }
  if (!erro?.response) {
    return "Sem conexão com o servidor. Verifique sua internet.";
  }
  return erro.response.data?.error || `Erro no servidor (${erro.response.status}).`;
}

export default api;
