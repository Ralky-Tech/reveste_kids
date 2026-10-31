// Configuração por ambiente.
// Os valores vêm do arquivo .env (que não vai para o GitHub).
// Copie o .env.example para .env e preencha com os dados do ambiente desejado.
// Variáveis com o prefixo EXPO_PUBLIC_ são lidas pelo Expo quando o app inicia.

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export const ambiente = {
  apiUrl: API_URL?.replace(/\/+$/, "") || "",
  cloudinaryCloudName: CLOUDINARY_CLOUD_NAME || "",
  cloudinaryUploadPreset: CLOUDINARY_UPLOAD_PRESET || "",
};

// Lista as variáveis que estão faltando, para mostrar um aviso claro na tela
export function variaveisFaltando(): string[] {
  const faltando: string[] = [];
  if (!ambiente.apiUrl) faltando.push("EXPO_PUBLIC_API_URL");
  if (!ambiente.cloudinaryCloudName) faltando.push("EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME");
  if (!ambiente.cloudinaryUploadPreset) faltando.push("EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET");
  return faltando;
}
