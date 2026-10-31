import { Picker } from "@react-native-picker/picker";
import { StyleSheet, Text, View } from "react-native";
import { cores } from "../constants/cores";

// Lista de opções reutilizável (Aula 11 — formulários)
interface SeletorProps {
  rotulo: string;
  valor: string;
  opcoes: string[];
  onMudar: (valor: string) => void;
}

export default function Seletor({ rotulo, valor, opcoes, onMudar }: SeletorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.caixa}>
        <Picker selectedValue={valor} onValueChange={(v) => onMudar(String(v))}>
          <Picker.Item label="Selecione..." value="" color={cores.textoSuave} />
          {opcoes.map((opcao) => (
            <Picker.Item key={opcao} label={opcao} value={opcao} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  rotulo: {
    fontSize: 15,
    fontWeight: "bold",
    color: cores.texto,
    marginBottom: 6,
  },
  caixa: {
    backgroundColor: cores.card,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 12,
    overflow: "hidden",
  },
});
