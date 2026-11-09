import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Botao from "../../components/Botao";
import { cores } from "../../constants/cores";
import { mensagemDeErro, sessaoExpirada } from "../../services/api";
import { listarRoupas } from "../../services/roupas";
import { Roupa } from "../../types/roupa";
import { capaDaRoupa, idDoDono } from "../../utils/roupas";

export default function ClosetPublico() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [nome, setNome] = useState("Usuário");
  const [roupas, setRoupas] = useState<Roupa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async (aoAtualizar = false) => {
    if (aoAtualizar) setAtualizando(true);
    else setCarregando(true);
    setErro("");
    try {
      const todas = await listarRoupas();
      const doCloset = todas.filter((roupa) => idDoDono(roupa) === id);
      const dono = doCloset[0]?.userId;
      setNome(
        dono && typeof dono === "object"
          ? dono.name || dono.email?.split("@")[0] || "Usuário"
          : "Usuário",
      );
      setRoupas(doCloset);
    } catch (e) {
      setRoupas([]);
      if (!sessaoExpirada(e)) setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void carregar(); }, [carregar]));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Closet público" }} />
      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <Text style={styles.subtexto}>Carregando peças...</Text>
        </View>
      ) : erro ? (
        <View style={styles.centro}>
          <Ionicons name="cloud-offline-outline" size={48} color={cores.textoSuave} />
          <Text style={styles.aviso}>{erro}</Text>
          <Botao texto="Tentar novamente" onPress={() => void carregar()} />
        </View>
      ) : (
        <FlatList
          data={roupas}
          keyExtractor={(roupa) => roupa._id}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={() => void carregar(true)} tintColor={cores.primaria} />
          }
          ListHeaderComponent={
            <View style={styles.cabecalho}>
              <Text style={styles.titulo}>Closet de {nome}</Text>
              <Text style={styles.subtexto}>
                {roupas.length} {roupas.length === 1 ? "peça disponível" : "peças disponíveis"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const capa = capaDaRoupa(item);
            return (
              <Pressable
                style={({ pressed }) => [styles.cartao, pressed && styles.pressionado]}
                onPress={() => router.push({ pathname: "/roupas/[id]", params: { id: item._id } })}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes de ${item.title}`}
              >
                {capa ? (
                  <Image source={{ uri: capa }} style={styles.foto} />
                ) : (
                  <View style={[styles.foto, styles.semFoto]}>
                    <Ionicons name="shirt-outline" size={28} color={cores.textoSuave} />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.nomePeca} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.subtexto} numberOfLines={2}>
                    {[item.category, item.size && `Tam. ${item.size}`, item.condition]
                      .filter(Boolean).join(" · ") || "Sem detalhes"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={cores.primariaEscura} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centro}>
              <Ionicons name="shirt-outline" size={48} color={cores.textoSuave} />
              <Text style={styles.aviso}>Este closet não foi encontrado ou não possui peças disponíveis.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lista: { flexGrow: 1, padding: 16 },
  cabecalho: { marginBottom: 18 },
  titulo: { fontSize: 24, fontWeight: "bold", color: cores.texto },
  subtexto: { color: cores.textoSuave, marginTop: 6 },
  cartao: {
    flexDirection: "row", alignItems: "center", backgroundColor: cores.card,
    padding: 10, borderRadius: 14, marginBottom: 12, gap: 12,
  },
  pressionado: { opacity: 0.75 },
  foto: { width: 78, height: 86, borderRadius: 9 },
  semFoto: { alignItems: "center", justifyContent: "center", backgroundColor: "#EDE4FE" },
  info: { flex: 1 },
  nomePeca: { color: cores.texto, fontWeight: "bold", fontSize: 16 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  aviso: { color: cores.texto, fontSize: 16, textAlign: "center" },
});
