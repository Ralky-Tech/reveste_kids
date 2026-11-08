import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Botao from "../components/Botao";
import { cores } from "../constants/cores";
import { sessaoExpirada } from "../services/api";
import { listarMatches, listarMinhasCurtidas } from "../services/curtidas";
import { listarMinhasRoupas } from "../services/roupas";
import { Sessao } from "../types/roupa";
import { carregarSessao, limparSessao } from "../utils/armazenamento";

// Perfil: dados salvos no AsyncStorage (Aula 12) e números da API (Aula 14)
export default function Perfil() {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [pecas, setPecas] = useState<number | null>(null);
  const [curtidas, setCurtidas] = useState<number | null>(null);
  const [matches, setMatches] = useState<number | null>(null);
  const [falhou, setFalhou] = useState(false);

  // Uma falha não vira "0": o número fica como "—" e a tela avisa
  async function carregarNumeros() {
    setFalhou(false);
    setPecas(null);
    setCurtidas(null);
    setMatches(null);
    const [r, c, m] = await Promise.allSettled([
      listarMinhasRoupas(),
      listarMinhasCurtidas(),
      listarMatches(),
    ]);
    setPecas(r.status === "fulfilled" ? r.value.length : NaN);
    setCurtidas(c.status === "fulfilled" ? c.value.length : NaN);
    setMatches(m.status === "fulfilled" ? m.value.length : NaN);
    const erros = [r, c, m].filter((x) => x.status === "rejected") as PromiseRejectedResult[];
    if (erros.length > 0 && !erros.some((e) => sessaoExpirada(e.reason))) {
      setFalhou(true);
    }
  }

  useEffect(() => {
    async function carregar() {
      setSessao(await carregarSessao());
      carregarNumeros();
    }
    carregar();
  }, []);

  function sair() {
    Alert.alert("Sair", "Deseja sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          const ok = await limparSessao();
          if (!ok) {
            Alert.alert(
              "Atenção",
              "Não foi possível apagar todos os dados do login neste aparelho. Tente sair novamente.",
            );
            return;
          }
          if (router.canDismiss()) router.dismissAll();
          router.replace("/");
        },
      },
    ]);
  }

  const nome = sessao?.nome || sessao?.email || "";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.inicial}>{nome.charAt(0).toUpperCase()}</Text>
      </View>
      {!!sessao?.nome && <Text style={styles.nome}>{sessao.nome}</Text>}
      <Text style={styles.email}>{sessao?.email}</Text>

      <View style={styles.numeros}>
        <Numero valor={pecas} rotulo="Peças" />
        <Numero valor={curtidas} rotulo="Curtidas" />
        <Numero valor={matches} rotulo="Matches" />
      </View>

      {falhou && (
        <View style={styles.aviso}>
          <Text style={styles.textoAviso}>Não foi possível carregar todos os números.</Text>
          <Botao texto="Tentar novamente" onPress={carregarNumeros} contorno />
        </View>
      )}

      <View style={styles.botoes}>
        <Botao texto="Meu Closet" onPress={() => router.push("/closet")} />
        <Botao texto="Meus matches" onPress={() => router.push("/matches")} contorno />
        <Botao texto="Sair da conta" onPress={sair} cor={cores.perigo} contorno />
      </View>
    </ScrollView>
  );
}

function Numero({ valor, rotulo }: { valor: number | null; rotulo: string }) {
  return (
    <View style={styles.numero}>
      <Text style={styles.valor}>{valor === null ? "…" : Number.isNaN(valor) ? "—" : valor}</Text>
      <Text style={styles.rotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: cores.primaria,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  inicial: {
    color: "#FFF",
    fontSize: 42,
    fontWeight: "bold",
  },
  nome: {
    fontSize: 24,
    fontWeight: "bold",
    color: cores.texto,
  },
  email: {
    color: cores.textoSuave,
    marginTop: 2,
  },
  numeros: {
    flexDirection: "row",
    backgroundColor: cores.card,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 24,
    alignSelf: "stretch",
  },
  numero: {
    flex: 1,
    alignItems: "center",
  },
  valor: {
    fontSize: 24,
    fontWeight: "bold",
    color: cores.primariaEscura,
  },
  rotulo: {
    color: cores.textoSuave,
    marginTop: 2,
  },
  aviso: {
    alignSelf: "stretch",
    marginTop: 12,
    gap: 8,
  },
  textoAviso: {
    color: cores.perigo,
    textAlign: "center",
  },
  botoes: {
    alignSelf: "stretch",
    marginTop: 28,
    gap: 12,
  },
});
