import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { verifyMessage } from "viem";
import { getSupabaseAdmin } from "./supabase.js";
// signRequest implemented locally (idkit v2 removed ./signing export)
function signRequest(signingKey, action, ttlSeconds = 300) {
  const nonce = randomId(16);
  const created_at = Math.floor(Date.now() / 1000);
  const expires_at = created_at + ttlSeconds;
  const payload = `${nonce}.${action}.${created_at}.${expires_at}`;
  const key = signingKey.startsWith("0x") ? signingKey.slice(2) : signingKey;
  const sig = crypto.createHmac("sha256", Buffer.from(key, "hex")).update(payload).digest("hex");
  return { nonce, created_at, expires_at, sig };
}
import { rateLimit } from "./rateLimit.js";

const PORT = Number(process.env.PORT || 8787);
const IS_PROD = process.env.NODE_ENV === "production";
const supabaseAdmin = getSupabaseAdmin();
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "checkins";
const SUPABASE_BUCKET_PRIVATE = process.env.SUPABASE_BUCKET_PRIVATE === "true";

// ---- Game parameters (tunable)
const ROUND_JOIN_QUORUM = Number(process.env.ROUND_JOIN_QUORUM || 200); // paid players required to activate prize round (legacy)
const VOTE_QUORUM = Number(process.env.VOTE_QUORUM || 25); // normal votes required to finalize a check-in
const VOTE_QUORUM_LOW = Number(process.env.VOTE_QUORUM_LOW || 10); // low-activity votes required
const VOTE_ACTIVITY_WINDOW_MIN = Number(process.env.VOTE_ACTIVITY_WINDOW_MIN || 60);
const VOTE_ACTIVITY_THRESHOLD = Number(process.env.VOTE_ACTIVITY_THRESHOLD || 30); // if votes in window < threshold -> low activity
const REAL_PCT_TO_VERIFY = Number(process.env.REAL_PCT_TO_VERIFY || 0.7);
const FAKE_PCT_TO_FLAG = Number(process.env.FAKE_PCT_TO_FLAG || 0.3);
const REQUIRE_WORLD_ID_FOR_VOTING = process.env.REQUIRE_WORLD_ID_FOR_VOTING === "true";

// ---- Cohort / geo game lifecycle
const GAME_LAUNCH_AT = process.env.GAME_LAUNCH_AT || null; // ISO timestamp
const COHORT_SIZE = Number(process.env.COHORT_SIZE || 50);
const DAILY_SURVIVAL_CAP = Number(process.env.DAILY_SURVIVAL_CAP || 25);
const CHECKIN_RADIUS_M = Number(process.env.CHECKIN_RADIUS_M || 100);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

// In-memory rounds fallback (used when Supabase isn't configured)
const memRounds = new Map(); // day -> round
const memCheckins = []; // { id, day, address, lat, lng, distance_m, rank, survived, created_at }

// ---- In-memory stores (hackathon-friendly fallback)
// If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, we write to Supabase instead.
const siweNonces = new Map(); // nonce -> { createdAt }
const sessions = new Map(); // sessionId -> { address, createdAt }
const payReferences = new Map(); // reference -> { address, createdAt }
const submissions = []; // { id, address, day, theme, caption, message, signature, createdAt, votes }
const worldIdVerified = new Map(); // address -> true
const paidUsers = new Set(); // address

function now() {
  return Date.now();
}

function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

function makeNonce() {
  // Alphanumeric and >= 8 chars (docs requirement)
  return randomId(12).replaceAll(/[^a-z0-9]/gi, "").slice(0, 16);
}

function makeReferralCode(hint) {
  const slug = (hint || 'anon').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  return `LHS-${slug}-${randomId(3)}`;
}

function cleanup() {
  const ttlMs = 1000 * 60 * 30; // 30 minutes
  for (const [nonce, meta] of siweNonces) {
    if (now() - meta.createdAt > ttlMs) siweNonces.delete(nonce);
  }
  for (const [sid, meta] of sessions) {
    if (now() - meta.createdAt > 1000 * 60 * 60 * 24 * 7) sessions.delete(sid);
  }
  for (const [ref, meta] of payReferences) {
    if (now() - meta.createdAt > ttlMs) payReferences.delete(ref);
  }
}

setInterval(cleanup, 60_000).unref();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Basic CORS for local dev where Vite runs on 5173 and API on 8787.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    supabase: Boolean(supabaseAdmin),
  });
});

function requireAuth(req, res, next) {
  const sid = req.cookies?.lhs_session;
  const session = sid ? sessions.get(sid) : null;
  if (!session) return res.status(401).json({ error: "not_authenticated" });
  req.user = { address: session.address };
  next();
}

// ---- Auth (SIWE via MiniKit)
app.post(
  "/api/nonce",
  rateLimit({
    keyFn: (req) => `nonce:${req.ip}`,
    limit: 30,
    windowMs: 60_000,
  }),
  (req, res) => {
  const nonce = makeNonce();
  siweNonces.set(nonce, { createdAt: now() });
  res.json({ nonce });
  },
);

