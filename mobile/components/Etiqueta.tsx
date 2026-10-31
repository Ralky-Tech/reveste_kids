import { StyleSheet, Text, View } from "react-native";
import { cores } from "../constants/cores";

// Pequena etiqueta para mostrar categoria, tamanho e estado da peça
export default function Etiqueta({ texto }: { texto: string }) {
  return (
    <View style={styles.etiqueta}>
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    backgroundColor: "#EDE4FE",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  texto: {
    color: cores.primariaEscura,
    fontSize: 12,
    fontWeight: "bold",
  },
});
