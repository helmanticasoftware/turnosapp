import { View } from "react-native";

import NativeAuthBar from "@/components/native-auth-bar";
import TurnosDomApp from "@/components/dom/turnos-dom-app";
import { useSupabaseAuth } from "@/src/providers/supabase-auth-provider";

export default function HomeScreen() {
  const { user, profile } = useSupabaseAuth();
  const syncedUserInfo = user
    ? {
        name: profile?.full_name ?? user.user_metadata?.full_name ?? user.email ?? "Usuario",
        email: profile?.email ?? user.email ?? "sin-email@local.invalid",
        provider: "supabase-google",
      }
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#050A14" }}>
      <TurnosDomApp userInfo={syncedUserInfo} dom={{ style: { flex: 1, width: "100%", height: "100%" } }} />
      <NativeAuthBar />
    </View>
  );
}
