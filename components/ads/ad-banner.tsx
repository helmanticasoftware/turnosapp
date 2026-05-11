import { Text, View } from "react-native";

import { adUnits } from "@/src/services/ads";

type Props = {
  enabled?: boolean;
};

export default function AdBanner({ enabled = true }: Props) {
  if (!enabled) return null;

  // Cuando las dependencias estén instaladas y la app corra en nativo,
  // aquí sustituimos este placeholder por BannerAd real.
  return (
    <View
      style={{
        minHeight: 54,
        borderTopWidth: 1,
        borderColor: "#1E293B",
        backgroundColor: "#0D1526",
        paddingHorizontal: 14,
        paddingVertical: 8,
        justifyContent: "center",
      }}
    >
      <Text selectable style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>
        ANUNCIO
      </Text>
      <Text selectable style={{ color: "#CBD5E1", fontSize: 12, marginTop: 2 }}>
        Banner Android configurado: {adUnits.bannerAndroid}
      </Text>
    </View>
  );
}
