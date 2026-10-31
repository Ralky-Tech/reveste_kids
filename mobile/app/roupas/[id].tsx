import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Botao from "../../components/Botao";
import Etiqueta from "../../components/Etiqueta";
import { cores } from "../../constants/cores";
import { mensagemDeErro } from "../../services/api";
import { curtir, descurtir, listarMinhasCurtidas } from "../../services/curtidas";
import { buscarRoupa, excluirRoupa } from "../../services/roupas";
import { Roupa } from "../../types/roupa";
import { carregarSessao } from "../../utils/armazenamento";
import { idDoDono, nomeDoDono } from "../../utils/roupas";

// Detalhes de uma peça: recebe o id pela rota (Aula 08 — parâmetros)
export default function DetalhesRoupa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();

  const [roupa, setRoupa] = useState<Roupa | null>(null);
  const [curtida, setCurtida] = useState(false);
  const [minha, setMinha] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const [dados, curtidas, sessao] = await Promise.all([
          buscarRoupa(id),
          listarMinhasCurtidas(),
          carregarSessao(),
        ]);
        setRoupa(dados);
        setCurtida(curtidas.includes(dados._id));
        setMinha(idDoDono(dados) === sessao?.id);
      } catch (e) {
        Alert.alert("Ops", mensagemDeErro(e));
        router.back();
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [id]);

  async function alternarCurtida() {
    if (!roupa) return;
    try {
      if (curtida) {
        await descurtir(roupa._id);
      } else {
        const resposta = await curtir(roupa._id);
        if (resposta?.matchCreated) {
          Alert.alert("Deu match! 🎉", "Vocês têm interesse nas peças um do outro.");
        }
      }
      setRoupa({ ...roupa, likesCount: Math.max((roupa.likesCount || 0) + (curtida ? -1 : 1), 0) });
      setCurtida(!curtida);
    } catch (e) {
      Alert.alert("Ops", mensagemDeErro(e));
    }
  }

  function confirmarExclusao() {
    Alert.alert("Excluir peça", "Tem certeza que deseja excluir esta peça?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await excluirRoupa(id);
            router.back();
          } catch (e) {
            Alert.alert("Ops", mensagemDeErro(e));
          }
        },
      },
    ]);
  }

  if (carregando || !roupa) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  // Só as fotos (vídeos aparecem pela miniatura)
  const fotos = roupa.media.map((m) =>
    m.type === "video" ? m.url.replace(/\.[^./]+$/, ".jpg") : m.url
  );
  const etiquetas = [roupa.category, roupa.size && `Tam. ${roupa.size}`, roupa.condition, roupa.style].filter(
    Boolean
  ) as string[];

  return (
    <ScrollView>
      {/* Carrossel horizontal de fotos com FlatList */}
      <FlatList
        data={fotos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(url, indice) => url + indice}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width, height: width * 1.1 }} />
        )}
        ListEmptyComponent={
          <View style={[styles.semFoto, { width, height: width * 0.8 }]}>
            <Ionicons name="shirt-outline" size={64} color={cores.textoSuave} />
          </View>
        }
      />

      <View style={styles.conteudo}>
        {fotos.length > 1 && (
          <Text style={styles.dica}>Deslize para o lado para ver as {fotos.length} fotos</Text>
        )}

        <Text style={styles.titulo}>{roupa.title}</Text>
        <Text style={styles.dono}>Anunciada por @{nomeDoDono(roupa)}</Text>

        {etiquetas.length > 0 && (
          <View style={styles.etiquetas}>
            {etiquetas.map((texto) => (
              <Etiqueta key={texto} texto={texto} />
            ))}
          </View>
        )}

        <Text style={styles.descricao}>{roupa.description}</Text>

        <View style={styles.curtidas}>
          <Ionicons name="heart" size={18} color={cores.curtida} />
          <Text style={styles.textoCurtidas}>
            {roupa.likesCount || 0} {roupa.likesCount === 1 ? "curtida" : "curtidas"}
          </Text>
        </View>

        {minha ? (
          <Botao texto="Excluir peça" cor={cores.perigo} contorno onPress={confirmarExclusao} />
        ) : (
          <Botao
            texto={curtida ? "Remover interesse" : "Tenho interesse"}
            cor={curtida ? cores.textoSuave : cores.curtida}
            contorno={curtida}
            onPress={alternarCurtida}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  semFoto: {
    backgroundColor: "#EDE4FE",
    alignItems: "center",
    justifyContent: "center",
  },
  conteudo: {
    padding: 20,
  },
  dica: {
    color: cores.textoSuave,
    fontSize: 13,
    marginBottom: 10,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    color: cores.texto,
  },
  dono: {
    color: cores.primariaEscura,
    marginTop: 4,
    marginBottom: 12,
  },
  etiquetas: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  descricao: {
    fontSize: 16,
    lineHeight: 24,
    color: "#444",
    marginBottom: 16,
  },
  curtidas: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  textoCurtidas: {
    marginLeft: 6,
    color: cores.textoSuave,
    fontWeight: "bold",
  },
});
