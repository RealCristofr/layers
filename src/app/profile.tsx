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

const INFLUENCE_TILES = [
  { bg: "#F2C8D6", name: "my bloody\nvalentine" },
  { bg: "#C6C4EC", name: "mazzy star" },
  { bg: "#F5CAD2", name: "beabadoobee" },
  { bg: "#CFE2F2", name: "elfbar" },
];

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [tick, setTick] = useState(0);

  const [followerCount, setFollowerCount] = useState(127);
  const [followingCount, setFollowingCount] = useState(28);
  const [demoCount, setDemoCount] = useState(6);

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(data);

    // Load stats
    getFollowState(user.id, user.id).then((st) => {
      setFollowerCount(st.followerCount);
      setFollowingCount(st.followingCount);
    });

    supabase
      .from("demos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        if (typeof count === "number") setDemoCount(count);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      setTick((t) => t + 1);
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (editing) {
          setEditing(false);
          return true;
        }
        if (showBlocked) {
          setShowBlocked(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [editing, showBlocked])
  );

  const openSettingsMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", "Edit profile", "Blocked accounts", "Log out"],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) setEditing(true);
          else if (buttonIndex === 2) setShowBlocked(true);
          else if (buttonIndex === 3) supabase.auth.signOut();
        }
      );
    } else {
      Alert.alert("Account Settings", undefined, [
        { text: "Edit profile", onPress: () => setEditing(true) },
        { text: "Blocked accounts", onPress: () => setShowBlocked(true) },
        { text: "Log out", style: "destructive", onPress: () => supabase.auth.signOut() },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const shareProfile = async () => {
    if (!profile) return;
    try {
      await Share.share({
        message: `Check out ${profile.username}'s music profile on Layers!`,
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

  if (!profile) return <View style={styles.screen} />;

  const subtitle = [profile.roles.join(", "), profile.city].filter(Boolean).join(" · ");
  const quote = profile.bio ? `"${profile.bio.slice(0, 60).replace(/["“”]/g, "").trim()}"` : '"soft voices. loud feelings."';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerLetter}>{profile.username[0].toUpperCase()}</Text>

        {/* Top-right frosted settings gear button */}
        <Pressable
          style={({ pressed }) => [styles.frostedBtn, styles.gearBtn, pressed && { opacity: 0.6 }]}
          onPress={openSettingsMenu}
        >
          <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Name and Online indicator */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{profile.username}</Text>
          <View style={styles.onlineDot} />
        </View>

        {/* Subtitle */}
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Tagline / Quote */}
        <Text style={styles.tagline}>{quote}</Text>

        {/* Sound / Genre Pills */}
        {profile.genres.length > 0 && (
          <View style={styles.pillsRow}>
            {profile.genres.map((g) => (
              <View key={g} style={styles.pill}>
                <Text style={styles.pillText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats Row */}
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

        {/* Action Buttons: Edit Profile and Share */}
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

        {/* About Section */}
        <Text style={styles.sectionHeader}>About</Text>
        <Text style={styles.bodyText}>
          {profile.bio || "Add a short bio so people know what you make."}
        </Text>

        {/* Influences Section */}
        <Text style={styles.sectionHeader}>Influences</Text>
        <View style={styles.influencesRow}>
          {INFLUENCE_TILES.map((inf, idx) => (
            <View key={idx} style={styles.influenceCol}>
              <View style={[styles.influenceTile, { backgroundColor: inf.bg }]} />
              <Text style={styles.influenceName} numberOfLines={2}>
                {inf.name}
              </Text>
            </View>
          ))}
        </View>

        {/* Demos Section */}
        {userId && <DemoSection userId={userId} editable />}

        {/* Looking for */}
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

        {/* Availability */}
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

        {/* Blocked accounts modal / list if toggled */}
        {showBlocked && userId && (
          <View style={{ marginTop: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.sectionHeader}>Blocked accounts</Text>
              <Pressable onPress={() => setShowBlocked(false)}>
                <Text style={{ color: colors.accent, fontWeight: "600" }}>Hide</Text>
              </Pressable>
            </View>
            <BlockedList key={tick} userId={userId} />
          </View>
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: "#241838",
    letterSpacing: -0.5,
  },
  onlineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#4CD964",
    marginLeft: 8,
    marginTop: 2,
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
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#463D5C",
  },
  influencesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  influenceCol: {
    flex: 1,
    alignItems: "flex-start",
  },
  influenceTile: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 18,
    marginBottom: 6,
  },
  influenceName: {
    fontSize: 12,
    color: "#7B7093",
    lineHeight: 15,
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