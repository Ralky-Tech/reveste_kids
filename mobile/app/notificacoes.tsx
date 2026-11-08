import { Alert } from "../utils/alerta";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { cores } from "../constants/cores";
import { mensagemDeErro, sessaoExpirada } from "../services/api";
import { listarNotificacoes, marcarComoLida } from "../services/notificacoes";
import { Notificacao } from "../types/notificacao";

export default function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState<string[]>([]);

  const carregar = useCallback(async () => {
    try {
      setErro("");
      const resposta = await listarNotificacoes();
      setNotificacoes(resposta.notifications);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  async function ler(notificacao: Notificacao) {
    if (notificacao.read || salvando.includes(notificacao._id)) return;
    setSalvando((ids) => [...ids, notificacao._id]);
    try {
      await marcarComoLida(notificacao._id);
      // Só altera a tela depois de a API confirmar a gravação.
      setNotificacoes((lista) => lista.map((item) => item._id === notificacao._id ? { ...item, read: true } : item));
    } catch (e) {
      if (!sessaoExpirada(e)) Alert.alert("Não foi possível marcar como lida", mensagemDeErro(e));
    } finally {
      setSalvando((ids) => ids.filter((id) => id !== notificacao._id));
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Notificações" }} />
      {carregando ? <ActivityIndicator style={styles.centro} size="large" color={cores.primaria} /> : (
        <FlatList
          data={notificacoes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={atualizando} colors={[cores.primaria]} onRefresh={() => { setAtualizando(true); carregar(); }} />}
          ListHeaderComponent={erro ? (
            <View style={styles.aviso}>
              <Text accessibilityRole="alert" style={styles.texto}>{erro}</Text>
              <Pressable onPress={carregar} accessibilityRole="button"><Text style={styles.acao}>Tentar novamente</Text></Pressable>
            </View>
          ) : null}
          ListEmptyComponent={!erro ? <Text style={styles.aviso}>Você ainda não tem notificações.</Text> : null}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.message}. ${item.read ? "Lida" : "Não lida. Marcar como lida"}`}
              disabled={item.read || salvando.includes(item._id)}
              onPress={() => ler(item)}
              style={[styles.card, !item.read && styles.naoLida]}
            >
              <Ionicons name={item.type === "MATCH" ? "heart" : item.type === "MESSAGE" ? "chatbubble-outline" : "thumbs-up-outline"} size={24} color={cores.primariaEscura} />
              <View style={styles.conteudo}>
                <Text style={styles.texto}>{item.message}</Text>
                <Text style={styles.data}>{new Date(item.createdAt).toLocaleString("pt-BR")}</Text>
                <Text style={styles.acao}>{item.read ? "Lida" : "Marcar como lida"}</Text>
              </View>
              {salvando.includes(item._id) && <ActivityIndicator color={cores.primaria} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1 },
  lista: { padding: 16, flexGrow: 1 },
  aviso: { padding: 24, textAlign: "center", color: cores.textoSuave, gap: 12 },
  card: { flexDirection: "row", gap: 12, padding: 16, marginBottom: 12, borderRadius: 12, backgroundColor: cores.card, borderWidth: 1, borderColor: cores.borda },
  naoLida: { borderColor: cores.primaria },
  conteudo: { flex: 1, gap: 6 },
  texto: { fontSize: 16, color: cores.texto },
  data: { fontSize: 12, color: cores.textoSuave },
  acao: { color: cores.primariaEscura, fontWeight: "600" },
});
