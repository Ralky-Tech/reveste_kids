import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Botao from "../../components/Botao";
import Campo from "../../components/Campo";
import Seletor from "../../components/Seletor";
import { cores } from "../../constants/cores";
import { CATEGORIAS, ESTADOS, TAMANHOS } from "../../constants/opcoes";
import { mensagemDeErro } from "../../services/api";
import { enviarFoto, TAMANHO_MAXIMO } from "../../services/cloudinary";
import { criarRoupa } from "../../services/roupas";

const MAXIMO_FOTOS = 4;

// Foto escolhida no celular. "url" é preenchida depois que ela sobe para o Cloudinary,
// assim, se algo falhar, a nova tentativa não envia de novo as fotos que já subiram.
interface Foto {
  uri: string;
  url?: string;
}

// Cadastro de peça: formulário (Aula 11) + câmera e galeria (Aula 15)
export default function NovaRoupa() {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [estado, setEstado] = useState("");
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState("");

  function adicionarFotos(arquivos: ImagePicker.ImagePickerAsset[]) {
    // Recusa fotos grandes demais antes de tentar enviar
    const aceitas = arquivos.filter((a) => !a.fileSize || a.fileSize <= TAMANHO_MAXIMO);
    if (aceitas.length < arquivos.length) {
      Alert.alert("Foto muito grande", "Algumas fotos passam de 10 MB e não foram adicionadas.");
    }
    const novas = aceitas.map((a) => ({ uri: a.uri }));
    setFotos([...fotos, ...novas].slice(0, MAXIMO_FOTOS));
  }

  async function escolherDaGaleria() {
    if (fotos.length >= MAXIMO_FOTOS) {
      Alert.alert("Limite atingido", `Você pode adicionar até ${MAXIMO_FOTOS} fotos.`);
      return;
    }

    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
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

    // Sempre verificar se a pessoa não cancelou (Aula 15)
    if (!resultado.canceled) {
      adicionarFotos(resultado.assets);
    }
  }

  async function tirarFoto() {
    if (fotos.length >= MAXIMO_FOTOS) {
      Alert.alert("Limite atingido", `Você pode adicionar até ${MAXIMO_FOTOS} fotos.`);
      return;
    }

    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert("Permissão negada", "Libere o acesso à câmera para tirar fotos.");
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!resultado.canceled) {
      adicionarFotos(resultado.assets);
    }
  }

  function removerFoto(indice: number) {
    setFotos(fotos.filter((_, i) => i !== indice));
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
    if (fotos.length === 0) {
      Alert.alert("Atenção", "Adicione pelo menos uma foto da peça.");
      return false;
    }
    return true;
  }

  async function salvar() {
    if (enviando || !validar()) return;

    setEnviando(true);

    // 1. Envia para o Cloudinary as fotos que ainda não subiram (fetch)
    const atualizadas = [...fotos];
    for (let i = 0; i < atualizadas.length; i++) {
      if (atualizadas[i].url) continue;
      setProgresso(`Enviando foto ${i + 1} de ${atualizadas.length}…`);
      try {
        const midia = await enviarFoto(atualizadas[i].uri);
        atualizadas[i] = { ...atualizadas[i], url: midia.url };
        setFotos([...atualizadas]);
      } catch (e) {
        setEnviando(false);
        setProgresso("");
        Alert.alert(
          `Falha ao enviar a foto ${i + 1}`,
          `${mensagemDeErro(e)}\n\nAs fotos que já foram enviadas não serão enviadas de novo. Toque em "Cadastrar peça" para tentar outra vez, ou remova essa foto.`
        );
        return;
      }
    }

    // 2. Cadastra a peça na API (axios)
    setProgresso("Salvando a peça…");
    try {
      await criarRoupa({
        title: titulo.trim(),
        description: descricao.trim(),
        category: categoria,
        size: tamanho,
        condition: estado,
        media: atualizadas.map((foto) => ({ type: "image" as const, url: foto.url! })),
      });

      Alert.alert("Pronto!", "Peça cadastrada com sucesso.");
      router.back();
    } catch (e) {
      Alert.alert(
        "Não foi possível salvar a peça",
        `${mensagemDeErro(e)}\n\nAs fotos já foram enviadas. Toque em "Cadastrar peça" para tentar salvar de novo.`
      );
    } finally {
      setEnviando(false);
      setProgresso("");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.secao}>
          Fotos <Text style={styles.asterisco}>*</Text>
        </Text>

        <View style={styles.aviso}>
          <Ionicons name="shield-checkmark-outline" size={18} color={cores.primaria} />
          <Text style={styles.textoAviso}>
            Fotografe só a peça, sem a criança vestindo. As fotos ficam públicas no feed.
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotos}>
          {fotos.map((foto, indice) => (
            <View key={foto.uri + indice} style={styles.miniatura}>
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

        <Seletor rotulo="Categoria" valor={categoria} opcoes={CATEGORIAS} onMudar={setCategoria} />
        <Seletor rotulo="Tamanho" valor={tamanho} opcoes={TAMANHOS} onMudar={setTamanho} />
        <Seletor rotulo="Estado" valor={estado} opcoes={ESTADOS} onMudar={setEstado} />

        {progresso !== "" && <Text style={styles.progresso}>{progresso}</Text>}

        <Botao texto="Cadastrar peça" onPress={salvar} carregando={enviando} />
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
  aviso: {
    flexDirection: "row",
    backgroundColor: cores.card,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  textoAviso: {
    flex: 1,
    marginLeft: 8,
    color: cores.textoSuave,
    fontSize: 13,
    lineHeight: 18,
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
    backgroundColor: cores.card,
  },
  textoBotaoFoto: {
    marginTop: 4,
    fontWeight: "bold",
    color: cores.texto,
  },
  progresso: {
    textAlign: "center",
    color: cores.primariaEscura,
    fontWeight: "bold",
    marginBottom: 12,
  },
});
