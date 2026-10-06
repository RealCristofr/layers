import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";
import ConnectButton from "./ConnectButton";
import DemoSection from "./DemoSection";
import { ProfileData } from "./ProfileForm";
import ReportBlockMenu from "./ReportBlockMenu";

const AVAIL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Mornings: "sunny-outline",
  Evenings: "moon-outline",
  Weekends: "calendar-outline",
  "Open to remote": "globe-outline",
};

type Props = {
  person: ProfileData & { id: string };
  me: string;
  color: string;
  onBack: () => void;
  onMessage?: (connectionId: string) => void;
};

export default function PublicProfile({ person, me, color, onBack, onMessage }: Props) {
  const subtitle = [person.roles.join(", "), person.city].filter(Boolean).join(" · ");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[styles.banner, { backgroundColor: color }]}>
        <Text style={styles.bannerLetter}>{person.username[0].toUpperCase()}</Text>
        <Pressable style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <ReportBlockMenu
          me={me}
          otherId={person.id}
          otherName={person.username}
          onBlocked={onBack}
          buttonStyle={styles.menu}
        />
      </View>

      <View style={styles.sheet}>
        <Text style={styles.name}>{person.username}</Text>
        {!!subtitle && <Text style={styles.soft}>{subtitle}</Text>}

        {person.genres.length > 0 && (
          <View style={styles.wrap}>
            {person.genres.map((g) => (
              <Text key={g} style={styles.tag}>{g}</Text>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <ConnectButton me={me} otherId={person.id} onMessage={onMessage} />
        </View>

        {!!person.bio && (
          <>
            <Text style={styles.section}>About</Text>
            <Text style={styles.body}>{person.bio}</Text>
          </>
        )}

        <DemoSection userId={person.id} />

        {person.looking_for.length > 0 && (
          <>
            <Text style={styles.section}>Looking for</Text>
            <View style={styles.wrap}>
              {person.looking_for.map((g) => (
                <Text key={g} style={styles.greenTag}>{g}</Text>
              ))}
            </View>
          </>
        )}

        {person.availability.length > 0 && (
          <>
            <Text style={styles.section}>Availability</Text>
            <View style={styles.wrap}>
              {person.availability.map((a) => (
                <View key={a} style={styles.avail}>
                  <Ionicons name={AVAIL_ICONS[a] ?? "time-outline"} size={16} color={colors.text} />
                  <Text style={styles.availText}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  banner: { height: 220, alignItems: "center", justifyContent: "center" },
  bannerLetter: { fontSize: 110, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  back: { position: "absolute", top: 56, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  menu: { position: "absolute", top: 56, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center", padding: 0 },
  sheet: { marginTop: -28, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 6 },
  name: { fontSize: 32, fontWeight: "700", color: colors.text },
  soft: { color: colors.textSoft, fontSize: 14 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  tag: { backgroundColor: colors.chip, color: colors.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: "hidden" },
  greenTag: { backgroundColor: "#DDF3E4", color: "#1F6B3A", fontSize: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: "hidden" },
  actions: { marginVertical: 12 },
  section: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 4 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  avail: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: colors.chip, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  availText: { color: colors.text, fontSize: 14 },
});