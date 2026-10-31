import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { cores } from "../constants/cores";

// Campo de formulário reutilizável (Aulas 09 e 11)
// Recebe um rótulo e repassa as outras props para o TextInput
interface CampoProps extends TextInputProps {
  rotulo: string;
  obrigatorio?: boolean;
}

export default function Campo({ rotulo, obrigatorio = false, style, ...props }: CampoProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>
        {rotulo}
        {obrigatorio && <Text style={styles.asterisco}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, props.multiline && styles.multilinha, style]}
        placeholderTextColor={cores.textoSuave}
        {...props}
      />
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
  asterisco: {
    color: cores.perigo,
  },
  input: {
    backgroundColor: cores.card,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: cores.texto,
  },
  multilinha: {
    minHeight: 100,
    textAlignVertical: "top",
  },
});
