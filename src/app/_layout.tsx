import { Ionicons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import AuthScreen from "../components/AuthScreen";
import ProfileForm from "../components/ProfileForm";
import { supabase } from "../lib/supabase";
import { colors } from "../theme";

export default function TabLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      setHasProfile(null);
      return;
    }
    setHasProfile(null);
    supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setHasProfile(!!data?.username));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnread(0);
      return;
    }
    const refresh = async () => {
      await supabase
        .from("messages")
        .update({ delivered_at: new Date().toISOString() })
        .neq("sender_id", userId)
        .is("delivered_at", null);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .neq("sender_id", userId)
        .is("read_at", null);
      setUnread(count ?? 0);
    };
    refresh();
    const channel = supabase
      .channel(`unread-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!ready) return null;
  if (!session || !userId) return <AuthScreen />;
  if (hasProfile === null) return null;
  if (!hasProfile) {
    return <ProfileForm userId={userId} title="Set up your profile" onSaved={() => setHasProfile(true)} />;
  }

  return (
    <Tabs
      key={userId}
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.onAccent },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarBadge: unread > 0 ? (unread > 9 ? "9+" : unread) : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="rooms" options={{ href: null }} />
    </Tabs>
  );
}