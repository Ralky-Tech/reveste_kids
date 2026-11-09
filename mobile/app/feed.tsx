import { Alert } from "../utils/alerta";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import RoupaCard from "../components/RoupaCard";
import FiltroChip from "../components/FiltroChip";
import { cores } from "../constants/cores";
import { mensagemDeErro, sessaoExpirada } from "../services/api";
import { curtir, descurtir, listarMinhasCurtidas } from "../services/curtidas";
import { listarRoupas } from "../services/roupas";
import { listarNotificacoes } from "../services/notificacoes";
import { Roupa } from "../types/roupa";
import { carregarSessao } from "../utils/armazenamento";
import { idDoDono } from "../utils/roupas";
import { normalizar } from "../utils/texto";
const CATEGORIAS = ["Vestido", "Camiseta", "Calça", "Jaqueta", "Saia", "Short", "Blusa", "Calçado"];
const TAMANHOS = ["PP", "P", "M", "G", "GG"];
const CONDICOES = ["Novo", "Seminovo", "Usado"];
const ESTILOS = ["Casual", "Festa", "Esporte", "Inverno", "Verão"];

type FiltroTexto = string | null;

export default function Feed() {
  const [roupas, setRoupas] = useState<Roupa[]>([]);
  const [curtidas, setCurtidas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [naoLidas, setNaoLidas] = useState<number | null>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<FiltroTexto>(null);
  const [filtroTamanho, setFiltroTamanho] = useState<FiltroTexto>(null);
  const [filtroCondicao, setFiltroCondicao] = useState<FiltroTexto>(null);
  const [filtroEstilo, setFiltroEstilo] = useState<FiltroTexto>(null);

  async function carregarContador() {
    try {
      const resposta = await listarNotificacoes();
      setNaoLidas(resposta.unreadCount);
    } catch {
      // Uma falha nas notificações não impede o carregamento das peças.
      setNaoLidas(null);
    }
  }

  async function carregarFeed() {
    try {
      setErro("");
      const sessao = await carregarSessao();
      const [todas, minhasCurtidas] = await Promise.all([
        listarRoupas(),
        listarMinhasCurtidas(),
      ]);

      // Mostra só as peças dos outros, da mais nova para a mais antiga
      const dosOutros = todas
        .filter((roupa) => idDoDono(roupa) !== sessao?.id)
        .sort((a, b) => {
          const dataA = a.createdAt || "";
          const dataB = b.createdAt || "";
          return dataB.localeCompare(dataA);
      });

      setRoupas(dosOutros);
      setCurtidas(minhasCurtidas);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      carregarFeed();
      carregarContador();
    }, []),
  );

  // Aplica filtros + busca
  const roupasFiltradas = useMemo(() => {
    const termo = normalizar(busca);

    return roupas.filter((roupa) => {
      // Busca por título, sem acento e sem caixa
      if (termo && !normalizar(roupa.title).includes(termo)) return false;

      // Compara normalizado dos dois lados
      if (filtroCategoria && normalizar(roupa.category) !== normalizar(filtroCategoria)) return false;
      if (filtroTamanho && normalizar(roupa.size) !== normalizar(filtroTamanho)) return false;
      if (filtroCondicao && normalizar(roupa.condition) !== normalizar(filtroCondicao)) return false;
      if (filtroEstilo && normalizar(roupa.style) !== normalizar(filtroEstilo)) return false;

      return true;
    });
  }, [roupas, busca, filtroCategoria, filtroTamanho, filtroCondicao, filtroEstilo]);

  const temFiltroAtivo =
    busca.trim() !== "" ||
    filtroCategoria !== null ||
    filtroTamanho !== null ||
    filtroCondicao !== null ||
    filtroEstilo !== null;

  function limparFiltros() {
    setBusca("");
    setFiltroCategoria(null);
    setFiltroTamanho(null);
    setFiltroCondicao(null);
    setFiltroEstilo(null);
  }

  function alternar(valor: string, atual: FiltroTexto, setter: (v: FiltroTexto) => void) {
    setter(atual && normalizar(atual) === normalizar(valor) ? null : valor);
  }

  async function alternarCurtida(roupa: Roupa) {
    if (!idDoDono(roupa)) {
      Alert.alert("Peça indisponível", "A conta de quem anunciou esta peça foi removida.");
      return;
    }
    const jaCurtiu = curtidas.includes(roupa._id);
    try {
      if (jaCurtiu) {
        await descurtir(roupa._id);
        setCurtidas(curtidas.filter((id) => id !== roupa._id));
      } else {
        const resposta = await curtir(roupa._id);
        setCurtidas([...curtidas, roupa._id]);

        if (resposta?.matchCreated) {
          Alert.alert("Deu match! 🎉", "Vocês têm interesse nas peças um do outro.", [
            { text: "Depois" },
            { text: "Ver matches", onPress: () => router.push("/matches") },
          ]);
        }
      }

      // Atualiza o contador de curtidas da peça na tela
      setRoupas(
        roupas.map((r) =>
          r._id === roupa._id
            ? { ...r, likesCount: Math.max((r.likesCount || 0) + (jaCurtiu ? -1 : 1), 0) }
            : r,
        ),
      );
    } catch (e) {
      if (!sessaoExpirada(e)) Alert.alert("Ops", mensagemDeErro(e));
    }
  }

  return (
    <View style={styles.container}>
      {/* Botões no cabeçalho */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.acoes}>
              <Pressable
                onPress={() => router.push("/notificacoes")}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  naoLidas === null
                    ? "Notificações. Contador indisponível"
                    : `Notificações, ${naoLidas} não lidas`
                }
                style={styles.sino}
              >
                <Ionicons name="notifications-outline" size={27} color={cores.primariaEscura} />
                {naoLidas !== null && naoLidas > 0 && (
                  <View style={styles.contador}>
                    <Text style={styles.numero}>{naoLidas > 99 ? "99+" : naoLidas}</Text>
                  </View>
                )}
              </Pressable>
              <IconeCabecalho
                icone="add-circle-outline"
                onPress={() => router.push("/roupas/nova")}
              />
              <IconeCabecalho icone="shirt-outline" onPress={() => router.push("/closet")} />
              <IconeCabecalho
                icone="person-circle-outline"
                onPress={() => router.push("/perfil")}
              />
            </View>
          ),
        }}
      />

      {/* Filtro */}
      <View style={styles.filtrosContainer}>
        <View style={styles.buscaWrap}>
          <Ionicons name="search" size={18} color={cores.textoSuave} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por título…"
            placeholderTextColor={cores.textoSuave}
            style={styles.buscaInput}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar peças por título"
          />
          {busca !== "" && (
            <Pressable onPress={() => setBusca("")} hitSlop={8} accessibilityLabel="Limpar busca">
              <Ionicons name="close-circle" size={18} color={cores.textoSuave} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsLinha}
        >
          {CATEGORIAS.map((c) => (
            <FiltroChip
              key={`cat-${c}`}
              label={c}
              ativo={normalizar(filtroCategoria) === normalizar(c)}
              onPress={() => alternar(c, filtroCategoria, setFiltroCategoria)}
            />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsLinha}
        >
          {TAMANHOS.map((t) => (
            <FiltroChip
              key={`tam-${t}`}
              label={t}
              ativo={normalizar(filtroTamanho) === normalizar(t)}
              onPress={() => alternar(t, filtroTamanho, setFiltroTamanho)}
            />
          ))}
          {CONDICOES.map((c) => (
            <FiltroChip
              key={`cond-${c}`}
              label={c}
              ativo={normalizar(filtroCondicao) === normalizar(c)}
              onPress={() => alternar(c, filtroCondicao, setFiltroCondicao)}
            />
          ))}
          {ESTILOS.map((e) => (
            <FiltroChip
              key={`est-${e}`}
              label={e}
              ativo={normalizar(filtroEstilo) === normalizar(e)}
              onPress={() => alternar(e, filtroEstilo, setFiltroEstilo)}
            />
          ))}
        </ScrollView>

        {temFiltroAtivo && (
          <View style={styles.resultadoWrap}>
            <Text style={styles.resultadoTexto}>
              {roupasFiltradas.length} {roupasFiltradas.length === 1 ? "peça" : "peças"}
            </Text>
            <Pressable onPress={limparFiltros} hitSlop={8} accessibilityLabel="Limpar filtros">
              <Text style={styles.limparTexto}>Limpar</Text>
            </Pressable>
          </View>
        )}
      </View>

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={cores.primaria} />
          <Text style={styles.aviso}>Carregando peças…</Text>
          <Text style={styles.avisoMenor}>
            Na primeira vez pode demorar até um minuto, enquanto o servidor acorda.
          </Text>
        </View>
      ) : (
        <FlatList
          data={roupasFiltradas}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <RoupaCard
              roupa={item}
              curtida={curtidas.includes(item._id)}
              onCurtir={() => alternarCurtida(item)}
              onAbrir={() => router.push(`/roupas/${item._id}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              colors={[cores.primaria]}
              onRefresh={() => {
                setAtualizando(true);
                carregarFeed();
                carregarContador();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.centro}>
              <Ionicons
                name={temFiltroAtivo ? "funnel-outline" : "shirt-outline"}
                size={56}
                color={cores.textoSuave}
              />
              <Text style={styles.aviso}>
                {erro ||
                  (temFiltroAtivo
                    ? "Nenhuma peça encontrada com esses filtros."
                    : "Ainda não há peças por aqui.")}
              </Text>
              {temFiltroAtivo && !erro && (
                <Pressable onPress={limparFiltros} style={styles.botaoLimparVazio}>
                  <Text style={styles.botaoLimparVazioTexto}>Limpar filtros</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

function IconeCabecalho({ icone, onPress }: { icone: any; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [{ marginLeft: 14 }, pressed && { opacity: 0.5 }]}
    >
      <Ionicons name={icone} size={27} color={cores.primariaEscura} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sino: { marginLeft: 14 },
  contador: {
    position: "absolute",
    top: -7,
    right: -8,
    backgroundColor: cores.perigo,
    borderRadius: 10,
    minWidth: 18,
    paddingHorizontal: 3,
    alignItems: "center",
  },
  numero: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold" },
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  lista: {
    padding: 16,
    flexGrow: 1,
  },
  acoes: {
    flexDirection: "row",
  },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  aviso: {
    marginTop: 12,
    fontSize: 16,
    color: cores.texto,
    textAlign: "center",
  },
  avisoMenor: {
    marginTop: 6,
    fontSize: 13,
    color: cores.textoSuave,
    textAlign: "center",
  },

  // Filtros
  filtrosContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: cores.fundo,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  buscaWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  buscaInput: { flex: 1, marginLeft: 8, fontSize: 14, color: cores.texto, padding: 0 },
  chipsLinha: { paddingVertical: 2 },
  resultadoWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  resultadoTexto: { fontSize: 13, color: cores.textoSuave },
  limparTexto: { fontSize: 13, color: cores.primaria, fontWeight: "bold" },
  botaoLimparVazio: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: cores.primaria,
  },
  botaoLimparVazioTexto: { color: "#FFFFFF", fontWeight: "bold" },
});
