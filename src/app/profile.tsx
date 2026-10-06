import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BlockedList from "../components/BlockedList";
import DemoSection from "../components/DemoSection";
import ProfileForm, { ProfileData } from "../components/ProfileForm";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

const AVAIL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Mornings: "sunny-outline",
  Evenings: "moon-outline",
  Weekends: "calendar-outline",
  "Open to remote": "globe-outline",
};

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      setTick((t) => t + 1);
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (editing) {
          setEditing(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [editing])
  );

  if (editing && userId) {
    return (
      <ProfileForm
        userId={userId}
        title="Edit profile"
        initial={profile}
        onSaved={() => {
          setEditing(false);
          load();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (!profile) return <View style={styles.screen} />;

  const subtitle = [profile.roles.join(", "), profile.city].filter(Boolean).join(" · ");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.banner}>
        <Text style={styles.bannerLetter}>{profile.username[0].toUpperCase()}</Text>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.name}>{profile.username}</Text>
        {!!subtitle && <Text style={styles.soft}>{subtitle}</Text>}

        {profile.genres.length > 0 && (
          <View style={styles.wrap}>
            {profile.genres.map((g) => (
              <Text key={g} style={styles.tag}>{g}</Text>
            ))}
          </View>
        )}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.soft}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.soft}>Following</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.soft}>Demos</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.actionDark, pressed && { opacity: 0.6 }]}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create-outline" size={18} color={colors.onAccent} />
            <Text style={styles.actionDarkText}>Edit profile</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionSoft, pressed && { opacity: 0.6 }]}
            onPress={() => supabase.auth.signOut()}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.text} />
            <Text style={styles.actionSoftText}>Log out</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>About</Text>
        <Text style={profile.bio ? styles.body : styles.soft}>
          {profile.bio || "Add a short bio so people know what you make."}
        </Text>

        {userId && <DemoSection userId={userId} editable />}

        {profile.looking_for.length > 0 && (
          <>
            <Text style={styles.section}>Looking for</Text>
            <View style={styles.wrap}>
              {profile.looking_for.map((g) => (
                <Text key={g} style={styles.greenTag}>{g}</Text>
              ))}
            </View>
          </>
        )}

        {profile.availability.length > 0 && (
          <>
            <Text style={styles.section}>Availability</Text>
            <View style={styles.wrap}>
              {profile.availability.map((a) => (
                <View key={a} style={styles.avail}>
                  <Ionicons name={AVAIL_ICONS[a] ?? "time-outline"} size={16} color={colors.text} />
                  <Text style={styles.availText}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {userId && <BlockedList key={tick} userId={userId} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  banner: { height: 220, backgroundColor: "#E9C6DD", alignItems: "center", justifyContent: "center" },
  bannerLetter: { fontSize: 110, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  sheet: { marginTop: -28, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 6 },
  name: { fontSize: 32, fontWeight: "700", color: colors.text },
  soft: { color: colors.textSoft, fontSize: 14 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 },
  tag: { backgroundColor: colors.chip, color: colors.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: "hidden" },
  greenTag: { backgroundColor: "#DDF3E4", color: "#1F6B3A", fontSize: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, overflow: "hidden" },
  stats: { flexDirection: "row", justifyContent: "space-around", marginVertical: 16 },
  stat: { alignItems: "center" },
  statNum: { fontSize: 24, fontWeight: "700", color: colors.text },
  actions: { flexDirection: "row", gap: 10, marginBottom: 8 },
  actionDark: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.text, borderRadius: radius.button + 4, paddingVertical: 16 },
  actionDarkText: { color: colors.onAccent, fontWeight: "600", fontSize: 16 },
  actionSoft: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.chip, borderRadius: radius.button + 4, paddingVertical: 16 },
  actionSoftText: { color: colors.text, fontWeight: "600", fontSize: 16 },
  section: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 4 },
  body: { color: colors.text, fontSize: 16, lineHeight: 24 },
  avail: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: colors.chip, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  availText: { color: colors.text, fontSize: 14 },
});