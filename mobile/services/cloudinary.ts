import { Midia } from "../types/roupa";

// Envio de fotos para o Cloudinary usando fetch (Aula 13).
// Mesmo serviço e mesma configuração que o site usa.
const CLOUD_NAME = "djgu3sdab";
const UPLOAD_PRESET = "reveste_kids_upload";

export async function enviarFoto(uri: string): Promise<Midia> {
  const formulario = new FormData();
  formulario.append("file", {
    uri,
    name: "foto.jpg",
    type: "image/jpeg",
  } as any);
  formulario.append("upload_preset", UPLOAD_PRESET);

  const resposta = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formulario,
  });

  if (!resposta.ok) {
    throw new Error("Erro ao enviar a foto: " + resposta.status);
  }

  const dados = await resposta.json();
  return { type: "image", url: dados.secure_url };
}
