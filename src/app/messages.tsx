import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ChatScreen from "../components/ChatScreen";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

type Row = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  requester: any;
  addressee: any;
};

type Msg = {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const AVATAR_COLORS = ["#E9C6DD", "#C9C3EC", "#F2C9D3", "#CFE0F0"];
const nameOf = (p: any): string => (Array.isArray(p) ? p[0]?.username : p?.username) ?? "someone";
const colorFor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const shortTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function Messages() {
  const params = useLocalSearchParams<{ open?: string; name?: string; t?: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    setMe(sessionData.session?.user.id ?? null);

    const { data: conns } = await supabase
      .from("connections")
      .select(
        "id, requester_id, addressee_id, status, created_at, requester:profiles!connections_requester_id_fkey(username), addressee:profiles!connections_addressee_id_fkey(username)"
      )
      .order("created_at", { ascending: false });
    setRows((conns as any) ?? []);

    const { data: recent } = await supabase
      .from("messages")
      .select("id, connection_id, sender_id, body, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(300);
    setMsgs((recent as Msg[]) ?? []);

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
        if (chat) {
          setChat(null);
          load();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [chat, load])
  );

  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`inbox-${me}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, load]);

  useEffect(() => {
    if (params.open && params.name) {
      setChat({ id: String(params.open), name: String(params.name) });
    }
  }, [params.open, params.name, params.t]);

  if (chat && me) {
    return (
      <ChatScreen
        connectionId={chat.id}
        me={me}
        otherName={chat.name}
        onBack={() => {
          setChat(null);
          load();
        }}
      />
    );
  }

  const accept = async (id: string) => {
    const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", id);
    if (error) Alert.alert("Something went wrong", error.message);
    load();
  };

  const decline = async (id: string) => {
    const { error } = await supabase.from("connections").delete().eq("id", id);
    if (error) Alert.alert("Something went wrong", error.message);
    load();
  };

  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === me);
  const otherName = (r: Row) => nameOf(r.requester_id === me ? r.addressee : r.requester);

  const conversations = rows
    .filter((r) => r.status === "accepted")
    .map((r) => {
      const mine = msgs.filter((m) => m.connection_id === r.id);
      const last = mine[0] ?? null;
      const unread = mine.filter((m) => m.sender_id !== me && !m.read_at).length;
      return { row: r, last, unread, sortKey: last?.created_at ?? r.created_at };
    })
    .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 40 }}>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>Take your time, there's no rush</Text>

      {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />}

      {!loading && incoming.length > 0 && (
        <>
          <Text style={styles.section}>Requests</Text>
          {incoming.map((r) => {
            const name = nameOf(r.requester);
            return (
              <View key={r.id} style={styles.item}>
                <View style={[styles.avatar, { backgroundColor: colorFor(name) }]}>
                  <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.soft}>wants to connect</Text>
                </View>
                <Pressable style={({ pressed }) => [styles.accept, pressed && { opacity: 0.6 }]} onPress={() => accept(r.id)}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.decline, pressed && { opacity: 0.6 }]} onPress={() => decline(r.id)}>
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </View>
            );
          })}
        </>
      )}

      {!loading && (
        <>
          <Text style={styles.section}>Conversations</Text>
          {conversations.length === 0 && (
            <Text style={styles.empty}>
              No connections yet. Find someone in Discover and tap Connect. Once they accept, you can message each other here.
            </Text>
          )}
          {conversations.map(({ row, last, unread }) => {
            const name = otherName(row);
            const preview = last
              ? `${last.sender_id === me ? "You: " : ""}${last.body}`
              : "No messages yet. Say hi!";
            return (
              <Pressable
                key={row.id}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
                onPress={() => setChat({ id: row.id, name })}
              >
                <View style={[styles.avatar, { backgroundColor: colorFor(name) }]}>
                  <Text style={styles.avatarText}>{name[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={[styles.preview, unread > 0 && styles.previewUnread]} numberOfLines={1}>
                    {preview}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  {!!last && <Text style={styles.soft}>{shortTime(last.created_at)}</Text>}
                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 30, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textSoft, fontSize: 14, marginTop: 4, marginBottom: 16 },
  section: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 16, marginBottom: 10 },
  empty: { color: colors.textSoft, lineHeight: 22 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "600", color: colors.text },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  soft: { color: colors.textSoft, fontSize: 12 },
  preview: { color: colors.textSoft, fontSize: 14 },
  previewUnread: { color: colors.text, fontWeight: "700" },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  badgeText: { color: colors.onAccent, fontSize: 12, fontWeight: "700" },
  accept: { backgroundColor: colors.accent, borderRadius: radius.button, paddingHorizontal: 12, paddingVertical: 10 },
  acceptText: { color: colors.onAccent, fontWeight: "600", fontSize: 13 },
  decline: { backgroundColor: colors.chip, borderRadius: radius.button, paddingHorizontal: 12, paddingVertical: 10 },
  declineText: { color: colors.text, fontWeight: "600", fontSize: 13 },
});