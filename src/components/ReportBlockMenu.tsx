import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    View,
    ViewStyle,
} from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

const REASONS = [
  { key: "spam", label: "Spam or scams" },
  { key: "harassment", label: "Harassment or bullying" },
  { key: "inappropriate", label: "Inappropriate content" },
  { key: "impersonation", label: "Pretending to be someone else" },
  { key: "other", label: "Something else" },
];

type Props = {
  me: string;
  otherId: string;
  otherName: string;
  onBlocked: () => void;
  buttonStyle?: StyleProp<ViewStyle>;
  iconColor?: string;
};

export default function ReportBlockMenu({ me, otherId, otherName, onBlocked, buttonStyle, iconColor }: Props) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const block = async () => {
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: me, blocked_id: otherId, blocked_username: otherName });
    if (error && error.code !== "23505") {
      Alert.alert("Couldn't block", error.message);
      return;
    }
    await supabase
      .from("connections")
      .delete()
      .or(
        `and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`
      );
    onBlocked();
  };

  const confirmBlock = () =>
    Alert.alert(
      `Block ${otherName}?`,
      "They won't be able to see your profile or send you requests, and your chat with them will be deleted. You can unblock them any time from Privacy and safety in your profile settings.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: block },
      ]
    );

  const openMenu = () =>
    Alert.alert(otherName, undefined, [
      { text: "Report", onPress: () => setReporting(true) },
      { text: "Block", style: "destructive", onPress: confirmBlock },
      { text: "Cancel", style: "cancel" },
    ]);

  const closeReport = () => {
    setReporting(false);
    setReason(null);
    setDetails("");
  };

  const sendReport = async () => {
    if (!reason) {
      Alert.alert("Pick a reason", "Choose what best describes the problem.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("reports")
      .insert({ reporter_id: me, reported_id: otherId, reason, details: details.trim() || null });
    setBusy(false);
    if (error) {
      Alert.alert("Couldn't send report", error.message);
      return;
    }
    closeReport();
    Alert.alert("Report sent", "Thank you for letting us know. Would you also like to block them?", [
      { text: "Not now", style: "cancel" },
      { text: "Block", style: "destructive", onPress: block },
    ]);
  };

  return (
    <>
      <Pressable onPress={openMenu} hitSlop={10} style={[styles.btn, buttonStyle]}>
        <Ionicons name="ellipsis-horizontal" size={22} color={iconColor ?? colors.text} />
      </Pressable>

      <Modal visible={reporting} transparent animationType="slide" onRequestClose={closeReport}>
        <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
          <View style={styles.sheet}>
            <Text style={styles.title}>Report {otherName}</Text>
            <Text style={styles.sub}>Reports are private. {otherName} won't be told who reported them.</Text>

            {REASONS.map((r) => {
              const on = reason === r.key;
              return (
                <Pressable key={r.key} style={styles.reasonRow} onPress={() => setReason(r.key)}>
                  <Ionicons
                    name={on ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={on ? colors.accent : colors.textSoft}
                  />
                  <Text style={styles.reasonText}>{r.label}</Text>
                </Pressable>
              );
            })}

            <TextInput
              style={styles.input}
              placeholder="Anything else we should know? (optional)"
              placeholderTextColor={colors.textSoft}
              value={details}
              onChangeText={setDetails}
              maxLength={500}
              multiline
            />

            <Pressable
              style={({ pressed }) => [styles.send, (pressed || busy) && { opacity: 0.6 }]}
              onPress={sendReport}
              disabled={busy}
            >
              <Text style={styles.sendText}>{busy ? "Sending..." : "Send report"}</Text>
            </Pressable>
            <Pressable onPress={closeReport} disabled={busy}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 6 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  sub: { color: colors.textSoft, fontSize: 14, marginBottom: 4 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  reasonText: { color: colors.text, fontSize: 16 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: 14, minHeight: 80, color: colors.text, fontSize: 15, textAlignVertical: "top", marginTop: 6 },
  send: { backgroundColor: colors.accent, borderRadius: radius.button, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  sendText: { color: colors.onAccent, fontWeight: "600", fontSize: 16 },
  cancel: { color: colors.textSoft, textAlign: "center", paddingTop: 6 },
});