app.post(
  "/api/complete-siwe",
  rateLimit({
    keyFn: (req) => `siwe:${req.ip}`,
    limit: 30,
    windowMs: 60_000,
  }),
  async (req, res) => {
  const { payload, nonce } = req.body || {};
  if (!payload || !nonce) return res.status(400).json({ error: "missing_payload_or_nonce" });
  if (!siweNonces.has(nonce)) return res.status(400).json({ error: "invalid_or_expired_nonce" });

  try {
    const verification = await verifySiweMessage(payload, nonce);
    if (!verification.isValid) return res.status(401).json({ error: "invalid_siwe" });

    const address = verification.siweMessageData.address;
    const sessionId = randomId(18);
    sessions.set(sessionId, { address, createdAt: now() });
    siweNonces.delete(nonce);

    if (supabaseAdmin) {
      await supabaseAdmin.from("users").upsert(
        { address, last_seen_at: new Date().toISOString() },
        { onConflict: "address" },
      );
    }

    res.cookie("lhs_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PROD,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      ok: true,
      address,
    });
  } catch (e) {
    res.status(400).json({
      error: "siwe_verification_failed",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
  },
);

// Demo / dev convenience: create a session without real SIWE.
// Only available when DEV_BYPASS_VERIFICATION=true. Frontend calls this from
// the browser fallback walletAuth path so the demo can actually exercise the
// check-in API (which requires an auth session).
app.post("/api/dev/login", async (req, res) => {
  if (process.env.DEV_BYPASS_VERIFICATION !== "true") {
    return res.status(404).json({ error: "not_enabled" });
  }
  const stubAddress = `0xDEMO${randomId(8).slice(0, 36).padEnd(36, '0')}`;
  const sessionId = randomId(18);
  sessions.set(sessionId, { address: stubAddress, createdAt: now() });
  paidUsers.add(stubAddress.toLowerCase()); // demo: also mark "paid" so check-in works

  if (supabaseAdmin) {
    await supabaseAdmin.from("users").upsert(
      { address: stubAddress, paid: true, reserved_at: new Date().toISOString(), last_seen_at: new Date().toISOString() },
      { onConflict: "address" },
    );
  }

  res.cookie("lhs_session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
  res.json({ ok: true, address: stubAddress, mode: "dev" });
});

app.post("/api/logout", (req, res) => {
  const sid = req.cookies?.lhs_session;
  if (sid) sessions.delete(sid);
  res.clearCookie("lhs_session");
  res.json({ ok: true });
});

// ---- World ID (IDKit)
// This uses RP signatures (never expose the signing key to the client).
app.post("/api/idkit/rp-context", requireAuth, async (req, res) => {
  const rp_id = process.env.WORLD_ID_RP_ID;
  const signing_key = process.env.WORLD_ID_SIGNING_KEY;
  const action = process.env.WORLD_ID_ACTION || "last-human-standing";

  if (!rp_id || !signing_key) {
    return res.status(501).json({
      error: "world_id_not_configured",
      message: "Set WORLD_ID_RP_ID and WORLD_ID_SIGNING_KEY to enable World ID.",
    });
  }

  try {
    const signed = signRequest(signing_key, action, 5 * 60);
    // rp_context shape expected by @worldcoin/idkit request widget
    return res.json({
      rp_context: {
        rp_id,
        nonce: signed.nonce,
        created_at: signed.created_at,
        expires_at: signed.expires_at,
        signature: signed.sig,
      },
      action,
    });
  } catch (e) {
    return res.status(400).json({
      error: "rp_context_failed",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
});

app.post("/api/idkit/verify", requireAuth, async (req, res) => {
  const rp_id = process.env.WORLD_ID_RP_ID;
  const app_id = process.env.WORLD_ID_APP_ID;
  const action = process.env.WORLD_ID_ACTION || "last-human-standing";
  const apiKey = process.env.WORLD_DEV_PORTAL_API_KEY;
  const bypass = process.env.DEV_BYPASS_VERIFICATION === "true";

  const { idkitResponse } = req.body || {};
  if (!idkitResponse) return res.status(400).json({ error: "missing_idkit_response" });

  if (!rp_id && !app_id) {
    if (bypass) {
      worldIdVerified.set(req.user.address.toLowerCase(), true);
      if (supabaseAdmin) {
        await supabaseAdmin.from("users").upsert(
          { address: req.user.address, world_id_verified: true, last_seen_at: new Date().toISOString() },
          { onConflict: "address" },
        );
      }
      return res.json({ ok: true, verified: true, mode: "bypass" });
    }
    return res.status(501).json({
      error: "world_id_not_configured",
      message: "Set WORLD_ID_RP_ID to verify proofs.",
    });
  }

  // Use rp_id (v4) when available, fall back to app_id (legacy)
  const verifyId = rp_id || app_id;
  const isV4 = Boolean(rp_id);

  try {
    let body;
    if (isV4) {
      // World ID 4.0 Managed mode — POST /api/v4/verify/{rp_id}
      body = JSON.stringify({
        protocol_version: idkitResponse.protocol_version || "4.0",
        nonce: idkitResponse.nonce,
        action,
        responses: idkitResponse.responses || [
          {
            identifier: idkitResponse.verification_level || "orb",
            merkle_root: idkitResponse.merkle_root,
            nullifier: idkitResponse.nullifier_hash,
            proof: idkitResponse.proof,
            signal_hash: idkitResponse.signal_hash || undefined,
          },
        ],
      });
    } else {
      // Legacy v2
      body = JSON.stringify({
        nullifier_hash: idkitResponse.nullifier_hash,
        merkle_root: idkitResponse.merkle_root,
        proof: idkitResponse.proof,
        verification_level: idkitResponse.verification_level || "orb",
        action,
        signal_hash: idkitResponse.signal_hash || undefined,
      });
    }

    const endpoint = isV4
      ? `https://developer.worldcoin.org/api/v4/verify/${verifyId}`
      : `https://developer.worldcoin.org/api/v2/verify/${verifyId}`;

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body,
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok) return res.status(400).json({ error: "verify_failed", details: json });

    worldIdVerified.set(req.user.address.toLowerCase(), true);
    if (supabaseAdmin) {
      await supabaseAdmin.from("users").upsert(
        { address: req.user.address, world_id_verified: true, last_seen_at: new Date().toISOString() },
        { onConflict: "address" },
      );
    }
    return res.json({ ok: true, verified: true, details: json });
  } catch (e) {
    return res.status(400).json({
      error: "verify_exception",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
});

// ---- Live stats (prize pool balance from World Chain + player counts from Supabase)
const WORLD_CHAIN_RPC = "https://worldchain-mainnet.g.alchemy.com/public";
const WLD_CONTRACT = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003"; // WLD on World Chain
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231"; // balanceOf(address) selector

async function fetchWldBalance(address) {
  const padded = address.replace("0x", "").toLowerCase().padStart(64, "0");
  const data = ERC20_BALANCE_OF_SELECTOR + padded;
  const resp = await fetch(WORLD_CHAIN_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: WLD_CONTRACT, data }, "latest"] }),
    signal: AbortSignal.timeout(5000),
  });
  const json = await resp.json();
  if (!json.result || json.result === "0x") return 0;
  const raw = BigInt(json.result);
  return Number(raw) / 1e18;
}

// Cache balance for 60s to avoid hammering RPC
let balanceCache = { value: 0, fetchedAt: 0 };

app.get("/api/stats", async (req, res) => {
  try {
    const prizePoolAddress = process.env.VITE_PRIZE_POOL_ADDRESS;

    // Refresh cache every 60s
    if (prizePoolAddress && Date.now() - balanceCache.fetchedAt > 60_000) {
      try {
        balanceCache.value = await fetchWldBalance(prizePoolAddress);
        balanceCache.fetchedAt = Date.now();
      } catch {
        // keep stale value on RPC error
      }
    }

    let totalPlayers = 0;
    let activePlayers = 0;
    if (supabaseAdmin) {
      const [total, active] = await Promise.all([
        supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true),
        supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true).eq("eliminated", false),
      ]);
      totalPlayers = total.count ?? 0;
      activePlayers = active.count ?? 0;
    }

    res.json({
      ok: true,
      prizePool: {
        address: prizePoolAddress || null,
        balanceWld: balanceCache.value,
        explorerUrl: prizePoolAddress
          ? `https://worldscan.org/address/${prizePoolAddress}`
          : null,
      },
      players: { total: totalPlayers, active: activePlayers },
    });
  } catch (e) {
    res.status(500).json({ error: "stats_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

function computeVoteStatus(votes, quorum) {
  const total = votes.real + votes.fake;
  if (total < quorum) return { status: "pending", total };
  const realPct = total > 0 ? votes.real / total : 0;
  const fakePct = total > 0 ? votes.fake / total : 0;
  if (realPct >= REAL_PCT_TO_VERIFY) return { status: "verified", total, realPct, fakePct };
  if (fakePct >= FAKE_PCT_TO_FLAG) return { status: "flagged", total, realPct, fakePct };
  // Ambiguous outcome: keep pending; in prod you might add "needs_review"
  return { status: "pending", total, realPct, fakePct };
}

async function getDynamicVoteQuorum() {
  // Default: normal quorum.
  let effective = VOTE_QUORUM;
  let reason = "normal";

  if (!supabaseAdmin) return { effective, reason };

  const windowStart = new Date(Date.now() - VOTE_ACTIVITY_WINDOW_MIN * 60_000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .gte("created_at", windowStart);

  if (!error && typeof count === "number" && count < VOTE_ACTIVITY_THRESHOLD) {
    effective = VOTE_QUORUM_LOW;
    reason = `low_activity_${count}_votes_in_${VOTE_ACTIVITY_WINDOW_MIN}m`;
  }

  return { effective, reason };
}

app.get("/api/round-status", async (req, res) => {
  try {
    let paidCount = paidUsers.size;
    if (supabaseAdmin) {
      const { count, error } = await supabaseAdmin
        .from("users")
        .select("address", { count: "exact", head: true })
        .eq("paid", true);
      if (!error && typeof count === "number") paidCount = count;
    }

    const quorum = await getDynamicVoteQuorum();

    res.json({
      ok: true,
      round: {
        state: paidCount >= ROUND_JOIN_QUORUM ? "active" : "warmup",
        paidCount,
        joinQuorum: ROUND_JOIN_QUORUM,
      },
      verification: {
        voteQuorum: quorum.effective,
        voteQuorumNormal: VOTE_QUORUM,
        voteQuorumLow: VOTE_QUORUM_LOW,
        voteQuorumReason: quorum.reason,
        realPctToVerify: REAL_PCT_TO_VERIFY,
        fakePctToFlag: FAKE_PCT_TO_FLAG,
      },
    });
  } catch (e) {
    res.status(400).json({ error: "round_status_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// ---- Payments (MiniKit Pay)
app.post("/api/pay/reference", requireAuth, (req, res) => {
  const reference = crypto.randomUUID();
  payReferences.set(reference, { address: req.user.address, createdAt: now() });
  res.json({ reference });
});

app.post("/api/pay/confirm", requireAuth, async (req, res) => {
  const { payload } = req.body || {};
  if (!payload?.transactionId || !payload?.reference) {
    return res.status(400).json({ error: "missing_transaction_payload" });
  }

  const meta = payReferences.get(payload.reference);
  if (!meta) return res.status(400).json({ error: "unknown_reference" });
  if (meta.address.toLowerCase() !== req.user.address.toLowerCase()) {
    return res.status(403).json({ error: "reference_owner_mismatch" });
  }

  // Hackathon-friendly: allow bypass for local dev if env not configured.
  const appId = process.env.WORLD_APP_ID;
  const apiKey = process.env.WORLD_DEV_PORTAL_API_KEY;
  const bypass = process.env.DEV_BYPASS_VERIFICATION === "true";

  if (!appId || !apiKey) {
    if (bypass) {
      paidUsers.add(req.user.address.toLowerCase());
      if (supabaseAdmin) {
        const refCode = makeReferralCode(req.user.address.slice(0, 6));
        const referredBy = req.body?.referredBy || null;
        await supabaseAdmin.from("users").upsert(
          { address: req.user.address, paid: true, reserved_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), referral_code: refCode, referred_by: referredBy },
          { onConflict: "address", ignoreDuplicates: false },
        );
        if (referredBy) {
          await supabaseAdmin.rpc('increment_referral', { ref_code: referredBy }).catch(() => {});
        }
      }
      return res.json({ ok: true, verified: true, mode: "bypass" });
    }
    return res.status(501).json({
      error: "world_verification_not_configured",
      message:
        "Set WORLD_APP_ID and WORLD_DEV_PORTAL_API_KEY to verify payments (or set DEV_BYPASS_VERIFICATION=true for local demo).",
    });
  }

  try {
    const url = `https://developer.worldcoin.org/api/v2/minikit/transaction/${payload.transactionId}?app_id=${appId}&type=payment`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(400).json({ error: "world_api_error", status: resp.status, body: text });
    }

    const tx = await resp.json();
    // tx structure may evolve; for hackathon we only return it and let UI treat response as verified.
    paidUsers.add(req.user.address.toLowerCase());
    if (supabaseAdmin) {
      const refCode = makeReferralCode(req.user.address.slice(0, 6));
      const referredBy = req.body?.referredBy || null;
      await supabaseAdmin.from("users").upsert(
        { address: req.user.address, paid: true, reserved_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), referral_code: refCode, referred_by: referredBy },
        { onConflict: "address", ignoreDuplicates: false },
      );
      if (referredBy) {
        await supabaseAdmin.rpc('increment_referral', { ref_code: referredBy }).catch(() => {});
      }
    }
    res.json({ ok: true, verified: true, tx });
  } catch (e) {
    res.status(400).json({
      error: "payment_verification_failed",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
});

// ---- Media uploads (Supabase Storage)
app.post("/api/upload-url", requireAuth, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(501).json({
      error: "supabase_not_configured",
      message: "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable uploads.",
    });
  }

  const { fileName, contentType } = req.body || {};
  if (!fileName) return res.status(400).json({ error: "missing_fileName" });

  const safeName = String(fileName).replaceAll(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `${req.user.address}/${Date.now()}_${safeName}`;

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .createSignedUploadUrl(path, 60);
    if (error) return res.status(400).json({ error: "signed_upload_failed", message: error.message });

    res.json({
      ok: true,
      bucket: SUPABASE_BUCKET,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      contentType: contentType || "application/octet-stream",
    });
  } catch (e) {
    res.status(400).json({
      error: "signed_upload_exception",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
});

app.post("/api/media-url", requireAuth, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(501).json({ error: "supabase_not_configured" });
  }
  const { path } = req.body || {};
  if (!path) return res.status(400).json({ error: "missing_path" });

  try {
    if (!SUPABASE_BUCKET_PRIVATE) {
      const publicUrl = supabaseAdmin.storage.from(SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl;
      return res.json({ ok: true, url: publicUrl, kind: "public" });
    }

    const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).createSignedUrl(path, 60 * 5);
    if (error) return res.status(400).json({ error: "signed_url_failed", message: error.message });
    return res.json({ ok: true, url: data.signedUrl, kind: "signed" });
  } catch (e) {
    return res.status(400).json({ error: "media_url_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// ---- Check-ins + votes
app.post("/api/checkin", requireAuth, async (req, res) => {
  const { day, theme, caption, message, signature, address, mediaPath, username, isInfiltrator } = req.body || {};
  if (!message || !signature || !address) return res.status(400).json({ error: "missing_signature_payload" });

  try {
    const ok = await verifyMessage({
      address,
      message,
      signature,
    });
    if (!ok) return res.status(401).json({ error: "invalid_signature" });

    const { effective: dynamicVoteQuorum } = await getDynamicVoteQuorum();

    const payloadToStore = {
      address: req.user.address,
      username: username ? String(username) : null,
      day: Number(day ?? 0),
      theme: String(theme ?? ""),
      caption: String(caption ?? ""),
      message,
      signature,
      media_path: mediaPath ? String(mediaPath) : null,
      vote_quorum: dynamicVoteQuorum,
      status: "pending",
      is_infiltrator: Boolean(isInfiltrator),
    };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("submissions")
        .insert(payloadToStore)
        .select("*")
        .single();
      if (error) return res.status(400).json({ error: "db_insert_failed", message: error.message });

      let mediaUrl = null;
      if (data.media_path) {
        if (SUPABASE_BUCKET_PRIVATE) {
          const { data: signed } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).createSignedUrl(data.media_path, 60 * 5);
          mediaUrl = signed?.signedUrl ?? null;
        } else {
          mediaUrl = supabaseAdmin.storage.from(SUPABASE_BUCKET).getPublicUrl(data.media_path).data.publicUrl;
        }
      }
      return res.json({
        ok: true,
        submission: {
          ...data,
          mediaUrl,
          votes: { real: 0, fake: 0 },
          voteQuorum: data.vote_quorum ?? dynamicVoteQuorum,
        },
      });
    }

    const submission = {
      id: submissions.length + 1,
      ...payloadToStore,
      createdAt: new Date().toISOString(),
      votes: { real: 0, fake: 0 },
    };
    submissions.unshift(submission);
    return res.json({ ok: true, submission });
  } catch (e) {
    res.status(400).json({
      error: "checkin_failed",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
});

app.get("/api/feed", (req, res) => {
  // Auth is optional — unauthenticated browser demo gets empty feed (mock data is client-side)
  const sid = req.cookies?.lhs_session;
  const session = sid ? sessions.get(sid) : null;
  if (!session) return res.json({ ok: true, submissions: [] });

  (async () => {
    if (!supabaseAdmin) return res.json({ ok: true, submissions: submissions.slice(0, 50) });

    const { data: subs, error } = await supabaseAdmin
      .from("submissions")
      .select("id,created_at,address,username,day,theme,caption,media_path,status,vote_quorum,is_infiltrator")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });

    const ids = subs.map((s) => s.id);
    const voteCounts = new Map(); // id -> { real, fake }
    if (ids.length > 0) {
      const { data: agg, error: aggErr } = await supabaseAdmin
        .from("votes")
        .select("submission_id,vote")
        .in("submission_id", ids);
      if (!aggErr && Array.isArray(agg)) {
        for (const row of agg) {
          const cur = voteCounts.get(row.submission_id) || { real: 0, fake: 0 };
          if (row.vote === "real") cur.real += 1;
          if (row.vote === "fake") cur.fake += 1;
          voteCounts.set(row.submission_id, cur);
        }
      }
    }

    const withVotes = subs.map((s) => ({
      ...s,
      votes: voteCounts.get(s.id) || { real: 0, fake: 0 },
      mediaUrl: null,
      voteQuorum: s.vote_quorum ?? VOTE_QUORUM,
    }));

    // Add media URLs (public or signed depending on bucket config)
    for (const item of withVotes) {
      if (!item.media_path) continue;
      if (!SUPABASE_BUCKET_PRIVATE) {
        item.mediaUrl = supabaseAdmin.storage.from(SUPABASE_BUCKET).getPublicUrl(item.media_path).data.publicUrl;
      } else {
        const { data: signed } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).createSignedUrl(item.media_path, 60 * 5);
        item.mediaUrl = signed?.signedUrl ?? null;
      }
    }

    return res.json({ ok: true, submissions: withVotes });
  })().catch((e) => {
    res.status(400).json({ error: "feed_failed", message: e instanceof Error ? e.message : "unknown_error" });
  });
});

app.post(
  "/api/vote",
  requireAuth,
  rateLimit({
    keyFn: (req) => `vote:${req.user?.address || req.ip}`,
    limit: 30,
    windowMs: 60_000,
  }),
  (req, res) => {
  const { submissionId, vote } = req.body || {};
  if (!submissionId || !["real", "fake"].includes(vote)) return res.status(400).json({ error: "invalid_vote" });

  (async () => {
    if (REQUIRE_WORLD_ID_FOR_VOTING) {
      const addr = req.user.address.toLowerCase();
      let verified = worldIdVerified.get(addr) === true;
      if (supabaseAdmin && !verified) {
        const { data } = await supabaseAdmin.from("users").select("world_id_verified").eq("address", req.user.address).single();
        verified = Boolean(data?.world_id_verified);
      }
      if (!verified) return res.status(403).json({ error: "world_id_required" });
    }

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.from("votes").insert({
        submission_id: Number(submissionId),
        voter_address: req.user.address,
        vote,
      });
      if (error) {
        if (String(error.message || "").includes("duplicate")) {
          return res.status(409).json({ error: "already_voted" });
        }
        return res.status(400).json({ error: "db_vote_failed", message: error.message });
      }

      const { data: allVotes } = await supabaseAdmin
        .from("votes")
        .select("vote")
        .eq("submission_id", Number(submissionId));

      const votes = { real: 0, fake: 0 };
      for (const v of allVotes || []) {
        if (v.vote === "real") votes.real += 1;
        if (v.vote === "fake") votes.fake += 1;
      }

      const { data: subRow } = await supabaseAdmin
        .from("submissions")
        .select("vote_quorum")
        .eq("id", Number(submissionId))
        .single();
      const quorum = subRow?.vote_quorum ?? VOTE_QUORUM;

      const computed = computeVoteStatus(votes, quorum);
      if (computed.status !== "pending") {
        await supabaseAdmin
          .from("submissions")
          .update({ status: computed.status })
          .eq("id", Number(submissionId));

        // Update voter accuracy for all voters on this submission
        updateVoterAccuracy(Number(submissionId), computed.status).catch(() => {});
      }

      return res.json({ ok: true, votes, status: computed.status, voteQuorum: quorum });
    }

    const sub = submissions.find((s) => s.id === Number(submissionId));
    if (!sub) return res.status(404).json({ error: "submission_not_found" });
    sub.votes[vote] += 1;
    const quorum = sub.vote_quorum ?? VOTE_QUORUM;
    const computed = computeVoteStatus(sub.votes, quorum);
    sub.status = computed.status;
    return res.json({ ok: true, votes: sub.votes, status: sub.status, voteQuorum: quorum });
  })().catch((e) => {
    res.status(400).json({ error: "vote_failed", message: e instanceof Error ? e.message : "unknown_error" });
  });
  },
);

// =====================================================================
// Voter accuracy tracking
// =====================================================================

async function updateVoterAccuracy(submissionId, finalStatus) {
  if (!supabaseAdmin) return;
  // "verified" means the correct vote was "real"; "flagged" means "fake" was correct
  const correctVote = finalStatus === "verified" ? "real" : "fake";

  const { data: allVotes } = await supabaseAdmin
    .from("votes")
    .select("voter_address, vote")
    .eq("submission_id", submissionId);
  if (!allVotes?.length) return;

  for (const v of allVotes) {
    const isCorrect = v.vote === correctVote;
    // Upsert voter_stats: increment total_votes and correct_votes
    const { data: existing } = await supabaseAdmin
      .from("voter_stats")
      .select("total_votes, correct_votes")
      .eq("address", v.voter_address)
      .maybeSingle();

    const total = (existing?.total_votes ?? 0) + 1;
    const correct = (existing?.correct_votes ?? 0) + (isCorrect ? 1 : 0);
    const accuracy = Math.round((correct / total) * 100);

    await supabaseAdmin.from("voter_stats").upsert(
      { address: v.voter_address, total_votes: total, correct_votes: correct, accuracy_pct: accuracy },
      { onConflict: "address" },
    );
  }
}

app.get("/api/voter-stats/:address", async (req, res) => {
  try {
    const addr = req.params.address;
    if (!addr) return res.status(400).json({ error: "missing_address" });
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from("voter_stats")
        .select("total_votes, correct_votes, accuracy_pct")
        .eq("address", addr)
        .maybeSingle();
      return res.json({ ok: true, stats: data || { total_votes: 0, correct_votes: 0, accuracy_pct: 0 } });
    }
    return res.json({ ok: true, stats: { total_votes: 0, correct_votes: 0, accuracy_pct: 0 } });
  } catch (e) {
    res.status(400).json({ error: "voter_stats_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// =====================================================================
// Cohort + game state (theme-based check-ins, GPS optional)
// =====================================================================

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // earth radius (m)
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!ADMIN_TOKEN) return res.status(501).json({ error: "admin_not_configured" });
  if (!token || token !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  next();
}

function currentDayNumber(launchAtMs) {
  if (!launchAtMs) return null;
  const elapsed = Date.now() - launchAtMs;
  if (elapsed < 0) return null;
  return Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1;
}

async function loadRound(day) {
  if (day == null) return null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("rounds")
      .select("*")
      .eq("day", day)
      .maybeSingle();
    return data || null;
  }
  return memRounds.get(day) || null;
}

async function checkinCountForDay(day) {
  if (supabaseAdmin) {
    const { count } = await supabaseAdmin
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("day", day);
    return count ?? 0;
  }
  return memCheckins.filter((c) => c.day === day).length;
}

async function userCheckinForDay(day, address) {
  if (!address) return null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("checkins")
      .select("*")
      .eq("day", day)
      .eq("address", address)
      .maybeSingle();
    return data || null;
  }
  return memCheckins.find((c) => c.day === day && c.address === address) || null;
}

async function getUserRecord(address) {
  if (!address) return null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("address", address)
      .maybeSingle();
    return data || null;
  }
  // In-memory fallback uses paidUsers + worldIdVerified maps
  const lower = address.toLowerCase();
  return {
    address,
    paid: paidUsers.has(lower),
    eliminated: false,
    eliminated_at_day: null,
    world_id_verified: worldIdVerified.get(lower) === true,
  };
}

async function reservedCount() {
  if (supabaseAdmin) {
    const { count } = await supabaseAdmin
      .from("users")
      .select("address", { count: "exact", head: true })
      .eq("paid", true);
    return count ?? 0;
  }
  return paidUsers.size;
}

app.get("/api/game/state", async (req, res) => {
  try {
    const launchAtMs = GAME_LAUNCH_AT ? Date.parse(GAME_LAUNCH_AT) : null;
    const reserved = await reservedCount();

    let phase = "prelaunch";
    let currentDay = null;
    if (launchAtMs && Date.now() >= launchAtMs) {
      phase = "live";
      currentDay = currentDayNumber(launchAtMs);
    }

    let round = null;
    let checkinCount = 0;
    if (phase === "live" && currentDay != null) {
      round = await loadRound(currentDay);
      if (round) checkinCount = await checkinCountForDay(currentDay);
    }

    // Identify the requesting user (optional — endpoint is public)
    const sid = req.cookies?.lhs_session;
    const session = sid ? sessions.get(sid) : null;
    const address = session?.address ?? null;

    let you = {
      isAuthed: false,
      isPaid: false,
      isEliminated: false,
      eliminatedAtDay: null,
      checkedInToday: false,
      rankToday: null,
      survivedToday: null,
      distanceToday: null,
    };
    if (address) {
      const u = await getUserRecord(address);
      const ci = currentDay != null ? await userCheckinForDay(currentDay, address) : null;
      you = {
        address,
        isAuthed: true,
        isPaid: Boolean(u?.paid),
        isEliminated: Boolean(u?.eliminated),
        eliminatedAtDay: u?.eliminated_at_day ?? null,
        checkedInToday: Boolean(ci),
        rankToday: ci?.rank ?? null,
        survivedToday: ci?.survived ?? null,
        distanceToday: ci?.distance_m ?? null,
      };
    }

    // Has the cohort filled (closes pre-launch early)?
    const cohortFull = reserved >= COHORT_SIZE;
    if (phase === "prelaunch" && cohortFull) {
      // Pre-launch effectively closed; UI can show "cohort full, waiting for start"
    }

    res.json({
      ok: true,
      now: new Date().toISOString(),
      phase,
      launchAt: GAME_LAUNCH_AT,
      cohortSize: COHORT_SIZE,
      reservedCount: reserved,
      cohortFull,
      currentDay,
      round: round
        ? {
            day: round.day,
            name: round.name,
            prompt: round.prompt ?? "",
            placeType: round.place_type ?? round.name ?? "",
            lat: round.lat != null ? Number(round.lat) : null,
            lng: round.lng != null ? Number(round.lng) : null,
            radiusM: round.radius_m ?? CHECKIN_RADIUS_M,
            gpsRequired: round.lat != null && round.lng != null,
            survivalCap: round.survival_cap ?? DAILY_SURVIVAL_CAP,
            opensAt: round.opens_at,
            closesAt: round.closes_at,
            status: round.status,
            checkinCount,
            slotsRemaining: Math.max(0, (round.survival_cap ?? DAILY_SURVIVAL_CAP) - checkinCount),
          }
        : null,
      you,
      defaults: {
        survivalCap: DAILY_SURVIVAL_CAP,
        radiusM: CHECKIN_RADIUS_M,
      },
    });
  } catch (e) {
    res.status(500).json({ error: "game_state_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post(
  "/api/checkin/location",
  requireAuth,
  rateLimit({
    keyFn: (req) => `geo:${req.user?.address || req.ip}`,
    limit: 20,
    windowMs: 60_000,
  }),
  async (req, res) => {
    const { lat, lng, accuracy } = req.body || {};

    try {
      const launchAtMs = GAME_LAUNCH_AT ? Date.parse(GAME_LAUNCH_AT) : null;
      if (!launchAtMs || Date.now() < launchAtMs) {
        return res.status(400).json({ error: "game_not_live" });
      }
      const day = currentDayNumber(launchAtMs);
      const round = await loadRound(day);
      if (!round) return res.status(400).json({ error: "round_not_set", day });

      const opensAtMs = Date.parse(round.opens_at);
      const closesAtMs = Date.parse(round.closes_at);
      const nowMs = Date.now();
      if (nowMs < opensAtMs) return res.status(400).json({ error: "round_not_open", opensAt: round.opens_at });
      if (nowMs > closesAtMs) return res.status(400).json({ error: "round_closed", closesAt: round.closes_at });

      // GPS is optional metadata — compute distance only when both user and round have coords
      const hasUserGps = typeof lat === "number" && typeof lng === "number";
      const hasRoundGps = round.lat != null && round.lng != null;
      let distance = null;
      if (hasUserGps && hasRoundGps) {
        distance = haversineMeters(lat, lng, Number(round.lat), Number(round.lng));
      }

      // Check eligibility — must be paid + not already eliminated
      const userRec = await getUserRecord(req.user.address);
      if (!userRec?.paid) return res.status(403).json({ error: "not_reserved" });
      if (userRec?.eliminated) return res.status(403).json({ error: "already_eliminated", day: userRec.eliminated_at_day });

      // Already checked in?
      const existing = await userCheckinForDay(day, req.user.address);
      if (existing) {
        return res.json({
          ok: true,
          alreadyCheckedIn: true,
          rank: existing.rank,
          survived: existing.survived,
          distanceM: existing.distance_m != null ? Math.round(existing.distance_m) : null,
          survivalCap: round.survival_cap ?? DAILY_SURVIVAL_CAP,
        });
      }

      const cap = round.survival_cap ?? DAILY_SURVIVAL_CAP;
      const currentCount = await checkinCountForDay(day);
      const rank = currentCount + 1;
      const survived = rank <= cap;

      const row = {
        day,
        address: req.user.address,
        lat: hasUserGps ? lat : null,
        lng: hasUserGps ? lng : null,
        accuracy_m: typeof accuracy === "number" ? accuracy : null,
        distance_m: distance,
        rank,
        survived,
      };

      if (supabaseAdmin) {
        const { data, error } = await supabaseAdmin
          .from("checkins")
          .insert(row)
          .select("*")
          .single();
        if (error) {
          if (String(error.message || "").includes("duplicate")) {
            return res.status(409).json({ error: "already_checked_in" });
          }
          return res.status(400).json({ error: "db_insert_failed", message: error.message });
        }
        // If they didn't survive, mark eliminated
        if (!survived) {
          await supabaseAdmin
            .from("users")
            .update({ eliminated: true, eliminated_at_day: day })
            .eq("address", req.user.address);
        }
        return res.json({
          ok: true,
          rank: data.rank,
          survived: data.survived,
          distanceM: data.distance_m != null ? Math.round(data.distance_m) : null,
          survivalCap: cap,
          gpsShared: hasUserGps,
        });
      }

      // In-memory fallback
      memCheckins.push({ id: memCheckins.length + 1, ...row, created_at: new Date().toISOString() });
      return res.json({
        ok: true,
        rank,
        survived,
        distanceM: distance != null ? Math.round(distance) : null,
        survivalCap: cap,
        gpsShared: hasUserGps,
      });
    } catch (e) {
      res.status(400).json({ error: "checkin_location_failed", message: e instanceof Error ? e.message : "unknown_error" });
    }
  },
);

app.get("/api/cohort/roster", async (req, res) => {
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("address, username, reserved_at, eliminated, eliminated_at_day, referral_code, referral_count")
        .eq("paid", true)
        .order("reserved_at", { ascending: false })
        .limit(200);
      if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
      return res.json({ ok: true, roster: data || [] });
    }
    // In-memory fallback
    const list = Array.from(paidUsers).map((address) => ({
      address,
      username: null,
      reserved_at: null,
      eliminated: false,
      eliminated_at_day: null,
    }));
    return res.json({ ok: true, roster: list });
  } catch (e) {
    res.status(400).json({ error: "roster_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// ---- Lobby Chat (persistent messages for mini app)
const memChatMessages = []; // fallback: { id, address, username, message, created_at }

app.post("/api/chat", requireAuth, async (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "missing_message" });
  }
  const text = message.trim().slice(0, 500);
  const address = req.user.address;

  try {
    if (supabaseAdmin) {
      // Look up username
      const { data: u } = await supabaseAdmin.from("users").select("username").eq("address", address).single();
      const row = { address, username: u?.username || null, message: text };
      const { data, error } = await supabaseAdmin.from("chat_messages").insert(row).select("*").single();
      if (error) return res.status(400).json({ error: "chat_insert_failed", message: error.message });
      return res.json({ ok: true, msg: data });
    }
    // In-memory fallback
    const msg = { id: randomId(8), address, username: null, message: text, created_at: new Date().toISOString() };
    memChatMessages.push(msg);
    if (memChatMessages.length > 200) memChatMessages.shift();
    return res.json({ ok: true, msg });
  } catch (e) {
    res.status(400).json({ error: "chat_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.get("/api/chat/messages", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("chat_messages")
        .select("id, address, username, message, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return res.status(400).json({ error: "chat_read_failed", message: error.message });
      return res.json({ ok: true, messages: (data || []).reverse() });
    }
    return res.json({ ok: true, messages: memChatMessages.slice(-limit) });
  } catch (e) {
    res.status(400).json({ error: "chat_messages_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.get("/api/checkins/today", async (req, res) => {
  try {
    const launchAtMs = GAME_LAUNCH_AT ? Date.parse(GAME_LAUNCH_AT) : null;
    const day = currentDayNumber(launchAtMs);
    if (day == null) return res.json({ ok: true, day: null, checkins: [] });

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("checkins")
        .select("rank, address, username, distance_m, survived, created_at")
        .eq("day", day)
        .order("rank", { ascending: true })
        .limit(100);
      if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
      return res.json({ ok: true, day, checkins: data || [] });
    }

    const list = memCheckins
      .filter((c) => c.day === day)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 100);
    return res.json({ ok: true, day, checkins: list });
  } catch (e) {
    res.status(400).json({ error: "checkins_today_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// ---- Admin endpoints (token-gated)
app.post("/api/admin/round", requireAdmin, async (req, res) => {
  const { day, name, prompt, place_type, lat, lng, radius_m, survival_cap, opens_at, closes_at, status } = req.body || {};
  if (typeof day !== "number" || !name || !opens_at || !closes_at) {
    return res.status(400).json({ error: "missing_fields", required: ["day", "name", "opens_at", "closes_at"] });
  }
  const row = {
    day,
    name,
    prompt: prompt ?? "",
    place_type: place_type ?? name,
    lat: typeof lat === "number" ? lat : null,
    lng: typeof lng === "number" ? lng : null,
    radius_m: typeof radius_m === "number" ? radius_m : CHECKIN_RADIUS_M,
    survival_cap: typeof survival_cap === "number" ? survival_cap : DAILY_SURVIVAL_CAP,
    opens_at,
    closes_at,
    status: status ?? "scheduled",
    updated_at: new Date().toISOString(),
  };

  try {
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("rounds")
        .upsert(row, { onConflict: "day" })
        .select("*")
        .single();
      if (error) return res.status(400).json({ error: "db_upsert_failed", message: error.message });
      return res.json({ ok: true, round: data });
    }
    memRounds.set(day, row);
    return res.json({ ok: true, round: row });
  } catch (e) {
    res.status(400).json({ error: "admin_round_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post("/api/admin/close-day", requireAdmin, async (req, res) => {
  const { day } = req.body || {};
  if (typeof day !== "number") return res.status(400).json({ error: "missing_day" });

  try {
    const round = await loadRound(day);
    if (!round) return res.status(404).json({ error: "round_not_found" });
    const cap = round.survival_cap ?? DAILY_SURVIVAL_CAP;

    if (supabaseAdmin) {
      // Mark non-survivors (rank > cap) as not-survived in checkins
      await supabaseAdmin
        .from("checkins")
        .update({ survived: false })
        .eq("day", day)
        .gt("rank", cap);

      // Mark all reserved users who have NO checkin for this day OR rank > cap as eliminated
      const { data: ck } = await supabaseAdmin
        .from("checkins")
        .select("address, rank")
        .eq("day", day);
      const survivorAddrs = new Set((ck || []).filter((r) => r.rank <= cap).map((r) => r.address.toLowerCase()));

      const { data: paidUsersRows } = await supabaseAdmin
        .from("users")
        .select("address, eliminated")
        .eq("paid", true);

      const toEliminate = (paidUsersRows || [])
        .filter((u) => !u.eliminated && !survivorAddrs.has(u.address.toLowerCase()))
        .map((u) => u.address);

      if (toEliminate.length > 0) {
        await supabaseAdmin
          .from("users")
          .update({ eliminated: true, eliminated_at_day: day })
          .in("address", toEliminate);
      }

      await supabaseAdmin
        .from("rounds")
        .update({ status: "closed", updated_at: new Date().toISOString() })
        .eq("day", day);

      return res.json({ ok: true, day, survivors: survivorAddrs.size, eliminated: toEliminate.length });
    }

    // In-memory: mark non-survivors
    let survivors = 0;
    for (const c of memCheckins) {
      if (c.day === day) {
        c.survived = c.rank <= cap;
        if (c.survived) survivors += 1;
      }
    }
    const r = memRounds.get(day);
    if (r) r.status = "closed";
    return res.json({ ok: true, day, survivors, eliminated: null, mode: "memory" });
  } catch (e) {
    res.status(400).json({ error: "close_day_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// ---- Waitlist + Referral system
app.post("/api/waitlist", async (req, res) => {
  try {
    const { email, referredBy } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "invalid_email" });
    }
    const refCode = makeReferralCode(email.split('@')[0]);

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("waitlist")
        .upsert({ email, referral_code: refCode, referred_by: referredBy || null }, { onConflict: "email", ignoreDuplicates: false })
        .select("referral_code, referral_count")
        .single();
      if (error) return res.status(400).json({ error: "waitlist_failed", message: error.message });
      if (referredBy) {
        await supabaseAdmin.rpc('increment_referral', { ref_code: referredBy }).catch(() => {});
      }
      return res.json({ ok: true, referralCode: data.referral_code, referralCount: data.referral_count });
    }
    return res.json({ ok: true, referralCode: refCode, referralCount: 0 });
  } catch (e) {
    res.status(400).json({ error: "waitlist_error", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.get("/api/referral-board", async (req, res) => {
  try {
    if (supabaseAdmin) {
      // Merge users + waitlist referral counts into one leaderboard
      const [{ data: users }, { data: wl }] = await Promise.all([
        supabaseAdmin.from("users").select("username, address, referral_code, referral_count").gt("referral_count", 0).order("referral_count", { ascending: false }).limit(50),
        supabaseAdmin.from("waitlist").select("email, referral_code, referral_count").gt("referral_count", 0).order("referral_count", { ascending: false }).limit(50),
      ]);
      const board = [
        ...(users || []).map(u => ({ name: u.username || u.address?.slice(0, 8) || 'anon', referralCode: u.referral_code, count: u.referral_count, source: 'user' })),
        ...(wl || []).map(w => ({ name: w.email?.split('@')[0] || 'anon', referralCode: w.referral_code, count: w.referral_count, source: 'waitlist' })),
      ].sort((a, b) => b.count - a.count).slice(0, 20);
      return res.json({ ok: true, board });
    }
    return res.json({ ok: true, board: [] });
  } catch (e) {
    res.status(400).json({ error: "referral_board_error", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.get("/api/referral/:code", async (req, res) => {
  try {
    const code = req.params.code;
    if (supabaseAdmin) {
      const { data: u } = await supabaseAdmin.from("users").select("referral_count").eq("referral_code", code).single();
      if (u) return res.json({ ok: true, count: u.referral_count });
      const { data: w } = await supabaseAdmin.from("waitlist").select("referral_count").eq("referral_code", code).single();
      if (w) return res.json({ ok: true, count: w.referral_count });
    }
    return res.json({ ok: true, count: 0 });
  } catch (e) {
    res.status(400).json({ error: "referral_lookup_error", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// Also return referral_code when fetching user profile (enhance existing roster endpoint)

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});
