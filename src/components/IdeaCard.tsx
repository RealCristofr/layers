import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";
import DemoPlayer from "./DemoPlayer";
import DemoUploader from "./DemoUploader";

type Author = { username: string } | { username: string }[] | null;

export type Idea = {
  id: string;
  title: string;
  path: string;
  duration_seconds: number | null;
  needs: string[];
  user_id: string;
  profiles: Author;
};

type Layer = {
  id: string;
  title: string;
  path: string;
  duration_seconds: number | null;
  user_id: string;
  profiles: Author;
};

const AVATAR_COLORS = ["#E9C6DD", "#C9C3EC", "#F2C9D3", "#CFE0F0"];
const nameOf = (p: Author) => (Array.isArray(p) ? p[0]?.username : p?.username) ?? "someone";

export default function IdeaCard({ idea, me }: { idea: Idea; me: string | null }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [showLayers, setShowLayers] = useState(false);
  const [adding, setAdding] = useState(false);

  const name = nameOf(idea.profiles);
  const mine = me === idea.user_id;
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  const loadLayers = useCallback(async () => {
    const { data } = await supabase
      .from("demos")
      .select("id, title, path, duration_seconds, user_id, profiles(username)")
      .eq("parent_id", idea.id)
      .order("created_at", { ascending: true });
    setLayers((data as any) ?? []);
  }, [idea.id]);

  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.name}>{name}</Text>
          {mine && <Text style={styles.soft}>Your idea</Text>}
        </View>
      </View>

      <DemoPlayer demo={idea} />

      {idea.needs.length > 0 && (
        <View style={styles.needRow}>
          <Text style={styles.soft}>Needs</Text>
          {idea.needs.map((n) => (
            <Text key={n} style={styles.need}>{n}</Text>
          ))}
        </View>
      )}

      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.layersBtn, pressed && { opacity: 0.6 }]}
          onPress={() => setShowLayers(!showLayers)}
        >
          <Ionicons name="layers-outline" size={16} color={colors.text} />
          <Text style={styles.layersText}>{layers.length === 1 ? "1 layer" : `${layers.length} layers`}</Text>
        </Pressable>
        {!mine && !!me && !adding && (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
            onPress={() => setAdding(true)}
          >
            <Text style={styles.addText}>Add a layer</Text>
          </Pressable>
        )}
      </View>

      {adding && !!me && (
        <DemoUploader
          userId={me}
          parentId={idea.id}
          onDone={() => {
            setAdding(false);
            setShowLayers(true);
            loadLayers();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {showLayers && layers.length === 0 && <Text style={styles.soft}>No layers yet. Be the first to add one.</Text>}

      {showLayers &&
        layers.map((l) => (
          <View key={l.id}>
            <Text style={styles.layerBy}>{nameOf(l.profiles)} added a layer</Text>
            <DemoPlayer demo={l} />
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "600", color: colors.text },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  soft: { color: colors.textSoft, fontSize: 13 },
  needRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  need: { backgroundColor: "#DDF3E4", color: "#1F6B3A", fontSize: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, overflow: "hidden" },
  layersBtn: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: colors.chip, borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 10 },
  layersText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  addBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: radius.button, paddingVertical: 12, alignItems: "center" },
  addText: { color: colors.onAccent, fontWeight: "600" },
  layerBy: { color: colors.textSoft, fontSize: 12, marginBottom: 4 },
});