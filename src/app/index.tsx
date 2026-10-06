import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import IdeaCard, { Idea } from "../components/IdeaCard";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

export default function Home() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    setMe(sessionData.session?.user.id ?? null);
    const { data } = await supabase
      .from("demos")
      .select("id, title, path, duration_seconds, needs, user_id, profiles(username)")
      .is("parent_id", null)
      .eq("open_for_layers", true)
      .order("created_at", { ascending: false })
      .limit(30);
    setIdeas((data as any) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <Text style={styles.title}>Home</Text>
      <Text style={styles.subtitle}>Ideas waiting for a layer</Text>

      {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}

      {!loading && ideas.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.empty}>
            No open ideas yet. Go to your Profile, tap Add a demo, and share a short idea that's open for layers.
          </Text>
        </View>
      )}

      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} me={me} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 30, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textSoft, fontSize: 14, marginTop: 4, marginBottom: 20 },
  emptyBox: { marginTop: 24 },
  empty: { color: colors.textSoft, textAlign: "center", lineHeight: 22 },
});