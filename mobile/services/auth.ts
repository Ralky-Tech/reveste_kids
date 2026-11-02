import api from "./api";

export async function entrar(email: string, senha: string): Promise<string> {
  const resposta = await api.post("/auth", { email, password: senha });
  return resposta.data.token;
}

export async function cadastrar(nome: string, email: string, senha: string) {
  const resposta = await api.post("/user", { name: nome, email, password: senha });
  return resposta.data;
}
