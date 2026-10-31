import axios from "axios";
import { router } from "expo-router";
import { Alert } from "react-native";
import { ambiente } from "../constants/ambiente";
import { carregarSessao, limparSessao } from "../utils/armazenamento";

// Instância centralizada do axios (Aulas 13 e 14).
// O endereço vem do .env (constants/ambiente.ts).
// O tempo limite é maior porque o plano gratuito do Render pode levar
// uns 50 segundos para "acordar".
const api = axios.create({
  baseURL: ambiente.apiUrl,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Antes de cada requisição: confere a configuração e coloca o token salvo
api.interceptors.request.use(async (config) => {
  if (!ambiente.apiUrl) {
    throw new Error("O endereço da API não está configurado. Confira o arquivo .env.");
  }
  const sessao = await carregarSessao();
  if (sessao?.token) {
    config.headers.Authorization = `Bearer ${sessao.token}`;
  }
  return config;
});

// Se o servidor recusar o token (expirado ou inválido), encerra a sessão
let avisandoSessaoExpirada = false;

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro) => {
    const rota: string = erro?.config?.url || "";
    const ehLogin = rota === "/auth" || rota === "/user";

    if (erro?.response?.status === 401 && !ehLogin && !avisandoSessaoExpirada) {
      avisandoSessaoExpirada = true;
      await limparSessao();
      Alert.alert("Sessão expirada", "Faça login novamente para continuar.", [
        {
          text: "OK",
          onPress: () => {
            avisandoSessaoExpirada = false;
            if (router.canDismiss()) router.dismissAll();
            router.replace("/login");
          },
        },
      ]);
    }
    return Promise.reject(erro);
  }
);

// Transforma qualquer erro numa mensagem amigável para mostrar no Alert
export function mensagemDeErro(erro: any): string {
  if (erro?.code === "ECONNABORTED") {
    return "O servidor demorou para responder. Tente de novo em instantes.";
  }
  if (erro?.response) {
    if (erro.response.status === 401) {
      return "Sua sessão expirou. Faça login novamente.";
    }
    return erro.response.data?.error || `Erro no servidor (${erro.response.status}).`;
  }
  if (erro?.isAxiosError) {
    return "Sem conexão com o servidor. Verifique sua internet.";
  }
  // Erros gerados pelo próprio app (configuração, upload, armazenamento)
  return erro?.message || "Ocorreu um erro inesperado.";
}

export default api;
