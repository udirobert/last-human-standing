/**
 * Photo dedup — reject re-used images within a cohort.
 * Clients send a SHA-256 of the raw file bytes on check-in.
 */

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

export function normalizePhotoHash(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return HASH_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * @returns {Promise<{ duplicate: boolean, reason?: string, matchedAddress?: string }>}
 */
export async function checkPhotoDuplicate(supabaseAdmin, { photoHash, address, day }) {
  if (!supabaseAdmin || !photoHash) return { duplicate: false };

  const addr = address.toLowerCase();

  // Same player re-submitting the same image on a different day is suspicious too.
  const { data: priorOwn } = await supabaseAdmin
    .from("submissions")
    .select("id,day")
    .eq("photo_hash", photoHash)
    .eq("address", address)
    .neq("day", day)
    .limit(1)
    .maybeSingle();

  if (priorOwn) {
    return { duplicate: true, reason: "photo_reused_own", matchedDay: priorOwn.day };
  }

  // Another player's photo — strongest cheat signal.
  const { data: priorOther } = await supabaseAdmin
    .from("submissions")
    .select("address,day")
    .eq("photo_hash", photoHash)
    .neq("address", address)
    .limit(1)
    .maybeSingle();

  if (priorOther) {
    return {
      duplicate: true,
      reason: "photo_reused_other",
      matchedAddress: priorOther.address,
      matchedDay: priorOther.day,
    };
  }

  return { duplicate: false };
}
