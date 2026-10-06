import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";
import { colors, radius } from "../theme";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      Alert.alert("Almost there", "Enter your email and a password with at least 6 characters.");
      return;
    }
    setLoading(true);
    if (creating) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) Alert.alert("Couldn't create your account", error.message);
      else if (!data.session) Alert.alert("Check your email", "We sent you a link to confirm your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) Alert.alert("Couldn't log you in", error.message);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>gigly</Text>
      <Text style={styles.tagline}>music sounds better together</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textSoft}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textSoft}
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          style={({ pressed }) => [styles.button, (pressed || loading) && { opacity: 0.6 }]}
          onPress={submit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{creating ? "Create account" : "Log in"}</Text>
        </Pressable>
        <Pressable onPress={() => setCreating(!creating)}>
          <Text style={styles.switch}>
            {creating ? "Already have an account? Log in" : "New here? Create an account"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24 },
  logo: { fontSize: 48, fontWeight: "700", color: colors.accent, textAlign: "center" },
  tagline: { color: colors.textSoft, textAlign: "center", marginTop: 4, marginBottom: 32 },
  form: { gap: 12 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: 16, height: 52, color: colors.text, fontSize: 16 },
  button: { backgroundColor: colors.accent, borderRadius: radius.button, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: colors.onAccent, fontWeight: "600", fontSize: 16 },
  switch: { color: colors.textSoft, textAlign: "center", marginTop: 8 },
});