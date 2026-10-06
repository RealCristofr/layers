import { View } from "react-native";
import { colors } from "../theme";

type Props = { progress?: number };

const bars = [30, 60, 90, 50, 75, 40, 85, 55, 70, 35, 65, 45, 80, 50, 60, 40, 70, 55];

export default function Waveform({ progress = 0 }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 36 }}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            borderRadius: 2,
            backgroundColor: i / bars.length < progress ? colors.accent : "#D9C4E8",
          }}
        />
      ))}
    </View>
  );
}