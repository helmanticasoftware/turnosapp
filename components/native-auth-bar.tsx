import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useSupabaseAuth } from "@/src/providers/supabase-auth-provider";

export default function NativeAuthBar() {
  const { isConfigured, isReady, user, profile, signInWithGoogle, signOut } = useSupabaseAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isConfigured) return null;

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    const result = await signInWithGoogle();
    if (!result.ok) setError(result.error ?? "No se pudo iniciar sesión");
    setBusy(false);
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError(null);
    await signOut();
    setBusy(false);
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        zIndex: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#1E293B",
        backgroundColor: "rgba(13,21,38,0.94)",
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "700" }}>
            {isReady ? (user ? `Sync activa: ${profile?.full_name ?? user.email ?? "Usuario"}` : "Supabase listo para iniciar con Google") : "Cargando sesión..."}
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
            {user ? (profile?.email ?? user.email ?? "") : "Auth real preparada en nativo"}
          </Text>
        </View>

        {user ? (
          <Pressable
            onPress={handleSignOut}
            disabled={busy}
            style={{
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#475569",
              backgroundColor: "#111827",
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: "#E2E8F0", fontSize: 12, fontWeight: "700" }}>{busy ? "..." : "Salir"}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleGoogle}
            disabled={busy || !isReady}
            style={{
              borderRadius: 10,
              backgroundColor: "#6366F1",
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>{busy ? "Abriendo..." : "Google"}</Text>
          </Pressable>
        )}
      </View>

      {error ? <Text style={{ color: "#FCA5A5", fontSize: 11 }}>{error}</Text> : null}
    </View>
  );
}
