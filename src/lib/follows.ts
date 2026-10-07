import { supabase } from "./supabase";

export async function getFollowState(me: string | null, targetId: string) {
  const followers = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", targetId);

  const following = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", targetId);

  let isFollowing = false;
  if (me && me !== targetId) {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", me)
      .eq("following_id", targetId)
      .maybeSingle();
    isFollowing = !!data;
  }

  return {
    isFollowing,
    followerCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
  };
}

export async function toggleFollowUser(
  me: string,
  targetId: string,
  currentIsFollowing: boolean,
  currentCount: number
) {
  const result = currentIsFollowing
    ? await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", targetId)
    : await supabase.from("follows").insert({ follower_id: me, following_id: targetId });

  if (result.error && result.error.code !== "23505") {
    return {
      isFollowing: currentIsFollowing,
      followerCount: currentCount,
      error: result.error.message,
    };
  }

  const { count } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", targetId);

  return {
    isFollowing: !currentIsFollowing,
    followerCount: count ?? Math.max(0, currentCount + (currentIsFollowing ? -1 : 1)),
  };
}