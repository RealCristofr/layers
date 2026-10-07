import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ConnectButton from "../components/ConnectButton";
import { ProfileData } from "../components/ProfileForm";
import PublicProfile from "../components/PublicProfile";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

type Person = ProfileData & { id: string };

const ROLE_FILTERS = ["All", "Vocals", "Guitar", "Producer", "Bass", "Drums", "Keys"];
const GENRE_FILTERS = ["Indie", "Shoegaze", "Pop", "Dream Pop", "Lo-fi", "My city"];

const AVATAR_PALETTES = [
  { bg: "#E8C2D8", fg: "#3F182F", border: "#F6D7EA" },
  { bg: "#C6C2ED", fg: "#231E4E", border: "#DDD9F8" },
  { bg: "#F5C7CE", fg: "#4A1822", border: "#FBD9DF" },
  { bg: "#C0E0F4", fg: "#18364A", border: "#D8EFFD" },
  { bg: "#E8CEE8", fg: "#3B1D3D", border: "#F5DCF5" },
];

const paletteFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[hash];
};

const cityKey = (city: string | null | undefined) =>
  (city ?? "").split(",")[0].trim().toLowerCase();

const openChat = (connectionId: string, name: string) => {
  router.navigate({
    pathname: "/messages",
    params: { open: connectionId, name, t: String(Date.now()) },
  });
};

