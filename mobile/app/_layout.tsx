import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { cores } from "../constants/cores";

// Navegação em pilha com Expo Router (Aula 08)
export default function Layout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: cores.fundo },
          headerTintColor: cores.primariaEscura,
          headerTitleStyle: { fontWeight: "bold" },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Entrar" }} />
        <Stack.Screen name="cadastro" options={{ title: "Criar conta" }} />
        <Stack.Screen name="feed" options={{ title: "ReVeste Kids", headerBackVisible: false }} />
        <Stack.Screen name="roupas/[id]" options={{ title: "Detalhes da peça" }} />
        <Stack.Screen name="roupas/nova" options={{ title: "Nova peça" }} />
        <Stack.Screen name="closet" options={{ title: "Meu Closet" }} />
        <Stack.Screen name="matches" options={{ title: "Meus matches" }} />
        <Stack.Screen name="perfil" options={{ title: "Perfil" }} />
      </Stack>
    </>
  );
}
