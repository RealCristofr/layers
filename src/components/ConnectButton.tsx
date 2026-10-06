import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

type Conn = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

type Props = {
  me: string;
  otherId: string;
  compact?: boolean;
  onMessage?: (connectionId: string) => void;
};

export default function ConnectButton({ me, otherId, compact = false, onMessage }: Props) {
  const [conn, setConn] = useState<Conn | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("connections")
      .select("id, requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`
      )
      .maybeSingle();
    setConn((data as Conn) ?? null);
    setLoading(false);
  }, [me, otherId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const run = async (action: () => PromiseLike<any>) => {
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (res?.error) Alert.alert("Something went wrong", res.error.message);
    await load();
  };

  const connect = () => run(() => supabase.from("connections").insert({ requester_id: me, addressee_id: otherId }));
  const remove = () => run(() => supabase.from("connections").delete().eq("id", conn!.id));
  const accept = () => run(() => supabase.from("connections").update({ status: "accepted" }).eq("id", conn!.id));

  if (loading) return <ActivityIndicator color={colors.accent} style={{ height: compact ? 34 : 44 }} />;

  if (!conn) {
    return (
      <Pressable
        style={({ pressed }) => [
          compact ? styles.compactFilled : styles.filled,
          (pressed || busy) && { opacity: 0.6 },
        ]}
        onPress={connect}
        disabled={busy}
      >
        <Text style={compact ? styles.compactFilledText : styles.filledText}>Connect</Text>
      </Pressable>
    );
  }

  if (conn.status === "accepted") {
    return (
      <Pressable
        style={({ pressed }) => [
          compact ? styles.compactDark : styles.dark,
          pressed && { opacity: 0.6 },
        ]}
        onPress={() => (onMessage ? onMessage(conn.id) : Alert.alert("Opening chat..."))}
      >
        <Text style={compact ? styles.compactFilledText : styles.filledText}>Message</Text>
      </Pressable>
    );
  }

  if (conn.requester_id === me) {
    return (
      <Pressable
        style={({ pressed }) => [
          compact ? styles.compactOutline : styles.outline,
          (pressed || busy) && { opacity: 0.6 },
        ]}
        onPress={remove}
        disabled={busy}
      >
        <Text style={compact ? styles.compactOutlineText : styles.outlineText}>
          {compact ? "Requested" : "Requested · tap to cancel"}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [
          compact ? styles.compactFilled : [styles.filled, styles.flex],
          (pressed || busy) && { opacity: 0.6 },
        ]}
        onPress={accept}
        disabled={busy}
      >
        <Text style={compact ? styles.compactFilledText : styles.filledText}>Accept</Text>
      </Pressable>
      {!compact && (
        <Pressable
          style={({ pressed }) => [styles.soft, styles.flex, (pressed || busy) && { opacity: 0.6 }]}
          onPress={remove}
          disabled={busy}
        >
          <Text style={styles.softText}>Decline</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  filled: { backgroundColor: colors.accent, borderRadius: radius.button, paddingVertical: 12, alignItems: "center" },
  filledText: { color: colors.onAccent, fontWeight: "600" },
  dark: { backgroundColor: colors.text, borderRadius: radius.button, paddingVertical: 12, alignItems: "center" },
  outline: { borderWidth: 1, borderColor: colors.accent, borderRadius: radius.button, paddingVertical: 12, alignItems: "center" },
  outlineText: { color: colors.accent, fontWeight: "600" },
  soft: { backgroundColor: colors.chip, borderRadius: radius.button, paddingVertical: 12, alignItems: "center" },
  softText: { color: colors.text, fontWeight: "600" },

  // Compact card styles matching mockup
  compactFilled: {
    backgroundColor: "#BD6188",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  compactFilledText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  compactDark: {
    backgroundColor: "#241838",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
  },
  compactOutline: {
    backgroundColor: "#F0E8F6",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  compactOutlineText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
});