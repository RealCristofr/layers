import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";
import ReportBlockMenu from "./ReportBlockMenu";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  delivered_at: string | null;
};

type Props = {
  connectionId: string;
  me: string;
  otherName: string;
  onBack: () => void;
};

const COLUMNS = "id, sender_id, body, created_at, read_at, delivered_at";

const STARTERS = [
  "Loved your sound, want to try a layer together?",
  "Hey! What are you working on right now?",
  "Your demo is great. Want to make something?",
];

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const statusOf = (m: Message): { icon: keyof typeof Ionicons.glyphMap; text: string; seen: boolean } => {
  if (m.read_at) return { icon: "checkmark-done", text: `Seen ${timeOf(m.read_at)}`, seen: true };
  if (m.delivered_at) return { icon: "checkmark-done", text: "Delivered", seen: false };
  return { icon: "checkmark", text: "Sent", seen: false };
};

export default function ChatScreen({ connectionId, me, otherName, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherId, setOtherId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("connections")
      .select("requester_id, addressee_id")
      .eq("id", connectionId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOtherId(data.requester_id === me ? data.addressee_id : data.requester_id);
      });
  }, [connectionId, me]);

  const markRead = useCallback(async () => {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("connection_id", connectionId)
      .neq("sender_id", me)
      .is("read_at", null);
  }, [connectionId, me]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select(COLUMNS)
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as Message[]) ?? []);
    setLoading(false);
    markRead();
  }, [connectionId, markRead]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`chat-${connectionId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id !== me) markRead();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `connection_id=eq.${connectionId}`,
        },
        (payload) => {
          const u = payload.new as Message;
          setMessages((prev) =>
            prev.map((x) => (x.id === u.id ? { ...x, read_at: u.read_at, delivered_at: u.delivered_at } : x))
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, load, markRead, me]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ connection_id: connectionId, sender_id: me, body })
      .select(COLUMNS)
      .single();
    setSending(false);
    if (error) {
      Alert.alert("Couldn't send", error.message);
      return;
    }
    setText("");
    const m = data as Message;
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
  };

  const lastMine = [...messages].reverse().find((m) => m.sender_id === me);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerName}>{otherName}</Text>
        <View style={{ flex: 1 }} />
        {!!otherId && (
          <ReportBlockMenu me={me} otherId={otherId} otherName={otherName} onBlocked={onBack} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : messages.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Say hi to {otherName}</Text>
          <Text style={styles.emptySub}>Not sure what to say? Tap one to start.</Text>
          {STARTERS.map((s) => (
            <Pressable
              key={s}
              style={({ pressed }) => [styles.starter, pressed && { opacity: 0.6 }]}
              onPress={() => setText(s)}
            >
              <Text style={styles.starterText}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <FlatList
          data={[...messages].reverse()}
          inverted
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const mine = item.sender_id === me;
            const status = mine && item.id === lastMine?.id ? statusOf(item) : null;
            return (
              <View style={{ marginBottom: 8 }}>
                <View style={[styles.bubbleRow, mine && { justifyContent: "flex-end" }]}>
                  <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                    <Text style={[styles.bubbleText, mine && { color: colors.onAccent }]}>{item.body}</Text>
                    <Text style={[styles.time, mine && { color: "rgba(255,255,255,0.8)" }]}>
                      {timeOf(item.created_at)}
                    </Text>
                  </View>
                </View>
                {status && (
                  <View style={styles.statusRow}>
                    <Ionicons
                      name={status.icon}
                      size={14}
                      color={status.seen ? colors.accent : colors.textSoft}
                    />
                    <Text style={[styles.statusText, status.seen && { color: colors.accent }]}>
                      {status.text}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Write a message"
          placeholderTextColor={colors.textSoft}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, (pressed || sending || !text.trim()) && { opacity: 0.5 }]}
          onPress={send}
          disabled={sending || !text.trim()}
        >
          <Ionicons name="send" size={18} color={colors.onAccent} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  headerName: { fontSize: 20, fontWeight: "700", color: colors.text },
  emptyWrap: { flex: 1, padding: 24, gap: 10, justifyContent: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptySub: { color: colors.textSoft, textAlign: "center", marginBottom: 8 },
  starter: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 14 },
  starterText: { color: colors.text, fontSize: 15 },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { color: colors.text, fontSize: 16 },
  time: { color: colors.textSoft, fontSize: 11, marginTop: 4, alignSelf: "flex-end" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4, marginRight: 4 },
  statusText: { color: colors.textSoft, fontSize: 12 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, color: colors.text, fontSize: 16 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});