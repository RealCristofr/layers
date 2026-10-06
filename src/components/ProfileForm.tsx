import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { AVAILABILITY, GENRES, LOOKING_FOR, ROLES } from "../lib/options";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

export type ProfileData = {
  username: string;
  roles: string[];
  city: string | null;
  bio: string | null;
  genres: string[];
  looking_for: string[];
  availability: string[];
};

type Props = {
  userId: string;
  title: string;
  initial?: Partial<ProfileData> | null;
  onSaved: () => void;
  onCancel?: () => void;
};

function toggle(list: string[], item: string, max?: number) {
  if (list.includes(item)) return list.filter((x) => x !== item);
  if (max && list.length >= max) return list;
  return [...list, item];
}

function Chips({ options, selected, onPress }: { options: string[]; selected: string[]; onPress: (o: string) => void }) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <Pressable key={o} onPress={() => onPress(o)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ProfileForm({ userId, title, initial, onSaved, onCancel }: Props) {
  const [username, setUsername] = useState(initial?.username ?? "");
  const [roles, setRoles] = useState<string[]>(initial?.roles ?? []);
  const [city, setCity] = useState(initial?.city ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [lookingFor, setLookingFor] = useState<string[]>(initial?.looking_for ?? []);
  const [availability, setAvailability] = useState<string[]>(initial?.availability ?? []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const name = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(name)) {
      Alert.alert("Pick a username", "Use 3 to 24 letters, numbers, or underscores.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      username: name,
      roles,
      city: city.trim() || null,
      bio: bio.trim() || null,
      genres,
      looking_for: lookingFor,
      availability,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") Alert.alert("Username taken", "Someone already has that name. Try another.");
      else Alert.alert("Couldn't save", error.message);
      return;
    }
    onSaved();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>You can change all of this later.</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. luna"
          placeholderTextColor={colors.textSoft}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />

        <Text style={styles.label}>What do you play or do? (pick all that apply)</Text>
        <Chips options={ROLES} selected={roles} onPress={(o) => setRoles(toggle(roles, o))} />

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Miami, FL"
          placeholderTextColor={colors.textSoft}
          value={city}
          onChangeText={setCity}
        />
        <Text style={styles.hint}>Only your city is shown, never an address.</Text>

        <Text style={styles.label}>Your sound (pick up to 5)</Text>
        <Chips options={GENRES} selected={genres} onPress={(o) => setGenres(toggle(genres, o, 5))} />

        <Text style={styles.label}>Looking for</Text>
        <Chips options={LOOKING_FOR} selected={lookingFor} onPress={(o) => setLookingFor(toggle(lookingFor, o))} />

        <Text style={styles.label}>Availability</Text>
        <Chips options={AVAILABILITY} selected={availability} onPress={(o) => setAvailability(toggle(availability, o))} />

        <Text style={styles.label}>About you</Text>
        <TextInput
          style={[styles.input, styles.bio]}
          placeholder="A sentence or two about your music and what you want to make"
          placeholderTextColor={colors.textSoft}
          multiline
          maxLength={160}
          value={bio}
          onChangeText={setBio}
        />

        <Pressable
          style={({ pressed }) => [styles.button, (pressed || saving) && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? "Saving..." : "Save"}</Text>
        </Pressable>
        {onCancel && (
          <Pressable onPress={onCancel}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  subtitle: { color: colors.textSoft, marginTop: 4, marginBottom: 8 },
  label: { color: colors.text, fontWeight: "600", fontSize: 16, marginTop: 20, marginBottom: 8 },
  hint: { color: colors.textSoft, fontSize: 12, marginTop: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 16, height: 50, color: colors.text, fontSize: 16 },
  bio: { height: 100, paddingTop: 14, textAlignVertical: "top" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.chip, borderRadius: radius.chip, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextOn: { color: colors.onAccent, fontWeight: "600" },
  button: { backgroundColor: colors.accent, borderRadius: radius.button, paddingVertical: 14, alignItems: "center", marginTop: 28 },
  buttonText: { color: colors.onAccent, fontWeight: "600", fontSize: 16 },
  cancel: { color: colors.textSoft, textAlign: "center", marginTop: 16 },
});