import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import { cores } from "../constants/cores";

type Props = {
  label: string;
  ativo?: boolean;
  onPress: () => void;
  icone?: keyof typeof Ionicons.glyphMap;
};

// Chip / Tag de filtro reutilizável
export default function FiltroChip({ label, ativo = false, onPress, icone }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={`Filtro ${label}${ativo ? ", ativo" : ""}`}
      style={({ pressed }) => [
        styles.chip,
        ativo && styles.chipAtivo,
        pressed && { opacity: 0.7 },
      ]}
    >
      {icone && (
        <Ionicons
          name={icone}
          size={14}
          color={ativo ? "#FFFFFF" : cores.primariaEscura}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.label, ativo && styles.labelAtivo]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.primaria,
    backgroundColor: cores.fundo,
    marginRight: 8,
    marginBottom: 8,
  },
  chipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  label: {
    fontSize: 13,
    color: cores.primariaEscura,
    fontWeight: "500",
  },
  labelAtivo: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});