import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Botao from "../components/Botao";
import { cores } from "../constants/cores";
import { Sessao } from "../types/roupa";
import { carregarSessao } from "../utils/armazenamento";

// Tela de boas-vindas (Aulas 03 a 07)
export default function Home() {
  const [sessao, setSessao] = useState<Sessao | null>(null);

  // Ao abrir o app, verifica se já existe um login salvo (useEffect + AsyncStorage)
  useEffect(() => {
    async function verificarSessao() {
      const salva = await carregarSessao();
      setSessao(salva);
    }
    verificarSessao();
  }, []);

  function iniciarAplicacao() {
    if (sessao) {
      router.replace("/feed");
    } else {
      router.push("/login");
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Image source={require("../assets/images/logo.png")} style={styles.logo} />

        <Text style={styles.titulo}>ReVeste Kids</Text>

        {/* Renderização condicional com o estado (Aula 06) */}
        {sessao ? (
          <Text style={styles.descricao}>
            Que bom te ver de novo{sessao.nome ? `, ${sessao.nome}` : ""}! Vamos ver as novidades?
          </Text>
        ) : (
          <Text style={styles.descricao}>
            Troque as roupas que já não servem nos seus filhos por outras que vão servir.
          </Text>
        )}

        <View style={styles.botao}>
          <Botao texto={sessao ? "Continuar" : "Começar"} onPress={iniciarAplicacao} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: cores.fundo,
    padding: 20,
  },
  card: {
    backgroundColor: cores.card,
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    width: "100%",
  },
  logo: {
    width: 120,
    height: 122,
    marginBottom: 20,
  },
  titulo: {
    fontSize: 34,
    fontWeight: "bold",
    color: cores.primariaEscura,
    marginBottom: 10,
  },
  descricao: {
    textAlign: "center",
    color: "#555",
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 24,
  },
  botao: {
    alignSelf: "stretch",
  },
});
