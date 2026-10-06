import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";
import Waveform from "./Waveform";

export type Demo = {
  id: string;
  title: string;
  path: string;
  duration_seconds: number | null;
};

const fmt = (s: number | null) => {
  if (!s) return "";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function DemoPlayer({ demo, onDelete }: { demo: Demo; onDelete?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: urlError } = await supabase.storage
        .from("demos")
        .createSignedUrl(demo.path, 3600);
      if (cancelled) return;
      if (urlError || !data) setError(urlError?.message ?? "Couldn't find this file.");
      else setUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [demo.path]);

  const source = useMemo(() => (url ? { uri: url } : null), [url]);
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (!url || status.isLoaded) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [url, status.isLoaded]);

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;

  const toggle = async () => {
    if (error) {
      Alert.alert("Couldn't load this demo", error);
      return;
    }
    if (!url) return;
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (status.duration > 0 && status.currentTime >= status.duration - 0.1) {
        await player.seekTo(0);
      }
      player.play();
    } catch (e: any) {
      Alert.alert("Playback problem", e?.message ?? "Something went wrong.");
    }
  };

  return (
    <View style={styles.card}>
      <Pressable style={({ pressed }) => [styles.play, pressed && { opacity: 0.6 }]} onPress={toggle}>
        {!url && !error ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Ionicons name={status.playing ? "pause" : "play"} size={20} color={colors.onAccent} />
        )}
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.title} numberOfLines={1}>{demo.title}</Text>
          <Text style={styles.soft}>{fmt(demo.duration_seconds)}</Text>
        </View>
        <Waveform progress={progress} />
        {!!error && <Text style={styles.error}>Couldn't load this demo</Text>}
        {slow && (
          <Text style={styles.error}>
            This is taking too long to load. The file may be empty, so try recording it again.
          </Text>
        )}
      </View>
      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={colors.textSoft} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 10 },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontWeight: "600", fontSize: 15, flex: 1, marginRight: 8 },
  soft: { color: colors.textSoft, fontSize: 13 },
  error: { color: "#B3402F", fontSize: 12 },
});