import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

type Item = { blocked_id: string; blocked_username: string | null };

export default function BlockedList({ userId }: { userId: string }) {
  const [items, setItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("blocks")
      .select("blocked_id, blocked_username")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });
    setItems((data as Item[]) ?? []);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const unblock = (item: Item) => {
    const name = item.blocked_username ?? "this person";
    Alert.alert(`Unblock ${name}?`, "They'll be able to find your profile and send you requests again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          const { error } = await supabase
            .from("blocks")
            .delete()
            .eq("blocker_id", userId)
            .eq("blocked_id", item.blocked_id);
          if (error) Alert.alert("Couldn't unblock", error.message);
          load();
        },
      },
    ]);
  };

  return (
    <View>
      <Text style={styles.section}>Blocked users</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>You haven't blocked anyone.</Text>
      ) : (
        items.map((b) => (
          <View key={b.blocked_id} style={styles.row}>
            <Text style={styles.name}>{b.blocked_username ?? "Unknown user"}</Text>
            <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]} onPress={() => unblock(b)}>
              <Text style={styles.btnText}>Unblock</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 8 },
  empty: { color: colors.textSoft, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 12, marginBottom: 8 },
  name: { color: colors.text, fontSize: 16, fontWeight: "600" },
  btn: { backgroundColor: colors.chip, borderRadius: radius.button, paddingHorizontal: 14, paddingVertical: 8 },
  btnText: { color: colors.text, fontWeight: "600", fontSize: 14 },
});