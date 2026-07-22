/**
 * Reachability — can we notify / contact this player outside the app?
 *
 * Free lottery entry requires a connected wallet plus at least one live
 * notification channel and a contact fallback (email or Telegram bot link).
 * World App and Farcaster mini-app users can satisfy contact via native push
 * when email is impractical inside those clients.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(raw) {
  if (!raw || typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return null;
  return email;
}

export function normalizeTelegramUsername(raw) {
  if (!raw || typeof raw !== "string") return null;
  const handle = raw.trim().replace(/^@+/, "");
  if (!handle || !/^[a-zA-Z0-9_]{4,32}$/.test(handle)) return null;
  return handle;
}

/**
 * @param {object} user — row from public.users
 * @param {{ webPush?: boolean, worldPush?: boolean }} subs
 * @returns {{ eligible: boolean, missing: string[], channels: object }}
 */
export function assessReachability(user, subs = {}) {
  const channels = {
    email: Boolean(user?.contact_email),
    telegramBot: Boolean(user?.telegram_user_id),
    telegramHandle: Boolean(user?.telegram_username),
    farcaster: Boolean(user?.farcaster_fid),
    webPush: Boolean(subs.webPush),
    worldPush: Boolean(subs.worldPush),
  };

  const hasLiveNotify = channels.webPush || channels.worldPush || channels.telegramBot;
  const hasContactFallback =
    channels.email ||
    channels.telegramBot ||
    (channels.farcaster && hasLiveNotify) ||
    (channels.worldPush && user?.platform === "world");

  const missing = [];
  if (!hasLiveNotify) missing.push("notifications");
  if (!hasContactFallback) missing.push("contact");

  return {
    eligible: missing.length === 0,
    missing,
    channels,
  };
}

/**
 * Load push subscription flags for an address from Supabase.
 */
export async function loadPushFlags(supabaseAdmin, address) {
  if (!supabaseAdmin || !address) {
    return { webPush: false, worldPush: false };
  }

  const addr = address.toLowerCase();
  const [web, world] = await Promise.all([
    supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint", { count: "exact", head: true })
      .eq("address", addr),
    supabaseAdmin
      .from("world_push_subscriptions")
      .select("address", { count: "exact", head: true })
      .eq("address", addr),
  ]);

  return {
    webPush: (web.count ?? 0) > 0,
    worldPush: (world.count ?? 0) > 0,
  };
}

export async function loadReachability(supabaseAdmin, address) {
  if (!supabaseAdmin || !address) {
    return { eligible: false, missing: ["wallet"], channels: {} };
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select(
      "address, contact_email, telegram_user_id, telegram_username, farcaster_fid, platform, reachability_completed_at",
    )
    .eq("address", address.toLowerCase())
    .maybeSingle();

  if (!user) {
    return { eligible: false, missing: ["profile"], channels: {} };
  }

  const subs = await loadPushFlags(supabaseAdmin, address);
  const assessment = assessReachability(user, subs);
  return { ...assessment, user, subs };
}
