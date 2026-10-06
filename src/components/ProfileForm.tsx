import { Ionicons } from "@expo/vector-icons";
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
import { getLocalProfileMeta, saveProfileWithMeta } from "../lib/profileMeta";
import { colors, radius } from "../theme";

export type ProfileData = {
  username: string;
  roles: string[];
  city: string | null;
  tagline?: string | null;
  bio: string | null;
  genres: string[];
  influences?: string[];
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

const SUGGESTED_INFLUENCES = [
  "Mazzy Star",
  "My Bloody Valentine",
  "Radiohead",
  "Phoebe Bridgers",
  "Deftones",
  "Beabadoobee",
  "The Cure",
  "Clairo",
  "Mac DeMarco",
  "Frank Ocean",
  "Elliott Smith",
  "Aphex Twin",
];

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
  const localMeta = getLocalProfileMeta(userId);

  const [username, setUsername] = useState(initial?.username ?? "");
  const [roles, setRoles] = useState<string[]>(initial?.roles ?? []);
  const [city, setCity] = useState(initial?.city ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? localMeta.tagline ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [influences, setInfluences] = useState<string[]>(initial?.influences ?? localMeta.influences ?? []);
  const [influenceInput, setInfluenceInput] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>(initial?.looking_for ?? []);
  const [availability, setAvailability] = useState<string[]>(initial?.availability ?? []);
  const [saving, setSaving] = useState(false);

  const addInfluence = (nameToAdd?: string) => {
    const raw = (nameToAdd || influenceInput).trim();
    if (!raw) return;
    if (influences.some((inf) => inf.toLowerCase() === raw.toLowerCase())) {
      setInfluenceInput("");
      return;
    }
    if (influences.length >= 8) {
      Alert.alert("Limit reached", "You can add up to 8 influences.");
      return;
    }
    setInfluences([...influences, raw]);
    setInfluenceInput("");
  };

  const removeInfluence = (nameToRemove: string) => {
    setInfluences(influences.filter((inf) => inf !== nameToRemove));
  };

  const save = async () => {
    const name = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(name)) {
      Alert.alert("Pick a username", "Use 3 to 24 letters, numbers, or underscores.");
      return;
    }
    setSaving(true);
    const { ok, error } = await saveProfileWithMeta(userId, {
      username: name,
      roles,
      city: city.trim() || null,
      tagline: tagline.trim() || null,
      bio: bio.trim() || null,
      genres,
      influences,
      looking_for: lookingFor,
      availability,
    });
    setSaving(false);
    if (!ok && error) {
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
          placeholder="e.g. Los Angeles, CA"
          placeholderTextColor={colors.textSoft}
          value={city}
          onChangeText={setCity}
        />
        <Text style={styles.hint}>Only your city is shown, never an address.</Text>

        {/* Tagline: Describe yourself on top */}
        <Text style={styles.label}>Tagline (shown at the top of your profile)</Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. "soft voices. loud feelings."'
          placeholderTextColor={colors.textSoft}
          maxLength={80}
          value={tagline}
          onChangeText={setTagline}
        />
        <Text style={styles.hint}>A short vibe or quote to describe yourself, separate from your bio.</Text>

        <Text style={styles.label}>Your sound (pick up to 5)</Text>
        <Chips options={GENRES} selected={genres} onPress={(o) => setGenres(toggle(genres, o, 5))} />

        {/* Influences: Artists, Musicians, Bands */}
        <Text style={styles.label}>Influences (artists, musicians, bands)</Text>
        <View style={styles.addInfluenceRow}>
          <TextInput
            style={[styles.input, styles.influenceInput]}
            placeholder="Type an artist, band or musician..."
            placeholderTextColor={colors.textSoft}
            value={influenceInput}
            onChangeText={setInfluenceInput}
            onSubmitEditing={() => addInfluence()}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              (!influenceInput.trim() || pressed) && { opacity: 0.6 },
            ]}
            onPress={() => addInfluence()}
            disabled={!influenceInput.trim()}
          >
            <Ionicons name="add" size={20} color={colors.onAccent} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {/* Active Influences Chips */}
        {influences.length > 0 && (
          <View style={[styles.wrap, { marginTop: 8 }]}>
            {influences.map((inf) => (
              <View key={inf} style={styles.influenceChip}>
                <Text style={styles.influenceChipText}>{inf}</Text>
                <Pressable onPress={() => removeInfluence(inf)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.textSoft} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Quick Suggestion Chips */}
        <Text style={[styles.hint, { marginTop: 10, marginBottom: 6 }]}>Quick add suggestions:</Text>
        <View style={styles.wrap}>
          {SUGGESTED_INFLUENCES.filter((s) => !influences.includes(s))
            .slice(0, 6)
            .map((s) => (
              <Pressable key={s} onPress={() => addInfluence(s)} style={styles.suggestionChip}>
                <Ionicons name="add" size={14} color={colors.textSoft} />
                <Text style={styles.suggestionText}>{s}</Text>
              </Pressable>
            ))}
        </View>

        <Text style={styles.label}>Looking for</Text>
        <Chips options={LOOKING_FOR} selected={lookingFor} onPress={(o) => setLookingFor(toggle(lookingFor, o))} />

        <Text style={styles.label}>Availability</Text>
        <Chips options={AVAILABILITY} selected={availability} onPress={(o) => setAvailability(toggle(availability, o))} />

        {/* Bio: About you */}
        <Text style={styles.label}>About you (full bio)</Text>
        <TextInput
          style={[styles.input, styles.bio]}
          placeholder="singer + songwriter. into hazy guitars, late night demos, and honest lyrics. looking for a drummer to start something new."
          placeholderTextColor={colors.textSoft}
          multiline
          maxLength={300}
          value={bio}
          onChangeText={setBio}
        />
        <Text style={styles.hint}>Tell other musicians more about what you make and who you want to jam or collab with.</Text>

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
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    height: 50,
    color: colors.text,
    fontSize: 16,
  },
  bio: { height: 110, paddingTop: 14, textAlignVertical: "top" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: colors.chip, borderRadius: radius.chip, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextOn: { color: colors.onAccent, fontWeight: "600" },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
  },
  buttonText: { color: colors.onAccent, fontWeight: "600", fontSize: 16 },
  cancel: { color: colors.textSoft, textAlign: "center", marginTop: 16 },
  addInfluenceRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  influenceInput: {
    flex: 1,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: radius.card,
    justifyContent: "center",
  },
  addBtnText: {
    color: colors.onAccent,
    fontWeight: "600",
    fontSize: 14,
  },
  influenceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.chip,
    borderRadius: radius.chip,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
  },
  influenceChipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0E8F8",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionText: {
    color: colors.textSoft,
    fontSize: 13,
  },
});