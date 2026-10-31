import { ambiente } from "../constants/ambiente";
import { Midia } from "../types/roupa";

// Envio de fotos para o Cloudinary usando fetch (Aula 13).
// A conta e o preset vêm do .env (constants/ambiente.ts).

const TEMPO_LIMITE = 60000; // 60 segundos por foto
export const TAMANHO_MAXIMO = 10 * 1024 * 1024; // 10 MB

export async function enviarFoto(uri: string): Promise<Midia> {
  if (!ambiente.cloudinaryCloudName || !ambiente.cloudinaryUploadPreset) {
    throw new Error("O envio de fotos não está configurado. Confira o arquivo .env.");
  }

  const formulario = new FormData();
  formulario.append("file", {
    uri,
    name: "foto.jpg",
    type: "image/jpeg",
  } as any);
  formulario.append("upload_preset", ambiente.cloudinaryUploadPreset);

  // Cancela o envio se demorar demais. O tempo vale até a resposta ser lida por completo.
  const controle = new AbortController();
  const cronometro = setTimeout(() => controle.abort(), TEMPO_LIMITE);

  try {
    const resposta = await fetch(
      `${ambiente.cloudinaryApiUrl}/v1_1/${ambiente.cloudinaryCloudName}/image/upload`,
      { method: "POST", body: formulario, signal: controle.signal }
    );

    let dados: any = null;
    try {
      dados = await resposta.json();
    } catch (erroLeitura: any) {
      if (erroLeitura?.name === "AbortError") throw erroLeitura;
      dados = null; // resposta sem JSON válido
    }

    if (!resposta.ok) {
      const detalhe = dados?.error?.message ? ` (${dados.error.message})` : "";
      throw new Error(`O servidor de imagens recusou a foto${detalhe}.`);
    }
    if (!dados?.secure_url) {
      throw new Error("O servidor de imagens não devolveu o endereço da foto.");
    }

    return { type: "image", url: dados.secure_url };
  } catch (erro: any) {
    if (erro?.name === "AbortError") {
      throw new Error("O envio da foto demorou demais. Verifique sua internet.");
    }
    if (erro instanceof TypeError) {
      throw new Error("Sem conexão para enviar a foto. Verifique sua internet.");
    }
    throw erro;
  } finally {
    clearTimeout(cronometro);
  }
}
