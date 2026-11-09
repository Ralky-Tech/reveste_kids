// Normaliza texto para comparação
export function normalizar(texto: string | undefined | null): string {
  return (texto ?? "")
    .normalize("NFD")                
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}