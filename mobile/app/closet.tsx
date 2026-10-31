import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Botao from "../components/Botao";
import { cores } from "../constants/cores";
import { mensagemDeErro } from "../services/api";
import { excluirRoupa, listarMinhasRoupas } from "../services/roupas";
import { Roupa } from "../types/roupa";
import { capaDaRoupa } from "../utils/roupas";

interface Secao {
  title: string;
  data: Roupa[];
}

// Agrupa as peças por categoria para a SectionList (Aula 10)
function agruparPorCategoria(roupas: Roupa[]): Secao[] {
  const grupos: Record<string, Roupa[]> = {};
  for (const roupa of roupas) {
    const categoria = roupa.category || "Sem categoria";
    if (!grupos[categoria]) grupos[categoria] = [];
    grupos[categoria].push(roupa);
  }
  return Object.keys(grupos)
    .sort()
    .map((categoria) => ({ title: categoria, data: grupos[categoria] }));
}

// Meu Closet: peças da pessoa agrupadas por categoria
export default function Closet() {
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const roupas = await listarMinhasRoupas();
      setSecoes(agruparPorCategoria(roupas));
      setTotal(roupas.length);
    } catch (e) {
      Alert.alert("Ops", mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  function confirmarExclusao(roupa: Roupa) {
    Alert.alert("Excluir peça", `Excluir "${roupa.title}" do seu closet?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await excluirRoupa(roupa._id);
            carregar();
          } catch (e) {
            Alert.alert("Ops", mensagemDeErro(e));
          }
        },
      },
    ]);
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <SectionList
      sections={secoes}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.lista}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <Text style={styles.resumo}>
          {total} {total === 1 ? "peça cadastrada" : "peças cadastradas"} · segure uma peça para
          excluir
        </Text>
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.cabecalho}>
          {section.title} ({section.data.length})
        </Text>
      )}
      renderItem={({ item }) => {
        const capa = capaDaRoupa(item);
        return (
          <Pressable
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/roupas/${item._id}`)}
            onLongPress={() => confirmarExclusao(item)}
          >
            {capa ? (
              <Image source={{ uri: capa }} style={styles.foto} />
            ) : (
              <View style={[styles.foto, styles.semFoto]}>
                <Ionicons name="shirt-outline" size={24} color={cores.textoSuave} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.detalhe}>
                {[item.size && `Tam. ${item.size}`, item.condition].filter(Boolean).join(" · ") ||
                  "Sem detalhes"}
              </Text>
            </View>
            <View style={styles.curtidas}>
              <Ionicons name="heart" size={16} color={cores.curtida} />
              <Text style={styles.numero}>{item.likesCount || 0}</Text>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <View style={styles.vazio}>
          <Ionicons name="shirt-outline" size={56} color={cores.textoSuave} />
          <Text style={styles.textoVazio}>Seu closet está vazio.</Text>
          <Botao texto="Cadastrar a primeira peça" onPress={() => router.push("/roupas/nova")} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lista: {
    padding: 16,
    flexGrow: 1,
  },
  resumo: {
    color: cores.textoSuave,
    marginBottom: 8,
  },
  cabecalho: {
    fontSize: 18,
    fontWeight: "bold",
    color: cores.primariaEscura,
    marginTop: 16,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: cores.card,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  foto: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 12,
  },
  semFoto: {
    backgroundColor: "#EDE4FE",
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: cores.texto,
  },
  detalhe: {
    color: cores.textoSuave,
    marginTop: 2,
  },
  curtidas: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  numero: {
    marginLeft: 4,
    color: cores.textoSuave,
    fontWeight: "bold",
  },
  vazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  textoVazio: {
    fontSize: 16,
    color: cores.texto,
  },
});
