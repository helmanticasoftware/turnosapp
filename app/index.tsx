import { View } from "react-native";

import NativeAuthBar from "@/components/native-auth-bar";
import TurnosDomApp from "@/components/dom/turnos-dom-app";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#050A14" }}>
      <TurnosDomApp dom={{ style: { flex: 1, width: "100%", height: "100%" } }} />
      <NativeAuthBar />
    </View>
  );
}
