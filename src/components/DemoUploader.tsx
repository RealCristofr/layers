import { Ionicons } from "@expo/vector-icons";
import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NEEDS } from "../lib/options";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

const MAX_SECONDS = 60;
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_BYTES = 2000;

async function readFileBytes(uri: string): Promise<any> {
  try {
    return await new File(uri).bytes();
  } catch {
    return await fetch(uri).then((r) => r.arrayBuffer());
  }
}

type Props = {
  userId: string;
  parentId?: string;
  onDone: () => void;
  onCancel: () => void;
};

export default function DemoUploader({ userId, parentId, onDone, onCancel }: Props) {
  const isLayer = !!parentId;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [title, setTitle] = useState(isLayer ? "My layer" : "");
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [mime, setMime] = useState("audio/mp4");
  const [ext, setExt] = useState("m4a");
  const [duration, setDuration] = useState<number | null>(null);
  const [openForLayers, setOpenForLayers] = useState(true);
  const [needs, setNeeds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const secondsRecorded = Math.round((recState.durationMillis ?? 0) / 1000);

  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Microphone needed", "Allow microphone access to record.");
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      setFileUri(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e: any) {
      Alert.alert("Couldn't start recording", e?.message ?? "Something went wrong.");
    }
  };

  const stopRecording = async () => {
    const secs = Math.round((recState.durationMillis ?? 0) / 1000);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch (e: any) {
      Alert.alert("Couldn't stop recording", e?.message ?? "Something went wrong.");
      return;
    }
    if (secs < 1) {
      Alert.alert("Too short", "Record at least a second or two, then try again.");
      return;
    }
    if (recorder.uri) {
      setFileUri(recorder.uri);
      setFileLabel(`Recording (${secs}s)`);
      setMime("audio/mp4");
      setExt("m4a");
      setDuration(secs);
    } else {
      Alert.alert("Nothing was recorded", "Please try recording again.");
    }
  };

  useEffect(() => {
    if (recState.isRecording && secondsRecorded >= MAX_SECONDS) stopRecording();
  }, [secondsRecorded]);

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    if (a.size && a.size > MAX_BYTES) {
      Alert.alert("File too large", "Please pick an audio file under 10 MB.");
      return;
    }
    setFileUri(a.uri);
    setFileLabel(a.name);
    setMime(a.mimeType ?? "audio/mpeg");
    setExt(a.name.split(".").pop()?.toLowerCase() ?? "m4a");
    setDuration(null);
    if (!isLayer && !title) setTitle(a.name.replace(/\.[^.]+$/, "").slice(0, 60));
  };

  const toggleNeed = (n: string) => {
    setNeeds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  const upload = async () => {
    if (!fileUri) return;
    if (!title.trim()) {
      Alert.alert("Add a title", "Give it a short name.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await readFileBytes(fileUri);
      if (!bytes || bytes.byteLength < MIN_BYTES) {
        throw new Error("That recording came out empty. Please record it again.");
      }
      if (bytes.byteLength > MAX_BYTES) {
        throw new Error("That file is over 10 MB. Please pick a shorter one.");
      }

      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("demos").upload(path, bytes, { contentType: mime });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("demos").insert({
        user_id: userId,
        title: title.trim(),
        path,
        duration_seconds: duration,
        parent_id: parentId ?? null,
        needs: isLayer || !openForLayers ? [] : needs,
        open_for_layers: isLayer ? false : openForLayers,
      });
      if (dbErr) throw dbErr;

      onDone();
    } catch (e: any) {
      Alert.alert("Couldn't upload", e?.message ?? "Something went wrong.");
    }
    setBusy(false);
  };

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>{isLayer ? "Record your layer" : "Share an idea"}</Text>
      <View style={styles.row}>
        {recState.isRecording ? (
          <Pressable style={[styles.recBtn, { backgroundColor: "#D9534F" }]} onPress={stopRecording}>
            <Ionicons name="stop" size={18} color={colors.onAccent} />
            <Text style={styles.recText}>Stop · {secondsRecorded}s</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.recBtn} onPress={startRecording}>
            <Ionicons name="mic-outline" size={18} color={colors.onAccent} />
            <Text style={styles.recText}>Record</Text>
          </Pressable>
        )}
        <Pressable style={styles.pickBtn} onPress={pickFile} disabled={recState.isRecording}>
          <Ionicons name="folder-open-outline" size={18} color={colors.text} />
          <Text style={styles.pickText}>Upload file</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Short ideas work best (up to {MAX_SECONDS} seconds). Files up to 10 MB.</Text>

      {!!fileUri && (
        <>
          <Text style={styles.ready}>Ready: {fileLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={isLayer ? "Name your layer" : "Title, e.g. late night loop"}
            placeholderTextColor={colors.textSoft}
            maxLength={60}
            value={title}
            onChangeText={setTitle}
          />

          {!isLayer && (
            <>
              <Pressable style={styles.checkRow} onPress={() => setOpenForLayers(!openForLayers)}>
                <Ionicons
                  name={openForLayers ? "checkbox" : "square-outline"}
                  size={22}
                  color={openForLayers ? colors.accent : colors.textSoft}
                />
                <Text style={styles.checkText}>Open for layers (shows on the Home feed)</Text>
              </Pressable>

              {openForLayers && (
                <>
                  <Text style={styles.ready}>What does it need?</Text>
                  <View style={styles.wrap}>
                    {NEEDS.map((n) => {
                      const on = needs.includes(n);
                      return (
                        <Pressable key={n} onPress={() => toggleNeed(n)} style={[styles.chip, on && styles.chipOn]}>
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{n}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.save, (pressed || busy) && { opacity: 0.6 }]}
            onPress={upload}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.saveText}>{isLayer ? "Share layer" : "Share idea"}</Text>
            )}
          </Pressable>
        </>
      )}

      <Pressable onPress={onCancel} disabled={busy}>
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10, marginVertical: 8 },
  heading: { color: colors.text, fontWeight: "700", fontSize: 16 },
  row: { flexDirection: "row", gap: 10 },
  recBtn: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent, borderRadius: radius.button, paddingVertical: 14 },
  recText: { color: colors.onAccent, fontWeight: "600" },
  pickBtn: { flex: 1, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.chip, borderRadius: radius.button, paddingVertical: 14 },
  pickText: { color: colors.text, fontWeight: "600" },
  hint: { color: colors.textSoft, fontSize: 12 },
  ready: { color: colors.text, fontSize: 14 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 14, height: 48, color: colors.text, fontSize: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkText: { color: colors.text, fontSize: 14, flex: 1 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.chip, borderRadius: radius.chip, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextOn: { color: colors.onAccent, fontWeight: "600" },
  save: { backgroundColor: colors.text, borderRadius: radius.button, paddingVertical: 14, alignItems: "center" },
  saveText: { color: colors.onAccent, fontWeight: "600", fontSize: 16 },
  cancel: { color: colors.textSoft, textAlign: "center", paddingTop: 4 },
});