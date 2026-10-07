import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getFollowState, toggleFollowUser } from "../lib/follows";
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

type Conn = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
} | null;

type Props = {
  person: ProfileData & { id: string };
  me: string;
  color: string;
  onBack: () => void;
  onMessage?: (connectionId: string) => void;
};

export default function PublicProfile({ person, me, color, onBack, onMessage }: Props) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [demoCount, setDemoCount] = useState(0);
  const [conn, setConn] = useState<Conn>(null);
  const [busy, setBusy] = useState(false);

  const loadConn = useCallback(async () => {
    const { data } = await supabase
      .from("connections")
      .select("id, requester_id, addressee_id, status")
      .or(
        `and(requester_id.eq.${me},addressee_id.eq.${person.id}),and(requester_id.eq.${person.id},addressee_id.eq.${me})`
      )
      .maybeSingle();
    setConn((data as Conn) ?? null);
  }, [me, person.id]);

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
      .is("parent_id", null)
      .then(({ count }) => {
        if (mounted) setDemoCount(count ?? 0);
      });

    loadConn();

    return () => {
      mounted = false;
    };
  }, [me, person.id, loadConn]);

  const handleFollowToggle = async () => {
    if (busy) return;
    setBusy(true);
    const res = await toggleFollowUser(me, person.id, isFollowing, followerCount);
    setIsFollowing(res.isFollowing);
    setFollowerCount(res.followerCount);
    if ("error" in res && res.error) Alert.alert("Couldn't update follow", res.error);
    setBusy(false);
  };

  const sendRequest = async (kind: "message" | "collab") => {
    const { error } = await supabase
      .from("connections")
      .insert({ requester_id: me, addressee_id: person.id });
    if (error) {
      Alert.alert("Couldn't send request", error.message);
      return;
    }
    await loadConn();
    Alert.alert(
      kind === "collab" ? "Collab invite sent" : "Request sent",
      `You can message ${person.username} once they accept.`
    );
  };

  const acceptRequest = async () => {
    if (!conn) return;
    const { error } = await supabase.from("connections").update({ status: "accepted" }).eq("id", conn.id);
    if (error) {
      Alert.alert("Couldn't accept", error.message);
      return;
    }
    await loadConn();
  };

  const askToAccept = () =>
    Alert.alert(`${person.username} wants to connect`, "Accept to start chatting.", [
      { text: "Not now", style: "cancel" },
      { text: "Accept", onPress: acceptRequest },
    ]);

  const handleMessage = () => {
    if (!conn) {
      Alert.alert(`Connect with ${person.username}?`, "Messages open once they accept your request.", [
        { text: "Not now", style: "cancel" },
        { text: "Send request", onPress: () => sendRequest("message") },
      ]);
      return;
    }
    if (conn.status === "accepted") {
      onMessage?.(conn.id);
      return;
    }
    if (conn.requester_id === me) {
      Alert.alert("Request pending", `You can message ${person.username} once they accept.`);
      return;
    }
    askToAccept();
  };

  const handleCollab = () => {
    if (!conn) {
      Alert.alert(
        `Invite ${person.username} to collab?`,
        "We'll send a connection request. You can plan your collab in chat once they accept.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Send invite", onPress: () => sendRequest("collab") },
        ]
      );
      return;
    }
    if (conn.status === "accepted") {
      Alert.alert("You're connected", `Open a chat with ${person.username} to plan your collab?`, [
        { text: "Not now", style: "cancel" },
        { text: "Open chat", onPress: () => onMessage?.(conn.id) },
      ]);
      return;
    }
    if (conn.requester_id === me) {
      Alert.alert("Invite already sent", `You can plan your collab with ${person.username} once they accept.`);
      return;
    }
    askToAccept();
  };

  const collabSent = !!conn && conn.status === "pending" && conn.requester_id === me;

  const subtitle = [person.roles.join(", "), person.city].filter(Boolean).join(" · ");
  const tagline = person.tagline?.trim();
  const quote = tagline ? `"${tagline.replace(/["“”]/g, "")}"` : null;
  const influences = person.influences ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 50 }}>
      <View style={[styles.banner, { backgroundColor: color || "#E8D5E5" }]}>
        <Text style={styles.bannerLetter}>{person.username[0].toUpperCase()}</Text>

        <Pressable
          style={({ pressed }) => [styles.frostedBtn, styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

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

      <View style={styles.sheet}>
        <Text style={styles.name}>{person.username}</Text>

        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {!!quote && <Text style={styles.tagline}>{quote}</Text>}

        {person.genres.length > 0 && (
          <View style={styles.pillsRow}>
            {person.genres.map((g) => (
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
            style={({ pressed }) => [styles.actionBtn, styles.btnMessage, pressed && { opacity: 0.8 }]}
            onPress={handleMessage}
          >
            <Ionicons name="chatbubble-outline" size={17} color="#FFFFFF" />
            <Text style={styles.btnMessageText}>Message</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.btnFollow, pressed && { opacity: 0.8 }]}
            onPress={handleFollowToggle}
          >
            <Ionicons name={isFollowing ? "checkmark" : "person-add-outline"} size={17} color="#241838" />
            <Text style={styles.btnFollowText}>{isFollowing ? "Following" : "Follow"}</Text>
          </Pressable>

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

        {!!person.bio && (
          <>
            <Text style={styles.sectionHeader}>About</Text>
            <Text style={styles.bodyText}>{person.bio}</Text>
          </>
        )}

        {influences.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>Influences</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.influencesScroll}
            >
              {influences.map((inf, idx) => (
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
          </>
        )}

        <DemoSection userId={person.id} />

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