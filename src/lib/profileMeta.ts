import { supabase } from "./supabase";

export type ProfileMeta = {
  tagline?: string | null;
  influences?: string[];
};

const getMetaKey = (userId: string) => `layers_profile_meta_${userId}`;

// Reads values saved on this phone by older versions of the app.
// Used only to pre-fill the edit form once, so nothing you typed is lost.
export function getLocalProfileMeta(userId: string): ProfileMeta {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(getMetaKey(userId));
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function clearLocalProfileMeta(userId: string) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(getMetaKey(userId));
    }
  } catch {}
}

export async function saveProfileWithMeta(
  userId: string,
  payload: {
    username: string;
    roles: string[];
    city: string | null;
    tagline: string | null;
    bio: string | null;
    genres: string[];
    influences: string[];
    looking_for: string[];
    availability: string[];
  }
) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    ...payload,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error };
  }

  clearLocalProfileMeta(userId);
  return { ok: true, error: null };
}