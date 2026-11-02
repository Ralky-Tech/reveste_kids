import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { cores } from "../constants/cores";
import { Roupa } from "../types/roupa";
import { capaDaRoupa, nomeDoDono } from "../utils/roupas";
import Etiqueta from "./Etiqueta";

// Card de uma peça no feed (Aula 09 — componente com props)
interface RoupaCardProps {
  roupa: Roupa;
  curtida: boolean;
  onCurtir: () => void;
  onAbrir: () => void;
}

export default function RoupaCard({ roupa, curtida, onCurtir, onAbrir }: RoupaCardProps) {
  const capa = capaDaRoupa(roupa);
  const etiquetas = [roupa.category, roupa.size && `Tam. ${roupa.size}`, roupa.condition, roupa.style].filter(
    Boolean
  ) as string[];

  return (
    <Pressable
      onPress={onAbrir}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      {capa ? (
        <Image source={{ uri: capa }} style={styles.imagem} />
      ) : (
        <View style={[styles.imagem, styles.semImagem]}>
          <Ionicons name="shirt-outline" size={48} color={cores.textoSuave} />
        </View>
      )}

      <View style={styles.conteudo}>
        <View style={styles.linha}>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo} numberOfLines={1}>
              {roupa.title}
            </Text>
            <Text style={styles.dono}>@{nomeDoDono(roupa)}</Text>
          </View>

          <Pressable onPress={onCurtir} hitSlop={12} style={styles.curtir}>
            <Ionicons
              name={curtida ? "heart" : "heart-outline"}
              size={30}
              color={curtida ? cores.curtida : cores.textoSuave}
            />
            <Text style={styles.contador}>{roupa.likesCount || 0}</Text>
          </Pressable>
        </View>

        {etiquetas.length > 0 && (
          <View style={styles.etiquetas}>
            {etiquetas.map((texto) => (
              <Etiqueta key={texto} texto={texto} />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: cores.card,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  imagem: {
    width: "100%",
    aspectRatio: 4 / 5,
  },
  semImagem: {
    backgroundColor: "#EDE4FE",
    alignItems: "center",
    justifyContent: "center",
  },
  conteudo: {
    padding: 14,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
  },
  titulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: cores.texto,
  },
  dono: {
    color: cores.primariaEscura,
    marginTop: 2,
  },
  curtir: {
    alignItems: "center",
    marginLeft: 12,
  },
  contador: {
    fontSize: 12,
    color: cores.textoSuave,
    fontWeight: "bold",
  },
  etiquetas: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
});
