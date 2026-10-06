import { supabase } from "./supabase";

export type ProfileMeta = {
  tagline?: string | null;
  influences?: string[];
};

const getMetaKey = (userId: string) => `layers_profile_meta_${userId}`;

export function getLocalProfileMeta(userId: string): ProfileMeta {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(getMetaKey(userId));
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return {};
}

export function saveLocalProfileMeta(userId: string, meta: ProfileMeta) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(getMetaKey(userId), JSON.stringify(meta));
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
  // Always save locally so the user has immediate access
  saveLocalProfileMeta(userId, {
    tagline: payload.tagline,
    influences: payload.influences,
  });

  const fullPayload = {
    id: userId,
    username: payload.username,
    roles: payload.roles,
    city: payload.city,
    tagline: payload.tagline,
    bio: payload.bio,
    genres: payload.genres,
    influences: payload.influences,
    looking_for: payload.looking_for,
    availability: payload.availability,
    updated_at: new Date().toISOString(),
  };

  // 1. Try to upsert full payload including tagline and influences
  const { error: fullError } = await supabase.from("profiles").upsert(fullPayload);

  if (!fullError) {
    return { ok: true, error: null };
  }

  // 2. If Postgres reported column does not exist (e.g. 42703 or message mentions column), fallback to core columns
  if (
    fullError.code === "42703" ||
    fullError.code === "PGRST204" ||
    fullError.message?.toLowerCase().includes("column")
  ) {
    const { tagline: _t, influences: _i, ...corePayload } = fullPayload;
    const { error: coreError } = await supabase.from("profiles").upsert(corePayload);
    if (!coreError) {
      return { ok: true, error: null };
    }
    return { ok: false, error: coreError };
  }

  return { ok: false, error: fullError };
}

