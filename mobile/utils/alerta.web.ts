import type { AlertButton } from "react-native";

// Mantém os callbacks de confirmação usados em logout, exclusão e sessão expirada.
export const Alert = {
  alert(titulo: string, mensagem?: string, botoes?: AlertButton[]) {
    const texto = [titulo, mensagem].filter(Boolean).join("\n\n");
    if (!botoes?.length) {
      window.alert(texto);
      return;
    }
    const confirmar = botoes.find((botao) => botao.style !== "cancel" && botao.onPress)
      ?? botoes.find((botao) => botao.style !== "cancel");
    const cancelar = botoes.find((botao) => botao !== confirmar);
    if (cancelar) {
      if (window.confirm(`${texto}\n\nOK: ${confirmar?.text || "Continuar"}\nCancelar: ${cancelar.text}`)) confirmar?.onPress?.();
      else cancelar.onPress?.();
    } else {
      window.alert(texto);
      confirmar?.onPress?.();
    }
  },
};
