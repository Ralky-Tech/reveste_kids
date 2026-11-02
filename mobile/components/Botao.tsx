import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { cores } from "../constants/cores";

// Botão reutilizável (Aulas 05 e 09)
interface BotaoProps {
  texto: string;
  onPress: () => void;
  cor?: string;
  contorno?: boolean; // botão só com borda
  carregando?: boolean;
}

export default function Botao({
  texto,
  onPress,
  cor = cores.primaria,
  contorno = false,
  carregando = false,
}: BotaoProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.botao,
        contorno ? { borderWidth: 2, borderColor: cor } : { backgroundColor: cor },
        (pressed || carregando) && styles.botaoPressionado,
      ]}
      onPress={onPress}
      disabled={carregando}
    >
      {carregando ? (
        <ActivityIndicator color={contorno ? cor : "#FFF"} />
      ) : (
        <Text style={[styles.texto, contorno && { color: cor }]}>{texto}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  texto: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "bold",
  },
  botaoPressionado: {
    opacity: 0.7,
  },
});
