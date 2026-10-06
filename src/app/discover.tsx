import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import ConnectButton from "../components/ConnectButton";
import { ProfileData } from "../components/ProfileForm";
import PublicProfile from "../components/PublicProfile";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

type Person = ProfileData & { id: string };

const AVATAR_COLORS = ["#E8D5E5", "#C6C4EC", "#F2C8D6", "#CFE2F2"];
const FILTERS = ["All", "Vocals", "Guitar", "Bass", "Drums", "Producer", "Indie", "Shoegaze", "Pop", "Hip-Hop"];

const colorFor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const openChat = (connectionId: string, name: string) => {
  router.navigate({
    pathname: "/messages",
    params: { open: connectionId, name, t: String(Date.now()) },
  });
};

export default function Discover() {
  const [people, setPeople] = useState<Person[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Person | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const myId = sessionData.session?.user.id;
    if (!myId) return;
    setMe(myId);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", myId)
      .order("updated_at", { ascending: false });
    if (!error && data) setPeople(data as Person[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (selected) {
          setSelected(null);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [selected])
  );

  if (selected && me) {
    return (
      <PublicProfile
        person={selected}
        me={me}
        color={colorFor(selected.username)}
        onBack={() => setSelected(null)}
        onMessage={(connectionId) => openChat(connectionId, selected.username)}
      />
    );
  }

  const shown = people.filter((p) => {
    if (!p.username) return false;
    const text = `${p.username} ${p.roles.join(" ")} ${p.city ?? ""} ${p.genres.join(" ")} ${p.bio ?? ""}`.toLowerCase();
    if (!text.includes(query.toLowerCase())) return false;
    if (filter === "All") return true;
    return p.roles.includes(filter) || p.genres.some((g) => g.includes(filter));
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }}>
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>Find people who make music like you</Text>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.textSoft} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search musicians, genres, or places"
          placeholderTextColor={colors.textSoft}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}

      {!loading && people.length === 0 && (
        <Text style={styles.empty}>
          You're one of the first here. Invite a musician friend and they'll show up in this list.
        </Text>
      )}

      {!loading && people.length > 0 && shown.length === 0 && (
        <Text style={styles.empty}>No one matches yet. Try a different filter or search.</Text>
      )}

      {shown.map((p) => {
        const subtitle = [p.roles.join(", "), p.city].filter(Boolean).join(" · ");
        return (
          <Pressable
            key={p.id}
            onPress={() => setSelected(p)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.avatar, { backgroundColor: colorFor(p.username) }]}>
              <Text style={styles.avatarText}>{p.username[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name}>{p.username}</Text>
              {!!subtitle && <Text style={styles.soft}>{subtitle}</Text>}
              {!!p.bio && <Text style={styles.bio} numberOfLines={2}>{p.bio}</Text>}
              <View style={styles.tagRow}>
                {p.genres.slice(0, 3).map((g) => (
                  <Text key={g} style={styles.tag}>{g}</Text>
                ))}
              </View>
              {!!me && (
                <View style={{ marginTop: 4 }}>
                  <ConnectButton
                    me={me}
                    otherId={p.id}
                    onMessage={(connectionId) => openChat(connectionId, p.username)}
                  />
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 30, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textSoft, fontSize: 14, marginTop: 4, marginBottom: 16 },
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 48, marginBottom: 14 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  chip: { backgroundColor: colors.chip, borderRadius: radius.chip, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextActive: { color: colors.onAccent, fontWeight: "600" },
  empty: { color: colors.textSoft, textAlign: "center", marginTop: 24, lineHeight: 22 },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontWeight: "600", color: colors.text },
  name: { fontSize: 18, fontWeight: "600", color: colors.text },
  soft: { color: colors.textSoft, fontSize: 13 },
  bio: { color: colors.text, fontSize: 14 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 4 },
  tag: { backgroundColor: colors.chip, color: colors.text, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: "hidden" },
});