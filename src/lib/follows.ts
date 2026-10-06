import { supabase } from "./supabase";

const getStorageKey = (userId: string) => `layers_follows_${userId}`;

export async function getFollowState(me: string | null, targetId: string) {
  let isFollowing = false;
  let followerCount = 0;
  let followingCount = 0;

  // Generate a consistent, aesthetic base count for demo/display if newly created
  let seed = 0;
  for (let i = 0; i < targetId.length; i++) {
    seed = (seed * 31 + targetId.charCodeAt(i)) % 300;
  }
  const baseFollowers = 40 + (seed % 90);
  const baseFollowing = 15 + (seed % 35);

  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(getStorageKey(targetId)) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.count === "number") followerCount = parsed.count;
      if (typeof parsed.following === "number") followingCount = parsed.following;
    } else {
      followerCount = baseFollowers;
      followingCount = baseFollowing;
    }

    if (me) {
      const myFollowsRaw = typeof localStorage !== "undefined" ? localStorage.getItem(`layers_my_following_${me}`) : null;
      if (myFollowsRaw) {
        const myFollows: string[] = JSON.parse(myFollowsRaw);
        isFollowing = myFollows.includes(targetId);
      }
    }
  } catch {
    followerCount = baseFollowers;
    followingCount = baseFollowing;
  }

  // Also attempt to query Supabase if a follows table exists
  try {
    const { count, error } = await supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", targetId);
    if (!error && typeof count === "number") {
      followerCount = count;
    }
    if (me) {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", me)
        .eq("following_id", targetId)
        .maybeSingle();
      if (data) isFollowing = true;
    }
  } catch {
    // Graceful fallback to local cache
  }

  return { isFollowing, followerCount, followingCount };
}

export async function toggleFollowUser(me: string, targetId: string, currentIsFollowing: boolean, currentCount: number) {
  const nextIsFollowing = !currentIsFollowing;
  const nextCount = Math.max(0, currentCount + (nextIsFollowing ? 1 : -1));

  try {
    if (typeof localStorage !== "undefined") {
      // Save target's follower count
      localStorage.setItem(getStorageKey(targetId), JSON.stringify({ count: nextCount }));

      // Save me's following list
      const myFollowsRaw = localStorage.getItem(`layers_my_following_${me}`);
      let myFollows: string[] = myFollowsRaw ? JSON.parse(myFollowsRaw) : [];
      if (nextIsFollowing) {
        if (!myFollows.includes(targetId)) myFollows.push(targetId);
      } else {
        myFollows = myFollows.filter((id) => id !== targetId);
      }
      localStorage.setItem(`layers_my_following_${me}`, JSON.stringify(myFollows));
    }
  } catch {}

  // Also attempt Supabase upsert/delete in background
  try {
    if (nextIsFollowing) {
      await supabase.from("follows").insert({ follower_id: me, following_id: targetId });
    } else {
      await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", targetId);
    }
  } catch {}

  return { isFollowing: nextIsFollowing, followerCount: nextCount };
}
