import { Alert } from "../../../utils/alerta";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Botao from "../../../components/Botao";
import Campo from "../../../components/Campo";
import Seletor from "../../../components/Seletor";
import { cores } from "../../../constants/cores";
import { CATEGORIAS, ESTADOS, ESTILOS, TAMANHOS } from "../../../constants/opcoes";
import { mensagemDeErro, sessaoExpirada } from "../../../services/api";
import { enviarFoto, TAMANHO_MAXIMO } from "../../../services/cloudinary";
import { atualizarRoupa, buscarRoupa } from "../../../services/roupas";
import { Midia } from "../../../types/roupa";
import { tamanhoDoArquivo } from "../../../utils/arquivos";

const MAXIMO_FOTOS = 4;

interface Foto {
  uri: string;
  arquivoWeb?: File;
  url?: string;
  type: Midia["type"];
}

export default function EditarRoupa() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [estado, setEstado] = useState("");
  const [estilo, setEstilo] = useState("");
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const roupa = await buscarRoupa(id);
        setTitulo(roupa.title);
        setDescricao(roupa.description);
        setCategoria(roupa.category || "");
        setTamanho(roupa.size || "");
        setEstado(roupa.condition || "");
        setEstilo(roupa.style || "");
        setFotos(roupa.media.map((midia) => ({
          uri: midia.type === "video" ? midia.url.replace(/\.[^./]+$/, ".jpg") : midia.url,
          url: midia.url,
          type: midia.type,
        })));
        setCarregando(false);
      } catch (e) {
        if (sessaoExpirada(e)) return;
        Alert.alert("Ops", mensagemDeErro(e));
        router.back();
        setCarregando(false);
      }
    }

    carregar();
  }, [id]);

  function adicionarFotos(arquivos: ImagePicker.ImagePickerAsset[]) {
    let grandes = 0;
    let semTamanho = 0;
    const novas: Foto[] = [];

    for (const arquivo of arquivos) {
      const tamanhoArquivo = tamanhoDoArquivo(arquivo.uri, arquivo.file?.size ?? arquivo.fileSize);
      if (tamanhoArquivo === null) {
        semTamanho++;
      } else if (tamanhoArquivo > TAMANHO_MAXIMO) {
        grandes++;
      } else {
        novas.push({ uri: arquivo.uri, arquivoWeb: arquivo.file, type: "image" });
      }
    }

    if (grandes > 0) {
      Alert.alert(
        "Foto muito grande",
        `${grandes} foto(s) passam de 10 MB e não foram adicionadas.`,
      );
    }
    if (semTamanho > 0) {
      Alert.alert(
        "Foto não adicionada",
        `Não foi possível verificar o tamanho de ${semTamanho} foto(s). Tente escolher novamente.`,
      );
    }
    setFotos((atuais) => [
      ...atuais,
      ...novas.slice(0, Math.max(MAXIMO_FOTOS - atuais.length, 0)),
    ]);
  }

  async function escolherDaGaleria() {
    if (enviando) return;
    if (fotos.length >= MAXIMO_FOTOS) {
      Alert.alert("Limite atingido", `Você pode adicionar até ${MAXIMO_FOTOS} fotos.`);
      return;
    }

    const permissao =
      Platform.OS === "web"
        ? { granted: true }
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert("Permissão negada", "Libere o acesso às fotos para escolher imagens da galeria.");
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAXIMO_FOTOS - fotos.length,
      quality: 0.7,
    });

    if (!resultado.canceled) adicionarFotos(resultado.assets);
  }

  async function tirarFoto() {
    if (enviando) return;
    if (fotos.length >= MAXIMO_FOTOS) {
      Alert.alert("Limite atingido", `Você pode adicionar até ${MAXIMO_FOTOS} fotos.`);
      return;
    }
    if (Platform.OS === "web") {
      const resultado = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (!resultado.canceled) adicionarFotos(resultado.assets);
      return;
    }

    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert("Permissão negada", "Libere o acesso à câmera para tirar fotos.");
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!resultado.canceled) adicionarFotos(resultado.assets);
  }

  function removerFoto(indice: number) {
    setFotos((atuais) => atuais.filter((_, i) => i !== indice));
  }

  function validar(): boolean {
    if (titulo.trim() === "" || descricao.trim() === "") {
      Alert.alert("Atenção", "Preencha o título e a descrição da peça.");
      return false;
    }
    if (titulo.trim().length < 3) {
      Alert.alert("Atenção", "O título precisa ter pelo menos 3 letras.");
      return false;
    }
    if (!fotos.some((foto) => foto.type === "image")) {
      Alert.alert("Atenção", "Adicione pelo menos uma foto da peça.");
      return false;
    }
    return true;
  }

  async function salvar() {
    if (enviando || !validar()) return;

    setEnviando(true);
    const atualizadas = [...fotos];
    for (let i = 0; i < atualizadas.length; i++) {
      if (atualizadas[i].url || atualizadas[i].type === "video") continue;
      setProgresso(`Enviando foto ${i + 1} de ${atualizadas.length}…`);
      try {
        const midia = await enviarFoto(atualizadas[i].uri, atualizadas[i].arquivoWeb);
        atualizadas[i] = { ...atualizadas[i], url: midia.url };
        setFotos([...atualizadas]);
      } catch (e) {
        setEnviando(false);
        setProgresso("");
        Alert.alert(
          `Falha ao enviar a foto ${i + 1}`,
          `${mensagemDeErro(e)}\n\nAs fotos que já foram enviadas não serão enviadas de novo. Toque em "Salvar alterações" para tentar outra vez, ou remova essa foto.`,
        );
        return;
      }
    }

    setProgresso("Salvando a peça…");
    try {
      await atualizarRoupa(id, {
        title: titulo.trim(),
        description: descricao.trim(),
        category: categoria,
        size: tamanho,
        condition: estado,
        style: estilo,
        media: atualizadas.map((foto) => ({ type: foto.type, url: foto.url! })),
      });
      Alert.alert("Pronto!", "Peça atualizada com sucesso.");
      router.back();
    } catch (e) {
      if (sessaoExpirada(e)) return;
      Alert.alert(
        "Não foi possível salvar a peça",
        `${mensagemDeErro(e)}\n\nAs fotos já foram enviadas. Toque em "Salvar alterações" para tentar salvar de novo.`,
      );
    } finally {
      setEnviando(false);
      setProgresso("");
    }
  }

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  const opcoesCategoria = categoria && !CATEGORIAS.includes(categoria)
    ? [categoria, ...CATEGORIAS]
    : CATEGORIAS;
  const opcoesTamanho = tamanho && !TAMANHOS.includes(tamanho)
    ? [tamanho, ...TAMANHOS]
    : TAMANHOS;
  const opcoesEstado = estado && !ESTADOS.includes(estado) ? [estado, ...ESTADOS] : ESTADOS;
  const opcoesEstilo = estilo && !ESTILOS.includes(estilo) ? [estilo, ...ESTILOS] : ESTILOS;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.secao}>
          Fotos <Text style={styles.asterisco}>*</Text>
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotos}>
          {fotos.map((foto, indice) => (
            <View key={foto.url || foto.uri + indice} style={styles.miniatura}>
              <Image source={{ uri: foto.uri }} style={styles.imagem} />
              {foto.url && (
                <View style={styles.enviada}>
                  <Ionicons name="cloud-done" size={14} color="#FFF" />
                </View>
              )}
              {!enviando && (
                <Pressable style={styles.remover} onPress={() => removerFoto(indice)} hitSlop={8}>
                  <Ionicons name="close" size={16} color="#FFF" />
                </Pressable>
              )}
            </View>
          ))}
          {fotos.length === 0 && <Text style={styles.semFotos}>Nenhuma foto ainda.</Text>}
        </ScrollView>

        <View style={styles.botoesFoto}>
          <BotaoFoto icone="images-outline" texto="Galeria" onPress={escolherDaGaleria} />
          <BotaoFoto icone="camera-outline" texto="Câmera" onPress={tirarFoto} />
        </View>

        <Campo
          rotulo="Título"
          obrigatorio
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ex.: Jaqueta jeans azul"
          maxLength={40}
        />
        <Campo
          rotulo="Descrição"
          obrigatorio
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Conte como está a peça, marca, detalhes…"
          multiline
        />

        <Seletor rotulo="Categoria" valor={categoria} opcoes={opcoesCategoria} onMudar={setCategoria} />
        <Seletor rotulo="Tamanho" valor={tamanho} opcoes={opcoesTamanho} onMudar={setTamanho} />
        <Seletor rotulo="Condição" valor={estado} opcoes={opcoesEstado} onMudar={setEstado} />
        <Seletor rotulo="Estilo" valor={estilo} opcoes={opcoesEstilo} onMudar={setEstilo} />

        {progresso !== "" && <Text style={styles.progresso}>{progresso}</Text>}

        <Botao texto="Salvar alterações" onPress={salvar} carregando={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BotaoFoto({ icone, texto, onPress }: { icone: any; texto: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.botaoFoto, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icone} size={24} color={cores.primaria} />
      <Text style={styles.textoBotaoFoto}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  secao: {
    fontSize: 15,
    fontWeight: "bold",
    color: cores.texto,
    marginBottom: 8,
  },
  asterisco: {
    color: cores.perigo,
  },
  fotos: {
    marginBottom: 12,
  },
  miniatura: {
    width: 96,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 10,
  },
  imagem: {
    width: "100%",
    height: "100%",
  },
  enviada: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(22,163,74,0.9)",
    borderRadius: 10,
    padding: 3,
  },
  remover: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    padding: 3,
  },
  semFotos: {
    color: cores.textoSuave,
    paddingVertical: 10,
  },
  botoesFoto: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  botaoFoto: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: cores.primaria,
    borderRadius: 14,
  },
  textoBotaoFoto: {
    color: cores.primariaEscura,
    fontWeight: "bold",
    marginTop: 4,
  },
  progresso: {
    color: cores.textoSuave,
    textAlign: "center",
    marginBottom: 12,
  },
});
