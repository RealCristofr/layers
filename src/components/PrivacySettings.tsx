import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

export default function PrivacySettings({ userId }: { userId: string }) {
  const [hidden, setHidden] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("hidden")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setHidden(!!data?.hidden);
        setLoaded(true);
      });
  }, [userId]);

  const change = async (value: boolean) => {
    setHidden(value);
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ hidden: value }).eq("id", userId);
    setSaving(false);
    if (error) {
      setHidden(!value);
      Alert.alert("Couldn't update", error.message);
    }
  };

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Hide my profile</Text>
        <Text style={styles.sub}>
          You won't show up in Discover or on Home. People you're already connected with can still see you and message
          you.
        </Text>
      </View>
      <Switch
        value={hidden}
        onValueChange={change}
        disabled={!loaded || saving}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 8,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sub: { color: colors.textSoft, fontSize: 13, marginTop: 4, lineHeight: 18 },
});