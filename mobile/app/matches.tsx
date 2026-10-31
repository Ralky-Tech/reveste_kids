import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { cores } from "../constants/cores";
import { mensagemDeErro } from "../services/api";
import { listarMatches } from "../services/curtidas";
import { Match, Roupa } from "../types/roupa";
import { capaDaRoupa } from "../utils/roupas";

// Lista de matches: quando duas pessoas curtem peças uma da outra
export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        setMatches(await listarMatches());
      } catch (e) {
        Alert.alert("Ops", mensagemDeErro(e));
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      keyExtractor={(item, indice) => item.myLikedClothing?._id + "-" + indice}
      contentContainerStyle={styles.lista}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.nome}>
            Match com {item.user?.name || item.user?.email || "usuário"}
          </Text>
          {!!item.user?.email && <Text style={styles.email}>{item.user.email}</Text>}

          <View style={styles.troca}>
            <MiniPeca titulo="Você curtiu" roupa={item.myLikedClothing} />
            <Ionicons name="swap-horizontal" size={28} color={cores.primaria} />
            <MiniPeca titulo="Curtiu a sua" roupa={item.likedMyClothing} />
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.centro}>
          <Ionicons name="heart-dislike-outline" size={56} color={cores.textoSuave} />
          <Text style={styles.vazio}>
            Nenhum match ainda. Curta peças no feed: quando alguém curtir uma peça sua de volta,
            aparece aqui.
          </Text>
        </View>
      }
    />
  );
}

function MiniPeca({ titulo, roupa }: { titulo: string; roupa: Roupa }) {
  if (!roupa) return null;
  const capa = capaDaRoupa(roupa);
  return (
    <Pressable style={styles.peca} onPress={() => router.push(`/roupas/${roupa._id}`)}>
      <Text style={styles.rotulo}>{titulo}</Text>
      {capa ? (
        <Image source={{ uri: capa }} style={styles.foto} />
      ) : (
        <View style={[styles.foto, { backgroundColor: "#EDE4FE" }]} />
      )}
      <Text style={styles.titulo} numberOfLines={1}>
        {roupa.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  lista: {
    padding: 16,
    flexGrow: 1,
  },
  card: {
    backgroundColor: cores.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  nome: {
    fontSize: 18,
    fontWeight: "bold",
    color: cores.texto,
  },
  email: {
    color: cores.primariaEscura,
    marginTop: 2,
  },
  troca: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  peca: {
    width: "40%",
    alignItems: "center",
  },
  rotulo: {
    fontSize: 12,
    color: cores.textoSuave,
    marginBottom: 6,
  },
  foto: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  titulo: {
    marginTop: 6,
    fontWeight: "bold",
    color: cores.texto,
  },
  vazio: {
    marginTop: 12,
    textAlign: "center",
    color: cores.textoSuave,
    fontSize: 15,
    lineHeight: 22,
  },
});
