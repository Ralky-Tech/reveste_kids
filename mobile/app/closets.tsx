import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Botao from "../components/Botao";
import { cores } from "../constants/cores";
import { mensagemDeErro, sessaoExpirada } from "../services/api";
import { listarRoupas } from "../services/roupas";
import { Roupa } from "../types/roupa";
import { carregarSessao } from "../utils/armazenamento";
import { idDoDono } from "../utils/roupas";
import { normalizar } from "../utils/texto";

type ClosetPublico = {
  id: string;
  nome: string;
  quantidade: number;
};

// O backend já disponibiliza GET /clothes com o dono preenchido em userId.
// Portanto, não é necessário criar outra rota: basta agrupar as peças por usuário.
function agruparClosets(roupas: Roupa[], meuId: string): ClosetPublico[] {
  const agrupados = new Map<string, ClosetPublico>();

  for (const roupa of roupas) {
    const id = idDoDono(roupa);
    if (!id || id === meuId) continue; // Ignora contas removidas e o próprio closet.

    const dono = roupa.userId;
    const nome =
      dono && typeof dono === "object"
        ? dono.name || dono.email?.split("@")[0] || "Usuário"
        : "Usuário";

    const existente = agrupados.get(id);
    if (existente) {
      existente.quantidade += 1;
    } else {
      agrupados.set(id, { id, nome, quantidade: 1 });
    }
  }

  return [...agrupados.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export default function ExplorarClosets() {
  const [roupas, setRoupas] = useState<Roupa[]>([]);
  const [meuId, setMeuId] = useState("");
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async (aoAtualizar = false) => {
    if (aoAtualizar) setAtualizando(true);
    else setCarregando(true);
    setErro("");

    try {
      const [todas, sessao] = await Promise.all([listarRoupas(), carregarSessao()]);
      setRoupas(todas);
      setMeuId(sessao?.id || "");
    } catch (e) {
      setRoupas([]);
      if (!sessaoExpirada(e)) setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const closets = useMemo(() => agruparClosets(roupas, meuId), [roupas, meuId]);
  const closetsFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    return closets.filter((closet) => normalizar(closet.nome).includes(termo));
  }, [closets, busca]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Explorar closets" }} />

      <View style={styles.busca}>
        <Ionicons name="search-outline" size={22} color={cores.textoSuave} />
        <TextInput
          style={styles.campo}
          placeholder="Buscar pelo nome da pessoa..."
          placeholderTextColor={cores.textoSuave}
          value={busca}
          onChangeText={setBusca}
          autoCorrect={false}
          accessibilityLabel="Buscar closets pelo nome"
        />
        {busca.length > 0 && (
          <Pressable onPress={() => setBusca("")} accessibilityLabel="Limpar busca" hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={cores.textoSuave} />
          </Pressable>
        )}
      </View>

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <Text style={styles.subtexto}>Carregando closets...</Text>
        </View>
      ) : erro ? (
        <View style={styles.centro}>
          <Ionicons name="cloud-offline-outline" size={48} color={cores.textoSuave} />
          <Text style={styles.aviso}>{erro}</Text>
          <Botao texto="Tentar novamente" onPress={() => void carregar()} />
        </View>
      ) : (
        <FlatList
          data={closetsFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() => void carregar(true)}
              tintColor={cores.primaria}
            />
          }
          ListHeaderComponent={
            <Text style={styles.subtexto}>
              {closetsFiltrados.length} {closetsFiltrados.length === 1 ? "closet encontrado" : "closets encontrados"}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.cartao, pressed && styles.pressionado]}
              onPress={() => router.push({ pathname: "/closets/[id]", params: { id: item.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Abrir closet de ${item.nome}`}
            >
              <View style={styles.avatar}>
                <Text style={styles.inicial}>{item.nome.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.informacoes}>
                <Text style={styles.nome} numberOfLines={1}>{item.nome}</Text>
                <Text style={styles.subtexto}>
                  {item.quantidade} {item.quantidade === 1 ? "peça disponível" : "peças disponíveis"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={cores.primariaEscura} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Ionicons name="people-outline" size={48} color={cores.textoSuave} />
              <Text style={styles.aviso}>
                {busca.trim() ? "Nenhum closet encontrado para essa busca." : "Ainda não há closets de outras pessoas."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  busca: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: cores.card,
    paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: cores.borda,
  },
  campo: { flex: 1, minHeight: 52, color: cores.texto, fontSize: 16 },
  lista: { flexGrow: 1, paddingTop: 14, paddingBottom: 28 },
  cartao: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14,
    backgroundColor: cores.card, borderRadius: 16, marginBottom: 12,
  },
  pressionado: { opacity: 0.75 },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: cores.primaria,
    alignItems: "center", justifyContent: "center",
  },
  inicial: { color: "#FFF", fontSize: 23, fontWeight: "bold" },
  informacoes: { flex: 1 },
  nome: { fontSize: 17, fontWeight: "bold", color: cores.texto },
  subtexto: { color: cores.textoSuave, marginTop: 4 },
  centro: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 20 },
  aviso: { color: cores.texto, textAlign: "center", fontSize: 16 },
  vazio: { paddingTop: 56, alignItems: "center", gap: 12 },
});
