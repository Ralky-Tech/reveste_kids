import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { Sessao } from "../types/roupa";

// O app é somente Android e iOS: o SecureStore não existe no navegador.
export const PLATAFORMA_SUPORTADA = Platform.OS === "android" || Platform.OS === "ios";

// Onde cada informação da sessão fica guardada:
// - token JWT: SecureStore (armazenamento criptografado do sistema)
// - dados do perfil (id, e-mail, nome, validade): AsyncStorage (Aula 12), pois não são secretos
const CHAVE_TOKEN = "revestekids_token";
const CHAVE_PERFIL = "@revestekids:perfil";

type Perfil = Omit<Sessao, "token">;

// Salva a sessão. Lança erro se não conseguir, para a tela avisar a pessoa.
export async function salvarSessao(sessao: Sessao): Promise<void> {
  if (!PLATAFORMA_SUPORTADA) {
    throw new Error("O ReVeste Kids mobile funciona apenas no Android e no iOS.");
  }
  const { token, ...perfil } = sessao;
  try {
    await SecureStore.setItemAsync(CHAVE_TOKEN, token);
    await AsyncStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
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
      SecureStore.getItemAsync(CHAVE_TOKEN),
      AsyncStorage.getItem(CHAVE_PERFIL),
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
    SecureStore.deleteItemAsync(CHAVE_TOKEN),
    AsyncStorage.removeItem(CHAVE_PERFIL),
  ]);
  const falhou = resultados.some((r) => r.status === "rejected");
  if (falhou) {
    console.error("Erro ao limpar a sessão: ", resultados);
  }
  return !falhou;
}
