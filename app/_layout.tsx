import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SupabaseAuthProvider } from "@/src/providers/supabase-auth-provider";

export default function RootLayout() {
  return (
    <SupabaseAuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#050A14" },
        }}
      />
    </SupabaseAuthProvider>
  );
}