export default function Discover() {
  const [people, setPeople] = useState<Person[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [myCity, setMyCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selected, setSelected] = useState<Person | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const myId = sessionData.session?.user.id;
    if (!myId) return;
    setMe(myId);

    const { data: mine } = await supabase.from("profiles").select("city").eq("id", myId).maybeSingle();
    setMyCity(mine?.city ?? null);

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
    const pal = paletteFor(selected.username);
    return (
      <PublicProfile
        person={selected}
        me={me}
        color={pal.bg}
        onBack={() => {
  setSelected(null);
  load();
}}
        onMessage={(connectionId) => openChat(connectionId, selected.username)}
      />
    );
  }

  const needsCity = selectedGenre === "My city" && !cityKey(myCity);

  const shown = people.filter((p) => {
    if (!p.username) return false;
    const text = `${p.username} ${p.roles.join(" ")} ${p.city ?? ""} ${p.genres.join(" ")} ${p.tagline ?? ""} ${p.bio ?? ""}`.toLowerCase();
    if (!text.includes(query.toLowerCase())) return false;

    if (selectedRole !== "All") {
      const hasRole = p.roles.some((r) => r.toLowerCase().includes(selectedRole.toLowerCase()));
      if (!hasRole) return false;
    }

    if (selectedGenre) {
      if (selectedGenre === "My city") {
        const mine = cityKey(myCity);
        return !!mine && cityKey(p.city) === mine;
      }
      const hasGenre = p.genres.some((g) => g.toLowerCase().includes(selectedGenre.toLowerCase()));
      if (!hasGenre) return false;
    }

    return true;
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 18, paddingTop: 52, paddingBottom: 50 }}>
      <View style={styles.header}>
        <View style={styles.brandingWrap}>
          <View style={styles.brushWash}>
            <Text style={styles.brandTitle}>gigly</Text>
          </View>
          <Text style={styles.brandSubtitle}>MUSIC SOUNDS BETTER TOGETHER</Text>
        </View>

        <View style={styles.handwrittenWrap}>
          <Text style={styles.handwrittenText}>find your</Text>
          <Text style={styles.handwrittenText}>people ♡</Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#7E7295" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search musicians, genres, or locations..."
          placeholderTextColor="#958CA8"
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color="#958CA8" />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {ROLE_FILTERS.map((r) => {
          const active = selectedRole === r;
          return (
            <Pressable
              key={r}
              onPress={() => setSelectedRole(r)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{r}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { marginBottom: 16 }]}>
        {GENRE_FILTERS.map((g) => {
          const active = selectedGenre === g;
          return (
            <Pressable
              key={g}
              onPress={() => setSelectedGenre(active ? null : g)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              {g === "My city" && (
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={active ? "#FFFFFF" : "#4A3C64"}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{g}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />}

      {!loading && people.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={32} color={colors.accent} />
          <Text style={styles.emptyTitle}>You're one of the first musicians here!</Text>
          <Text style={styles.emptySub}>
            Invite other artists or add a demo from your Profile to get the music started.
          </Text>
        </View>
      )}

      {!loading && needsCity && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Add your city first</Text>
          <Text style={styles.emptySub}>
            Go to Profile, then Edit profile, and add your city to see musicians near you.
          </Text>
        </View>
      )}

      {!loading && !needsCity && people.length > 0 && shown.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No musicians match this filter</Text>
          <Text style={styles.emptySub}>Try picking "All" or clearing your search term.</Text>
        </View>
      )}

      {!needsCity &&
        shown.map((p) => {
          const pal = paletteFor(p.username);
          const tagline = p.tagline?.trim() || p.bio?.slice(0, 70).trim() || "";
          const rolesText = p.roles.join(", ");

          return (
            <Pressable
              key={p.id}
              onPress={() => setSelected(p)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                  <Text style={[styles.avatarLetter, { color: pal.fg }]}>
                    {p.username[0].toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.cardUsername}>{p.username}</Text>

                {!!rolesText && <Text style={styles.cardRole}>{rolesText}</Text>}

                {!!p.city && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={12} color="#7E7295" />
                    <Text style={styles.locationText}>{p.city}</Text>
                  </View>
                )}

                {!!tagline && (
                  <Text style={styles.cardTagline} numberOfLines={2}>
                    {tagline}
                  </Text>
                )}

                <View style={styles.cardBottomRow}>
                  <View style={styles.genresRow}>
                    {p.genres.slice(0, 3).map((g) => (
                      <View key={g} style={styles.miniGenrePill}>
                        <Text style={styles.miniGenreText}>{g}</Text>
                      </View>
                    ))}
                  </View>

                  {!!me && (
                    <View style={{ marginLeft: "auto" }}>
                      <ConnectButton
                        me={me}
                        otherId={p.id}
                        compact
                        onMessage={(connectionId) => openChat(connectionId, p.username)}
                      />
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAF7FB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    marginTop: 4,
  },
  brandingWrap: {
    alignItems: "flex-start",
  },
  brushWash: {
    backgroundColor: "#F7D5E5",
    paddingHorizontal: 12,
    paddingVertical: 1,
    borderRadius: 14,
    transform: [{ rotate: "-1.5deg" }],
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#28173E",
    letterSpacing: -0.8,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#7E7295",
    marginTop: 6,
  },
  handwrittenWrap: {
    alignItems: "flex-end",
    paddingTop: 4,
  },
  handwrittenText: {
    fontSize: 13,
    color: "#7E7295",
    fontStyle: "italic",
    fontWeight: "500",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "#EAE0F2",
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    marginVertical: 12,
    shadowColor: "#28173E",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#241838",
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECE5F8",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 7,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#BD6188",
  },
  filterPillText: {
    color: "#4A3C64",
    fontSize: 13,
    fontWeight: "500",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#241838",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    color: "#7E7295",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0E6F6",
    shadowColor: "#28173E",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
    alignItems: "flex-start",
  },
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: "700",
  },
  infoCol: {
    flex: 1,
  },
  cardUsername: {
    fontSize: 17,
    fontWeight: "700",
    color: "#241838",
    letterSpacing: -0.3,
  },
  cardRole: {
    fontSize: 13,
    fontWeight: "500",
    color: "#54466E",
    marginTop: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: "#7E7295",
  },
  cardTagline: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#483C62",
    marginTop: 4,
    marginBottom: 6,
    lineHeight: 18,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  genresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    flex: 1,
    marginRight: 8,
  },
  miniGenrePill: {
    backgroundColor: "#F2EAF6",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  miniGenreText: {
    fontSize: 11,
    color: "#52436D",
    fontWeight: "500",
  },
});