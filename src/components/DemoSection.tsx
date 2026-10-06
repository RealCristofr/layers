import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";
import DemoPlayer, { Demo } from "./DemoPlayer";
import DemoUploader from "./DemoUploader";

type Props = { userId: string; editable?: boolean };
type Row = Demo & { user_id: string };

export default function DemoSection({ userId, editable = false }: Props) {
  const [demos, setDemos] = useState<Row[]>([]);
  const [adding, setAdding] = useState(false);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    const { data } = await supabase
      .from("demos")
      .select("id, title, path, duration_seconds, user_id")
      .eq("user_id", userId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });
    if (request !== latest.current) return;
    setDemos(((data as Row[]) ?? []).filter((d) => d.user_id === userId));
  }, [userId]);

  useEffect(() => {
    setDemos([]);
    setAdding(false);
    load();
  }, [load]);

  const remove = (d: Demo) => {
    Alert.alert("Delete this demo?", d.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.storage.from("demos").remove([d.path]);
          await supabase.from("demos").delete().eq("id", d.id);
          load();
        },
      },
    ]);
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.section}>Demos</Text>
        {editable && !adding && (
          <Pressable style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]} onPress={() => setAdding(true)}>
            <Text style={styles.addText}>Add a demo</Text>
          </Pressable>
        )}
      </View>

      {adding && (
        <DemoUploader
          userId={userId}
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {demos.length === 0 && !adding && (
        <Text style={styles.empty}>
          {editable ? "Share a short idea so people can hear what you make." : "No demos yet."}
        </Text>
      )}

      {demos.map((d) => (
        <DemoPlayer key={d.id} demo={d} onDelete={editable ? () => remove(d) : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 },
  section: { fontSize: 20, fontWeight: "700", color: colors.text },
  addBtn: { backgroundColor: colors.chip, borderRadius: radius.chip, paddingHorizontal: 14, paddingVertical: 8 },
  addText: { color: colors.text, fontWeight: "600", fontSize: 14 },
  empty: { color: colors.textSoft, fontSize: 14 },
});