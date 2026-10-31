import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import Botao from "../components/Botao";
import Campo from "../components/Campo";
import { cores } from "../constants/cores";
import { mensagemDeErro } from "../services/api";
import { cadastrar, entrar } from "../services/auth";
import { salvarSessao } from "../utils/armazenamento";
import { lerToken } from "../utils/roupas";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulário de cadastro com vários campos e validação (Aula 11)
export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);

  function validar(): boolean {
    if (nome.trim() === "" || email.trim() === "" || senha === "") {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios.");
      return false;
    }
    if (nome.trim().length < 3) {
      Alert.alert("Atenção", "O nome precisa ter pelo menos 3 letras.");
      return false;
    }
    if (!FORMATO_EMAIL.test(email.trim())) {
      Alert.alert("Atenção", "Digite um e-mail válido.");
      return false;
    }
    if (senha.length < 6) {
      Alert.alert("Atenção", "A senha precisa ter pelo menos 6 caracteres.");
      return false;
    }
    if (senha !== confirmacao) {
      Alert.alert("Atenção", "As senhas não conferem.");
      return false;
    }
    return true;
  }

  async function criarConta() {
    if (!validar()) return;

    setCarregando(true);
    try {
      await cadastrar(nome.trim(), email.trim(), senha);

      // Já entra logado depois do cadastro
      const token = await entrar(email.trim(), senha);
      const dados = lerToken(token);
      if (!dados) {
        throw new Error("Token inválido");
      }
      await salvarSessao({ token, id: dados.id, email: dados.email, nome: nome.trim() });

      Alert.alert("Conta criada!", `Bem-vindo(a), ${nome.trim()}!`);
      router.replace("/feed");
    } catch (erro) {
      Alert.alert("Não foi possível criar a conta", mensagemDeErro(erro));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitulo}>
          Crie sua conta para montar seu closet e começar a trocar.
        </Text>

        <Campo rotulo="Nome" obrigatorio value={nome} onChangeText={setNome} placeholder="Seu nome" />
        <Campo
          rotulo="E-mail"
          obrigatorio
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Campo
          rotulo="Senha"
          obrigatorio
          value={senha}
          onChangeText={setSenha}
          placeholder="Mínimo de 6 caracteres"
          secureTextEntry
        />
        <Campo
          rotulo="Confirmar senha"
          obrigatorio
          value={confirmacao}
          onChangeText={setConfirmacao}
          placeholder="Repita a senha"
          secureTextEntry
        />

        <Botao texto="Criar conta" onPress={criarConta} carregando={carregando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  subtitulo: {
    fontSize: 15,
    color: cores.textoSuave,
    marginBottom: 24,
  },
});
