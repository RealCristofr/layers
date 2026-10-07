import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BlockedList from "../components/BlockedList";
import DemoSection from "../components/DemoSection";
import PrivacySettings from "../components/PrivacySettings";
import ProfileForm, { ProfileData } from "../components/ProfileForm";
import { getFollowState } from "../lib/follows";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

const AVAIL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Mornings: "sunny-outline",
  Evenings: "moon-outline",
  Weekends: "calendar-outline",
  "Open to remote": "globe-outline",
};

const INFLUENCE_PALETTES = [
  "#F2C8D6",
  "#C6C4EC",
  "#F5CAD2",
  "#CFE2F2",
  "#F6D6C6",
  "#D6EBD7",
  "#EAD0EC",
  "#F3D4BA",
];

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [demoCount, setDemoCount] = useState(0);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile((data as ProfileData | null) ?? null);

    getFollowState(user.id, user.id).then((st) => {
      setFollowerCount(st.followerCount);
      setFollowingCount(st.followingCount);
    });

    supabase
      .from("demos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("parent_id", null)
      .then(({ count }) => setDemoCount(count ?? 0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (editing) {
          setEditing(false);
          return true;
        }
        if (showPrivacy) {
          setShowPrivacy(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [editing, showPrivacy])
  );

  const openSettingsMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit profile", "Privacy and safety", "Log out"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) setEditing(true);
          else if (buttonIndex === 2) setShowPrivacy(true);
          else if (buttonIndex === 3) supabase.auth.signOut();
        }
      );
    } else {
      Alert.alert(
        "Settings",
        undefined,
        [
          { text: "Edit profile", onPress: () => setEditing(true) },
          { text: "Privacy and safety", onPress: () => setShowPrivacy(true) },
          { text: "Log out", style: "destructive", onPress: () => supabase.auth.signOut() },
        ],
        { cancelable: true }
      );
    }
  };

  const shareProfile = async () => {
    if (!profile) return;
    try {
      await Share.share({
        message: `Check out ${profile.username}'s music profile on gigly!`,
      });
    } catch {}
  };

  if (editing && userId) {
    return (
      <ProfileForm
        userId={userId}
        title="Edit profile"
        initial={profile}
        onSaved={() => {
          setEditing(false);
          load();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  if (showPrivacy && userId) {
    return (
      <View style={styles.screen}>
        <View style={styles.subHeader}>
          <Pressable onPress={() => setShowPrivacy(false)} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.subHeaderTitle}>Privacy and safety</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <PrivacySettings userId={userId} />
          <BlockedList userId={userId} />
        </ScrollView>
      </View>
    );
  }

  if (!profile) return <View style={styles.screen} />;

  const subtitle = [profile.roles.join(", "), profile.city].filter(Boolean).join(" · ");
  const tagline = profile.tagline?.trim();
  const userInfluences = profile.influences ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 50 }}>
      <View style={styles.banner}>
        <Text style={styles.bannerLetter}>{profile.username[0].toUpperCase()}</Text>

        <Pressable
          style={({ pressed }) => [styles.frostedBtn, styles.gearBtn, pressed && { opacity: 0.6 }]}
          onPress={openSettingsMenu}
        >
          <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.name}>{profile.username}</Text>

        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {!!tagline ? (
          <Text style={styles.tagline}>"{tagline.replace(/["“”]/g, "").trim()}"</Text>
        ) : (
          <Pressable onPress={() => setEditing(true)} hitSlop={6}>
            <Text style={styles.addTaglinePrompt}>+ Add a tagline</Text>
          </Pressable>
        )}

        {profile.genres.length > 0 && (
          <View style={styles.pillsRow}>
            {profile.genres.map((g) => (
              <View key={g} style={styles.pill}>
                <Text style={styles.pillText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{demoCount}</Text>
            <Text style={styles.statLabel}>Demos</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.btnEdit, pressed && { opacity: 0.8 }]}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create-outline" size={17} color="#FFFFFF" />
            <Text style={styles.btnEditText}>Edit profile</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.btnShare, pressed && { opacity: 0.8 }]}
            onPress={shareProfile}
          >
            <Ionicons name="share-outline" size={17} color="#241838" />
            <Text style={styles.btnShareText}>Share</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionHeader}>About</Text>
        <Text style={profile.bio ? styles.bodyText : styles.emptyText}>
          {profile.bio || "Add a short bio so people know what you make."}
        </Text>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderNoMargin}>Influences</Text>
          <Pressable onPress={() => setEditing(true)} hitSlop={8}>
            <Text style={styles.sectionActionText}>Edit</Text>
          </Pressable>
        </View>

        {userInfluences.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.influencesScroll}
          >
            {userInfluences.map((inf, idx) => (
              <View key={`${inf}-${idx}`} style={styles.influenceCol}>
                <View
                  style={[
                    styles.influenceTile,
                    { backgroundColor: INFLUENCE_PALETTES[idx % INFLUENCE_PALETTES.length] },
                  ]}
                >
                  <Text style={styles.influenceInitial}>{inf[0]?.toUpperCase()}</Text>
                </View>
                <Text style={styles.influenceName} numberOfLines={2}>
                  {inf}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Pressable style={styles.emptyInfluenceBox} onPress={() => setEditing(true)}>
            <Ionicons name="musical-notes-outline" size={22} color={colors.accent} />
            <Text style={styles.emptyInfluenceTitle}>Add your favorite artists & bands</Text>
            <Text style={styles.emptyInfluenceSub}>Tap to showcase what shapes your music</Text>
          </Pressable>
        )}

        {userId && <DemoSection userId={userId} editable />}

        {profile.looking_for.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Looking for</Text>
            <View style={styles.pillsRow}>
              {profile.looking_for.map((g) => (
                <View key={g} style={styles.greenPill}>
                  <Text style={styles.greenPillText}>{g}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {profile.availability.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Availability</Text>
            <View style={styles.pillsRow}>
              {profile.availability.map((a) => (
                <View key={a} style={styles.availPill}>
                  <Ionicons name={AVAIL_ICONS[a] ?? "time-outline"} size={15} color={colors.text} />
                  <Text style={styles.availPillText}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAF7FB",
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EAE0F2",
    backgroundColor: "#FFFFFF",
  },
  subHeaderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#241838",
  },
  banner: {
    height: 240,
    backgroundColor: "#E8D5E5",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerLetter: {
    fontSize: 110,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
  },
  frostedBtn: {
    position: "absolute",
    top: 50,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(36, 24, 56, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  gearBtn: {
    right: 20,
  },
  sheet: {
    marginTop: -34,
    backgroundColor: "#FAF7FB",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 22,
    paddingTop: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#241838",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#7B7093",
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    fontStyle: "italic",
    color: "#4F4368",
    marginTop: 8,
    marginBottom: 6,
  },
  addTaglinePrompt: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "500",
    marginTop: 6,
    marginBottom: 6,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 10,
  },
  pill: {
    backgroundColor: "#ECE5F8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pillText: {
    color: "#3F325E",
    fontSize: 14,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 14,
    paddingVertical: 4,
  },
  statCol: {
    alignItems: "center",
    minWidth: 70,
  },
  statNum: {
    fontSize: 22,
    fontWeight: "700",
    color: "#241838",
  },
  statLabel: {
    fontSize: 13,
    color: "#7B7093",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnEdit: {
    backgroundColor: "#241838",
  },
  btnEditText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  btnShare: {
    backgroundColor: "#ECE5F8",
  },
  btnShareText: {
    color: "#241838",
    fontSize: 15,
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#241838",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionHeaderNoMargin: {
    fontSize: 18,
    fontWeight: "700",
    color: "#241838",
  },
  sectionActionText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#463D5C",
  },
  emptyText: {
    fontSize: 14,
    color: "#7B7093",
  },
  influencesScroll: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  influenceCol: {
    width: 78,
    alignItems: "flex-start",
  },
  influenceTile: {
    width: 78,
    height: 78,
    borderRadius: 18,
    marginBottom: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  influenceInitial: {
    fontSize: 28,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.85)",
  },
  influenceName: {
    fontSize: 12,
    color: "#7B7093",
    lineHeight: 15,
  },
  emptyInfluenceBox: {
    backgroundColor: "#F2EAF8",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5D8F0",
    borderStyle: "dashed",
    marginVertical: 8,
  },
  emptyInfluenceTitle: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
    marginTop: 2,
  },
  emptyInfluenceSub: {
    color: colors.textSoft,
    fontSize: 12,
  },
  greenPill: {
    backgroundColor: "#DDF3E4",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  greenPillText: {
    color: "#1F6B3A",
    fontSize: 14,
    fontWeight: "500",
  },
  availPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECE5F8",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  availPillText: {
    color: "#3F325E",
    fontSize: 14,
  },
});