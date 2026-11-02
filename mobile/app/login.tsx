import { Link, router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import Botao from "../components/Botao";
import Campo from "../components/Campo";
import { cores } from "../constants/cores";
import { mensagemDeErro } from "../services/api";
import { entrar } from "../services/auth";
import { salvarSessao } from "../utils/armazenamento";
import { lerToken } from "../utils/roupas";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Formulário de login com validação (Aula 11)
export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function fazerLogin() {
    // Validação dos campos
    if (email.trim() === "" || senha === "") {
      Alert.alert("Atenção", "Preencha o e-mail e a senha.");
      return;
    }
    if (!FORMATO_EMAIL.test(email.trim())) {
      Alert.alert("Atenção", "Digite um e-mail válido.");
      return;
    }

    setCarregando(true);
    try {
      const token = await entrar(email.trim(), senha);
      const dados = lerToken(token);
      if (!dados) {
        throw new Error("O servidor devolveu um login inválido. Tente novamente.");
      }
      await salvarSessao({ token, ...dados });
      router.replace("/feed");
    } catch (erro: any) {
      Alert.alert("Não foi possível entrar", mensagemDeErro(erro));
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
        <Text style={styles.titulo}>Bem-vindo de volta!</Text>
        <Text style={styles.subtitulo}>Entre com a mesma conta que você usa no site.</Text>

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
          placeholder="Sua senha"
          secureTextEntry
        />

        <Botao texto="Entrar" onPress={fazerLogin} carregando={carregando} />

        <Text style={styles.rodape}>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" style={styles.link}>
            Cadastre-se
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: "center",
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    color: cores.primariaEscura,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 15,
    color: cores.textoSuave,
    marginBottom: 24,
  },
  rodape: {
    textAlign: "center",
    marginTop: 20,
    color: cores.textoSuave,
    fontSize: 15,
  },
  link: {
    color: cores.primaria,
    fontWeight: "bold",
  },
});
