import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import RoupaCard from "../components/RoupaCard";
import { cores } from "../constants/cores";
import { mensagemDeErro } from "../services/api";
import { curtir, descurtir, listarMinhasCurtidas } from "../services/curtidas";
import { listarRoupas } from "../services/roupas";
import { Roupa } from "../types/roupa";
import { carregarSessao } from "../utils/armazenamento";
import { idDoDono } from "../utils/roupas";

// Feed com as peças dos outros usuários (Aulas 10 e 14)
export default function Feed() {
  const [roupas, setRoupas] = useState<Roupa[]>([]);
  const [curtidas, setCurtidas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregarFeed() {
    try {
      setErro("");
      const sessao = await carregarSessao();
      const [todas, minhasCurtidas] = await Promise.all([listarRoupas(), listarMinhasCurtidas()]);

      // Mostra só as peças dos outros, da mais nova para a mais antiga
      const dosOutros = todas
        .filter((roupa) => idDoDono(roupa) !== sessao?.id)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      setRoupas(dosOutros);
      setCurtidas(minhasCurtidas);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  // Igual ao useEffect da Aula 07, mas roda toda vez que a tela volta a aparecer
  // (por exemplo, depois de cadastrar uma peça)
  useFocusEffect(
    useCallback(() => {
      carregarFeed();
    }, [])
  );

  async function alternarCurtida(roupa: Roupa) {
    const jaCurtiu = curtidas.includes(roupa._id);
    try {
      if (jaCurtiu) {
        await descurtir(roupa._id);
        setCurtidas(curtidas.filter((id) => id !== roupa._id));
      } else {
        const resposta = await curtir(roupa._id);
        setCurtidas([...curtidas, roupa._id]);

        if (resposta?.matchCreated) {
          Alert.alert("Deu match! 🎉", "Vocês têm interesse nas peças um do outro.", [
            { text: "Depois" },
            { text: "Ver matches", onPress: () => router.push("/matches") },
          ]);
        }
      }

      // Atualiza o contador de curtidas da peça na tela
      setRoupas(
        roupas.map((r) =>
          r._id === roupa._id
            ? { ...r, likesCount: Math.max((r.likesCount || 0) + (jaCurtiu ? -1 : 1), 0) }
            : r
        )
      );
    } catch (e) {
      Alert.alert("Ops", mensagemDeErro(e));
    }
  }

  return (
    <View style={styles.container}>
      {/* Botões no cabeçalho */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.acoes}>
              <IconeCabecalho icone="add-circle-outline" onPress={() => router.push("/roupas/nova")} />
              <IconeCabecalho icone="shirt-outline" onPress={() => router.push("/closet")} />
              <IconeCabecalho icone="person-circle-outline" onPress={() => router.push("/perfil")} />
            </View>
          ),
        }}
      />

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <Text style={styles.aviso}>Carregando peças…</Text>
          <Text style={styles.avisoMenor}>
            Na primeira vez pode demorar até um minuto, enquanto o servidor acorda.
          </Text>
        </View>
      ) : (
        <FlatList
          data={roupas}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <RoupaCard
              roupa={item}
              curtida={curtidas.includes(item._id)}
              onCurtir={() => alternarCurtida(item)}
              onAbrir={() => router.push(`/roupas/${item._id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              colors={[cores.primaria]}
              onRefresh={() => {
                setAtualizando(true);
                carregarFeed();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.centro}>
              <Ionicons name="shirt-outline" size={56} color={cores.textoSuave} />
              <Text style={styles.aviso}>{erro || "Ainda não há peças por aqui."}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function IconeCabecalho({ icone, onPress }: { icone: any; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [{ marginLeft: 14 }, pressed && { opacity: 0.5 }]}>
      <Ionicons name={icone} size={27} color={cores.primariaEscura} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  lista: {
    padding: 16,
    flexGrow: 1,
  },
  acoes: {
    flexDirection: "row",
  },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  aviso: {
    marginTop: 12,
    fontSize: 16,
    color: cores.texto,
    textAlign: "center",
  },
  avisoMenor: {
    marginTop: 6,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: "center",
  },
});
