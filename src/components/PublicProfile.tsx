import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getFollowState, toggleFollowUser } from "../lib/follows";
import { getLocalProfileMeta } from "../lib/profileMeta";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";
import DemoSection from "./DemoSection";
import { ProfileData } from "./ProfileForm";
import ReportBlockMenu from "./ReportBlockMenu";

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

const DEFAULT_INFLUENCES = ["my bloody valentine", "mazzy star", "beabadoobee", "elfbar"];

type Props = {
  person: ProfileData & { id: string };
  me: string;
  color: string;
  onBack: () => void;
  onMessage?: (connectionId: string) => void;
};

export default function PublicProfile({ person, me, color, onBack, onMessage }: Props) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(127);
  const [followingCount, setFollowingCount] = useState(28);
  const [demoCount, setDemoCount] = useState(6);
  const [collabSent, setCollabSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    getFollowState(me, person.id).then((st) => {
      if (!mounted) return;
      setIsFollowing(st.isFollowing);
      setFollowerCount(st.followerCount);
      setFollowingCount(st.followingCount);
    });

    supabase
      .from("demos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", person.id)
      .then(({ count }) => {
        if (mounted && typeof count === "number") {
          setDemoCount(count);
        }
      });

    return () => {
      mounted = false;
    };
  }, [me, person.id]);

  const handleFollowToggle = async () => {
    if (busy) return;
    setBusy(true);
    const prevFollowing = isFollowing;
    const prevCount = followerCount;

    // Optimistic UI update
    const nextFollowing = !prevFollowing;
    const nextCount = Math.max(0, prevCount + (nextFollowing ? 1 : -1));
    setIsFollowing(nextFollowing);
    setFollowerCount(nextCount);

    const res = await toggleFollowUser(me, person.id, prevFollowing, prevCount);
    setIsFollowing(res.isFollowing);
    setFollowerCount(res.followerCount);
    setBusy(false);
  };

  const handleMessage = async () => {
    // Check if an existing connection exists
    const { data } = await supabase
      .from("connections")
      .select("id, status")
      .or(`and(requester_id.eq.${me},addressee_id.eq.${person.id}),and(requester_id.eq.${person.id},addressee_id.eq.${me})`)
      .maybeSingle();

    if (data?.id) {
      if (onMessage) onMessage(data.id);
      return;
    }

    // Auto-create connection so messaging works smoothly
    const { data: newConn, error } = await supabase
      .from("connections")
      .insert({ requester_id: me, addressee_id: person.id, status: "accepted" })
      .select("id")
      .single();

    if (!error && newConn?.id && onMessage) {
      onMessage(newConn.id);
    } else if (onMessage) {
      onMessage(newConn?.id ?? person.id);
    }
  };

  const handleCollab = async () => {
    if (collabSent) {
      Alert.alert("Collab request already sent!", `You've invited ${person.username} to collaborate.`);
      return;
    }
    setCollabSent(true);
    await supabase.from("connections").upsert({
      requester_id: me,
      addressee_id: person.id,
      status: "pending",
    });
    Alert.alert("Collab invite sent!", `We sent an invitation to ${person.username} to make something together.`);
  };

  const localMeta = getLocalProfileMeta(person.id);
  const subtitle = [person.roles.join(", "), person.city].filter(Boolean).join(" · ");
  const customTagline = (person.tagline ?? localMeta.tagline)?.trim();
  const quote = customTagline
    ? `"${customTagline.replace(/["“”]/g, "")}"`
    : person.bio
    ? `"${person.bio.slice(0, 60).replace(/["“”]/g, "").trim()}"`
    : '"soft voices. loud feelings."';

  const userInfluences =
    person.influences && person.influences.length > 0
      ? person.influences
      : localMeta.influences && localMeta.influences.length > 0
      ? localMeta.influences
      : DEFAULT_INFLUENCES;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Top Banner with clean soft pastel color and large letter */}
      <View style={[styles.banner, { backgroundColor: color || "#E8D5E5" }]}>
        <Text style={styles.bannerLetter}>{person.username[0].toUpperCase()}</Text>

        {/* Top left frosted back button */}
        <Pressable style={({ pressed }) => [styles.frostedBtn, styles.backBtn, pressed && { opacity: 0.6 }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        {/* Top right frosted 3-dots report/block menu */}
        <View style={[styles.frostedBtn, styles.menuBtn]}>
          <ReportBlockMenu
            me={me}
            otherId={person.id}
            otherName={person.username}
            onBlocked={onBack}
            iconColor="#FFFFFF"
            buttonStyle={styles.menuPressable}
          />
        </View>
      </View>

      {/* Main Sheet with rounded top corners */}
      <View style={styles.sheet}>
        {/* Name and Online indicator */}
        <View style={styles.nameRow}>
          <Text style={styles.name}>{person.username}</Text>
          <View style={styles.onlineDot} />
        </View>

        {/* Subtitle */}
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {/* Tagline / Quote (Describe yourself on top) */}
        <Text style={styles.tagline}>{quote}</Text>

        {/* Sound / Genre Pills */}
        {person.genres.length > 0 && (
          <View style={styles.pillsRow}>
            {person.genres.map((g) => (
              <View key={g} style={styles.pill}>
                <Text style={styles.pillText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats Row: Followers, Following, Demos */}
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

        {/* 3 Action Buttons: Message, Follow, Collab */}
        <View style={styles.actionsRow}>
          {/* Message button (dark navy) */}
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.btnMessage, pressed && { opacity: 0.8 }]}
            onPress={handleMessage}
          >
            <Ionicons name="chatbubble-outline" size={17} color="#FFFFFF" />
            <Text style={styles.btnMessageText}>Message</Text>
          </Pressable>

          {/* Follow button (light lavender) */}
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.btnFollow, pressed && { opacity: 0.8 }]}
            onPress={handleFollowToggle}
          >
            <Ionicons
              name={isFollowing ? "checkmark" : "person-add-outline"}
              size={17}
              color="#241838"
            />
            <Text style={styles.btnFollowText}>{isFollowing ? "Following" : "Follow"}</Text>
          </Pressable>

          {/* Collab button (rose/magenta) */}
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.btnCollab,
              collabSent && styles.btnCollabSent,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleCollab}
          >
            <Ionicons name="musical-notes-outline" size={17} color="#FFFFFF" />
            <Text style={styles.btnCollabText}>{collabSent ? "Sent" : "Collab"}</Text>
          </Pressable>
        </View>

        {/* About Section (Full Bio) */}
        <Text style={styles.sectionHeader}>About</Text>
        <Text style={styles.bodyText}>
          {person.bio ||
            "singer + songwriter. into hazy guitars, late night demos, and honest lyrics. looking for a drummer to start something new. let's make beautiful things together."}
        </Text>

        {/* Influences Section (Artists, Musicians, Bands) */}
        <Text style={styles.sectionHeader}>Influences</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.influencesScroll}
        >
          {userInfluences.map((inf, idx) => (
            <View key={idx} style={styles.influenceCol}>
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

        {/* Demos Section */}
        <DemoSection userId={person.id} />

        {/* Looking for */}
        {person.looking_for.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Looking for</Text>
            <View style={styles.pillsRow}>
              {person.looking_for.map((g) => (
                <View key={g} style={styles.greenPill}>
                  <Text style={styles.greenPillText}>{g}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Availability */}
        {person.availability.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Availability</Text>
            <View style={styles.pillsRow}>
              {person.availability.map((a) => (
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
  banner: {
    height: 240,
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
  backBtn: {
    left: 20,
  },
  menuBtn: {
    right: 20,
  },
  menuPressable: {
    padding: 0,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
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
    gap: 10,
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
    gap: 6,
  },
  btnMessage: {
    backgroundColor: "#241838",
  },
  btnMessageText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  btnFollow: {
    backgroundColor: "#ECE5F8",
  },
  btnFollowText: {
    color: "#241838",
    fontSize: 15,
    fontWeight: "600",
  },
  btnCollab: {
    backgroundColor: "#BD6188",
  },
  btnCollabSent: {
    backgroundColor: "#9A4B6B",
  },
  btnCollabText: {
    color: "#FFFFFF",
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