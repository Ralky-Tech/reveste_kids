import { File } from "expo-file-system";

// Tamanho de um arquivo escolhido no celular, em bytes.
// Usa o tamanho informado pelo seletor de imagens; se ele não vier,
// lê o tamanho direto do arquivo. Devolve null se não conseguir descobrir.
export function tamanhoDoArquivo(uri: string, tamanhoInformado?: number | null): number | null {
  if (tamanhoInformado && tamanhoInformado > 0) {
    return tamanhoInformado;
  }
  try {
    const tamanho = new File(uri).size;
    return tamanho > 0 ? tamanho : null;
  } catch {
    return null;
  }
}
