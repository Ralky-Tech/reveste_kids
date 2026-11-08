import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { Sessao } from "../types/roupa";

export const PLATAFORMA_SUPORTADA = ["android", "ios", "web"].includes(Platform.OS);

// No navegador, a sessão dura até fechar a aba; no celular, usa o SecureStore.
// Não grava o token no localStorage persistente do navegador.
const tokenStorage = {
  async salvar(token: string) {
    if (Platform.OS === "web") sessionStorage.setItem(CHAVE_TOKEN, token);
    else await SecureStore.setItemAsync(CHAVE_TOKEN, token);
  },
  async carregar() {
    if (Platform.OS === "web") return typeof window === "undefined" ? null : sessionStorage.getItem(CHAVE_TOKEN);
    return SecureStore.getItemAsync(CHAVE_TOKEN);
  },
  async apagar() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") sessionStorage.removeItem(CHAVE_TOKEN);
    } else await SecureStore.deleteItemAsync(CHAVE_TOKEN);
  },
};

// Onde cada informação da sessão fica guardada:
// - no celular: token no SecureStore e perfil no AsyncStorage (Aula 12)
// - na web: token e perfil no sessionStorage, isolados por aba
const CHAVE_TOKEN = "revestekids_token";
const CHAVE_PERFIL = "@revestekids:perfil";

type Perfil = Omit<Sessao, "token">;

// Salva a sessão. Lança erro se não conseguir, para a tela avisar a pessoa.
export async function salvarSessao(sessao: Sessao): Promise<void> {
  if (!PLATAFORMA_SUPORTADA) {
    throw new Error("Plataforma não suportada. Use Android, iOS ou navegador web.");
  }
  const { token, ...perfil } = sessao;
  try {
    await tokenStorage.salvar(token);
    if (Platform.OS === "web") sessionStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
    else await AsyncStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
  } catch (error) {
    console.error("Erro ao salvar a sessão: ", error);
    // Não deixa uma sessão "pela metade" salva no aparelho
    await limparSessao();
    throw new Error("Não foi possível salvar o login neste aparelho.");
  }
}

// Devolve a sessão salva, ou null se não houver, se estiver incompleta ou se o token expirou
export async function carregarSessao(): Promise<Sessao | null> {
  if (!PLATAFORMA_SUPORTADA) return null;
  try {
    const [token, dadosPerfil] = await Promise.all([
      tokenStorage.carregar(),
      Platform.OS === "web"
        ? (typeof window === "undefined" ? null : sessionStorage.getItem(CHAVE_PERFIL))
        : AsyncStorage.getItem(CHAVE_PERFIL),
    ]);

    if (!token || !dadosPerfil) {
      if (token || dadosPerfil) await limparSessao(); // sessão incompleta
      return null;
    }

    const perfil: Perfil = JSON.parse(dadosPerfil);

    if (perfil.expiraEm && perfil.expiraEm <= Date.now()) {
      await limparSessao(); // token vencido
      return null;
    }

    return { token, ...perfil };
  } catch (error) {
    console.error("Erro ao carregar a sessão: ", error);
    return null;
  }
}

// Apaga a sessão. Devolve false se alguma parte não pôde ser apagada.
export async function limparSessao(): Promise<boolean> {
  if (!PLATAFORMA_SUPORTADA) return true;
  const resultados = await Promise.allSettled([
    tokenStorage.apagar(),
    apagarPerfil(),
  ]);
  const falhou = resultados.some((r) => r.status === "rejected");
  if (falhou) {
    console.error("Erro ao limpar a sessão: ", resultados);
  }
  return !falhou;
}

async function apagarPerfil() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") sessionStorage.removeItem(CHAVE_PERFIL);
  } else await AsyncStorage.removeItem(CHAVE_PERFIL);
}
