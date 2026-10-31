import AsyncStorage from "@react-native-async-storage/async-storage";
import { Sessao } from "../types/roupa";

// Persistência local com AsyncStorage (Aula 12)
// Guarda o login para a pessoa não precisar entrar de novo ao reabrir o app.
const CHAVE_SESSAO = "@revestekids:sessao";

export async function salvarSessao(sessao: Sessao) {
  try {
    await AsyncStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  } catch (error) {
    console.error("Erro ao salvar a sessão: ", error);
  }
}

export async function carregarSessao(): Promise<Sessao | null> {
  try {
    const dados = await AsyncStorage.getItem(CHAVE_SESSAO);
    if (!dados) {
      return null;
    }
    return JSON.parse(dados);
  } catch (error) {
    console.error("Erro ao carregar a sessão: ", error);
    return null;
  }
}

export async function limparSessao() {
  try {
    await AsyncStorage.removeItem(CHAVE_SESSAO);
  } catch (error) {
    console.error("Erro ao limpar a sessão: ", error);
  }
}
