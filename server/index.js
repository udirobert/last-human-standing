import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { verifyMessage } from "viem";
import { getSupabaseAdmin } from "./supabase.js";
import { checkGpsPlausibility, checkTimingAnomaly, checkVoteRing, flagSubmission } from "./anticheat.js";
import { rateLimit } from "./rateLimit.js";
import { verifySelfProof } from "./selfVerify.js";
import helmet from "helmet";
import cors from "cors";
import pushRoutes from "./routes/push.js";
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import referralRoutes from "./routes/referral.js";
import ariaRoutes from "./routes/aria.js";
import activityRoutes from "./routes/activity.js";
import farcasterRoutes from "./routes/farcaster.js";
import shareRoutes from "./routes/share.js";
import {
  ensureObjectBody, ensureString, ensureNumber, ensureBoolean,
  ensureEnum, ensureIsoDate, sendValidationError,
} from "./lib/validators.js";
import { sendPushToAddress, broadcastPush } from "./lib/push.js";
import { startVoteRelayer, enqueueVote } from "./lib/voteRelayer.js";
function signRequest(signingKey, action, ttlSeconds = 300) {
  const nonce = randomId(16);
  const created_at = Math.floor(Date.now() / 1000);
  const expires_at = created_at + ttlSeconds;
  const payload = `${nonce}.${action}.${created_at}.${expires_at}`;
  const key = signingKey.startsWith("0x") ? signingKey.slice(2) : signingKey;
  const sig = crypto.createHmac("sha256", Buffer.from(key, "hex")).update(payload).digest("hex");
  return { nonce, created_at, expires_at, sig };
}

const PORT = Number(process.env.PORT || 8787);
const IS_PROD = process.env.NODE_ENV === "production";
const supabaseAdmin = getSupabaseAdmin();
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "checkins";
const SUPABASE_BUCKET_PRIVATE = process.env.SUPABASE_BUCKET_PRIVATE === "true";
const SESSION_COOKIE = "lhs_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const NONCE_TTL_MS = 1000 * 60 * 30;
const PAY_REFERENCE_TTL_MS = 1000 * 60 * 30;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const ROUND_JOIN_QUORUM = Number(process.env.ROUND_JOIN_QUORUM || 200);
const VOTE_QUORUM = Number(process.env.VOTE_QUORUM || 25);
const VOTE_QUORUM_LOW = Number(process.env.VOTE_QUORUM_LOW || 10);
const VOTE_ACTIVITY_WINDOW_MIN = Number(process.env.VOTE_ACTIVITY_WINDOW_MIN || 60);
const VOTE_ACTIVITY_THRESHOLD = Number(process.env.VOTE_ACTIVITY_THRESHOLD || 30);
const REAL_PCT_TO_VERIFY = Number(process.env.REAL_PCT_TO_VERIFY || 0.7);
const FAKE_PCT_TO_FLAG = Number(process.env.FAKE_PCT_TO_FLAG || 0.3);
const REQUIRE_WORLD_ID_FOR_VOTING = process.env.REQUIRE_WORLD_ID_FOR_VOTING === "true";

const GAME_LAUNCH_AT = process.env.GAME_LAUNCH_AT || null;
const COHORT_SIZE = Number(process.env.COHORT_SIZE || 50);
const DAILY_SURVIVAL_CAP = Number(process.env.DAILY_SURVIVAL_CAP || 25);
const CHECKIN_RADIUS_M = Number(process.env.CHECKIN_RADIUS_M || 100);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || null;

let balanceCache = { value: 0, fetchedAt: 0 };

function now() {
  return Date.now();
}

function log(event, data = {}) {
  const entry = { time: new Date().toISOString(), event, ...data };
  console.log(JSON.stringify(entry));
}

function randomId(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

function makeNonce() {
  return randomId(12).replaceAll(/[^a-z0-9]/gi, "").slice(0, 16);
}

function makeReferralCode(hint) {
  const slug = (hint || "anon").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
  return `LHS-${slug}-${randomId(3)}`;
}

function isoFromMs(ms) {
  return new Date(ms).toISOString();
}

function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
  });
}

async function cleanupPersistentState() {
  if (!supabaseAdmin) return;
  const nowIso = new Date().toISOString();
  await Promise.allSettled([
    supabaseAdmin.from("game_sessions").delete().lte("expires_at", nowIso),
    supabaseAdmin.from("siwe_nonces").delete().lte("expires_at", nowIso),
    supabaseAdmin.from("pay_references").delete().lte("expires_at", nowIso),
    supabaseAdmin.from("rate_limits").delete().lte("expires_at", nowIso),
  ]);
}

async function autoAdvanceRounds() {
  if (!supabaseAdmin) return;

  try {
    const { data, error } = await supabaseAdmin.rpc("advance_rounds");
    if (error) {
      log("round_scheduler_error", { source: "rpc", error: error.message });
      return;
    }
    const result = data ?? { opened: [], closed: [], errors: [] };

    // Notify subscribed users when rounds open
    for (const r of result.opened ?? []) {
      log("round_auto_opened", { day: r.day });
      broadcastPush(supabaseAdmin, {
        title: "New round open!",
        body: `Day ${r.day} check-in is now live. Find your spot.`,
        data: { type: "round_opened", day: r.day },
      }).catch((e) => log("push_error", { where: "round_opened", error: String(e) }));
    }

    // Notify eliminated users when rounds close
    for (const r of result.closed ?? []) {
      log("round_auto_closed", { day: r.day, survivors: r.survivors, eliminated: r.eliminated });
      // Best-effort: fetch the list of eliminated addresses and notify each
      try {
        const { data: eliminatedRows } = await supabaseAdmin
          .from("users")
          .select("address")
          .eq("eliminated_at_day", r.day);
        for (const u of eliminatedRows || []) {
          sendPushToAddress(supabaseAdmin, u.address, {
            title: "Eliminated",
            body: `Day ${r.day} is closed. You didn't make the cut.`,
            data: { type: "eliminated", day: r.day },
          }).catch(() => {});
        }
      } catch (e) {
        log("push_error", { where: "round_closed", error: String(e) });
      }
    }

    for (const r of result.errors ?? []) {
      log("round_scheduler_error", { day: r.day, error: r.error });
    }
  } catch (e) {
    log("round_scheduler_error", { source: "catch", error: e instanceof Error ? e.message : "unknown" });
  }
}

setInterval(() => {
  cleanupPersistentState().catch(() => {});
  autoAdvanceRounds().catch(() => {});
}, 60_000).unref();

// Start onchain vote relayer — reads from file-based queue, submits to VoteRegistry on Celo.
// No-op (logs "vote_relayer_offline") if VOTE_REGISTRY_ADDRESS + CELO_SIGNING_KEY not set.
const stopRelayer = startVoteRelayer({ log });

const rateLimitStorage = supabaseAdmin
  ? {
      async hit({ key, now: currentNow, windowMs, limit }) {
        const nowIso = isoFromMs(currentNow);
        const expiresIso = isoFromMs(currentNow + windowMs);
        const { data: existing } = await supabaseAdmin
          .from("rate_limits")
          .select("key,hits,window_started_at,expires_at")
          .eq("key", key)
          .maybeSingle();

        let hits = 1;
        let windowStartedAt = nowIso;
        if (existing && Date.parse(existing.expires_at) > currentNow) {
          hits = Number(existing.hits || 0) + 1;
          windowStartedAt = existing.window_started_at;
        }

        await supabaseAdmin.from("rate_limits").upsert({
          key,
          hits,
          window_started_at: windowStartedAt,
          expires_at: expiresIso,
        });

        if (hits > limit) {
          return {
            allowed: false,
            retryAfterMs: Math.max(0, Date.parse(existing?.expires_at || expiresIso) - currentNow),
          };
        }

        return { allowed: true, retryAfterMs: 0 };
      },
    }
  : null;

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(helmet({
  crossOriginResourcePolicy: { policy: "same-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://worldchain-mainnet.g.alchemy.com", "https://*.supabase.co", "https://developer.worldcoin.org", "https://developer.world.org", "https://api.neynar.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:"],
    },
  },
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error("origin_not_allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Cookie", "x-admin-token"],
}));

// Push notification routes
app.use("/api/push", pushRoutes({ requireAuth, supabaseAdmin, log }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), supabase: Boolean(supabaseAdmin) });
});

app.post("/api/report-error", async (req, res) => {
  const body = ensureObjectBody(req, res);
  if (!body) return;
  log("client_error", {
    message: ensureString(body.message, { field: "message", maxLength: 500 }) ?? null,
    hasStack: Boolean(body.stack),
    hasComponentStack: Boolean(body.componentStack),
    userAgent: ensureString(body.userAgent, { field: "userAgent", maxLength: 300 }) ?? null,
  });
  res.json({ ok: true });
});

async function createNonceRecord(nonce) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("siwe_nonces").upsert({
    nonce,
    created_at: new Date().toISOString(),
    expires_at: isoFromMs(now() + NONCE_TTL_MS),
  });
}

async function consumeNonceRecord(nonce) {
  if (!supabaseAdmin) return false;
  const { data } = await supabaseAdmin.from("siwe_nonces").select("nonce,expires_at").eq("nonce", nonce).maybeSingle();
  if (!data || Date.parse(data.expires_at) <= now()) return false;
  await supabaseAdmin.from("siwe_nonces").delete().eq("nonce", nonce);
  return true;
}

async function createSessionRecord(address) {
  const sessionId = randomId(18);
  if (supabaseAdmin) {
    await supabaseAdmin.from("game_sessions").insert({
      id: sessionId,
      address,
      expires_at: isoFromMs(now() + SESSION_TTL_MS),
    });
  }
  return sessionId;
}

async function getSessionRecord(sessionId) {
  if (!sessionId) return null;
  if (supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("game_sessions")
      .select("id,address,expires_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (!data || Date.parse(data.expires_at) <= now()) return null;
    return data;
  }
  return null;
}

async function deleteSessionRecord(sessionId) {
  if (!sessionId || !supabaseAdmin) return;
  await supabaseAdmin.from("game_sessions").delete().eq("id", sessionId);
}

async function createPayReferenceRecord(reference, address) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("pay_references").upsert({
    reference,
    address,
    created_at: new Date().toISOString(),
    expires_at: isoFromMs(now() + PAY_REFERENCE_TTL_MS),
  });
}

async function consumePayReferenceRecord(reference) {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from("pay_references")
    .select("reference,address,expires_at")
    .eq("reference", reference)
    .maybeSingle();
  if (!data || Date.parse(data.expires_at) <= now()) return null;
  await supabaseAdmin.from("pay_references").delete().eq("reference", reference);
  return data;
}

async function getOptionalAuthAddress(req) {
  const sid = req.cookies?.[SESSION_COOKIE];
  const session = await getSessionRecord(sid);
  return session?.address ?? null;
}

async function requireAuth(req, res, next) {
  // Allow admin token as alternative auth
  if (ADMIN_TOKEN && req.headers["x-admin-token"] === ADMIN_TOKEN) {
    return next();
  }
  const sid = req.cookies?.[SESSION_COOKIE];
  const session = await getSessionRecord(sid);
  if (!session) return res.status(401).json({ error: "not_authenticated" });
  req.user = { address: session.address };
  next();
}








app.post("/api/idkit/rp-context", requireAuth, async (req, res) => {
  const rp_id = process.env.WORLD_ID_RP_ID;
  const signing_key = process.env.WORLD_ID_SIGNING_KEY;
  const action = process.env.WORLD_ID_ACTION || "last-human-standing";

  if (!rp_id || !signing_key) {
    return res.status(501).json({ error: "world_id_not_configured", message: "Set WORLD_ID_RP_ID and WORLD_ID_SIGNING_KEY to enable World ID." });
  }

  try {
    const signed = signRequest(signing_key, action, 5 * 60);
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
    return res.status(400).json({ error: "rp_context_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post("/api/idkit/verify", requireAuth, async (req, res) => {
  const rp_id = process.env.WORLD_ID_RP_ID;
  const app_id = process.env.WORLD_ID_APP_ID;
  const action = process.env.WORLD_ID_ACTION || "last-human-standing";
  const apiKey = process.env.WORLD_DEV_PORTAL_API_KEY;

  const bodyReq = ensureObjectBody(req, res);
  if (!bodyReq) return;
  const { idkitResponse } = bodyReq;
  if (!idkitResponse) return res.status(400).json({ error: "missing_idkit_response" });

  if (!rp_id && !app_id) {
    return res.status(501).json({ error: "world_id_not_configured", message: "Set WORLD_ID_RP_ID to verify proofs." });
  }

  const verifyId = rp_id || app_id;
  const isV4 = Boolean(rp_id);

  try {
    const verifyBody = isV4
      ? JSON.stringify({
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
        })
      : JSON.stringify({
          nullifier_hash: idkitResponse.nullifier_hash,
          merkle_root: idkitResponse.merkle_root,
          proof: idkitResponse.proof,
          verification_level: idkitResponse.verification_level || "orb",
          action,
          signal_hash: idkitResponse.signal_hash || undefined,
        });

    const endpoint = isV4
      ? `https://developer.worldcoin.org/api/v4/verify/${verifyId}`
      : `https://developer.worldcoin.org/api/v2/verify/${verifyId}`;

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: verifyBody,
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok) return res.status(400).json({ error: "verify_failed", details: json });

    if (supabaseAdmin) {
      await supabaseAdmin.from("users").upsert(
        { address: req.user.address, world_id_verified: true, last_seen_at: new Date().toISOString() },
        { onConflict: "address" },
      );
    }
    return res.json({ ok: true, verified: true, details: json });
  } catch (e) {
    return res.status(400).json({ error: "verify_exception", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// Self Protocol (Celo) proof-of-humanity.
// Public endpoint (no requireAuth) — Self's relayer POSTs the proof back
// to us without our session cookie. Security comes from the ZK proof
// itself, which is cryptographically bound to the wallet the user is
// trying to verify. The recovered wallet is then upserted in Supabase.
app.post("/api/self/verify", async (req, res) => {
  const body = ensureObjectBody(req, res);
  if (!body) return;

  if (process.env.SELF_ENABLED !== "true") {
    return res.status(501).json({
      status: "error",
      result: false,
      reason: "self_not_configured",
      message: "Set SELF_ENABLED=true and install @selfxyz/core to enable Self Protocol verification.",
    });
  }

  try {
    const verification = await verifySelfProof(body);
    if (!verification.ok) {
      return res.status(200).json({
        status: "error",
        result: false,
        reason: verification.reason || "verify_failed",
        details: verification.details ?? null,
      });
    }

    const walletAddress = verification.walletAddress;
    if (!walletAddress) {
      return res.status(200).json({
        status: "error",
        result: false,
        reason: "missing_wallet_in_proof",
      });
    }

    if (supabaseAdmin) {
      // Reject if the same nullifier (proof userIdentifier) is already
      // bound to a DIFFERENT wallet — a Self proof is per-scope per-user
      // and should map to one wallet per cohort.
      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("address")
        .eq("humanity_nullifier", walletAddress)
        .neq("address", walletAddress)
        .maybeSingle();
      if (existing) {
        return res.status(200).json({
          status: "error",
          result: false,
          reason: "nullifier_already_used",
        });
      }

      await supabaseAdmin.from("users").upsert(
        {
          address: walletAddress,
          humanity_provider: "self",
          humanity_nullifier: walletAddress,
          humanity_verified_at: new Date().toISOString(),
          world_id_verified: true, // Self is treated as a full PoH proof
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "address" },
      );
    }

    log("self_verified", { address: walletAddress });
    return res.status(200).json({
      status: "success",
      result: true,
      address: walletAddress,
      provider: "self",
    });
  } catch (e) {
    return res.status(200).json({
      status: "error",
      result: false,
      reason: "self_verify_exception",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
});

const WORLD_CHAIN_RPC = process.env.WORLD_CHAIN_RPC || "https://worldchain-mainnet.g.alchemy.com/public";
const WLD_CONTRACT = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003";
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";
const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df35b9bc";

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

async function verifyWldTransfer(txHash, senderAddress, prizePoolAddress) {
  try {
    const receiptResp = await fetch(WORLD_CHAIN_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash],
      }),
      signal: AbortSignal.timeout(8000),
    });
    const receiptJson = await receiptResp.json();
    if (!receiptJson.result) return { valid: false, reason: "tx_not_found" };

    const receipt = receiptJson.result;
    if (receipt.status === "0x0") return { valid: false, reason: "tx_failed" };

    // Check to == WLD contract
    const toAddr = receipt.to?.toLowerCase();
    if (toAddr !== WLD_CONTRACT.toLowerCase()) {
      return { valid: false, reason: "wrong_contract", actualTo: receipt.to };
    }

    // Parse Transfer event log (topic0 + topics[1,2] + data)
    // 3 topics: Transfer(address from, address to, uint256 amount)
    const transferTopic = ERC20_TRANSFER_TOPIC.toLowerCase();
    const transferLogs = receipt.logs.filter(
      (log) =>
        log.address?.toLowerCase() === WLD_CONTRACT.toLowerCase() &&
        log.topics?.[0]?.toLowerCase() === transferTopic,
    );

    if (transferLogs.length === 0) return { valid: false, reason: "no_transfer_event" };

    const normalizedSender = senderAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const normalizedRecipient = prizePoolAddress.toLowerCase().replace("0x", "").padStart(64, "0");
    const amountWei = BigInt(1) * BigInt(1e18);

    for (const log of transferLogs) {
      const fromRaw = log.topics[1]; // indexed: from
      const toRaw = log.topics[2];   // indexed: to
      const amountRaw = log.data === "0x" ? "0x0" : log.data;

      const fromAddrLogged = fromRaw.replace("0x", "").toLowerCase();
      const toAddrLogged = toRaw.replace("0x", "").toLowerCase();
      const amount = BigInt(amountRaw);

      // sender == from, prize pool == to, amount >= 1 WLD
      if (fromAddrLogged === normalizedSender && toAddrLogged === normalizedRecipient && amount >= amountWei) {
        return { valid: true, reason: "ok" };
      }
    }

    return { valid: false, reason: "amount_insufficient_or_wrong_recipient" };
  } catch (e) {
    return { valid: false, reason: `rpc_error: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

app.get("/api/stats", async (req, res) => {
  try {
    const prizePoolAddress = process.env.VITE_PRIZE_POOL_ADDRESS;
    if (prizePoolAddress && Date.now() - balanceCache.fetchedAt > 60_000) {
      try {
        balanceCache.value = await fetchWldBalance(prizePoolAddress);
        balanceCache.fetchedAt = Date.now();
      } catch {
        // keep stale value
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
        explorerUrl: prizePoolAddress ? `https://worldscan.org/address/${prizePoolAddress}` : null,
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
  return { status: "pending", total, realPct, fakePct };
}

async function getDynamicVoteQuorum() {
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
    let paidCount = 0;
    if (supabaseAdmin) {
      const { count, error } = await supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true);
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
    res.status(500).json({ error: "round_status_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});



async function upsertPaidUser(address, { referredBy = null, platform = null } = {}) {
  if (!supabaseAdmin) return;
  const refCode = makeReferralCode(address.slice(0, 6));
  await supabaseAdmin.from("users").upsert(
    { address, paid: true, reserved_at: new Date().toISOString(), last_seen_at: new Date().toISOString(), referral_code: refCode, referred_by: referredBy, platform },
    { onConflict: "address", ignoreDuplicates: false },
  );
  if (referredBy) {
    await supabaseAdmin.rpc("increment_referral", { ref_code: referredBy }).catch(() => {});
  }
}

app.post("/api/upload-url", requireAuth, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(501).json({ error: "supabase_not_configured", message: "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable uploads." });
  }

  const body = ensureObjectBody(req, res);
  if (!body) return;
  const fileName = ensureString(body.fileName, { field: "fileName", required: true, maxLength: 120 });
  const contentType = ensureString(body.contentType, { field: "contentType", required: false, maxLength: 120 }) || "application/octet-stream";

  const safeName = String(fileName).replaceAll(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `${req.user.address}/${Date.now()}_${safeName}`;

  try {
    const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).createSignedUploadUrl(path, 60);
    if (error) return res.status(400).json({ error: "signed_upload_failed", message: error.message });
    res.json({ ok: true, bucket: SUPABASE_BUCKET, path, token: data.token, signedUrl: data.signedUrl, contentType });
  } catch (e) {
    res.status(400).json({ error: "signed_upload_exception", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post("/api/media-url", requireAuth, async (req, res) => {
  if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
  const body = ensureObjectBody(req, res);
  if (!body) return;
  const path = ensureString(body.path, { field: "path", required: true, maxLength: 255 });

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

app.post("/api/checkin",
  requireAuth,
  rateLimit({ keyFn: (req) => `checkin:${req.user?.address || req.ip}`, limit: 10, windowMs: 60_000, storage: rateLimitStorage }),
  async (req, res) => {
  const body = ensureObjectBody(req, res);
  if (!body) return;

  try {
    const day = ensureNumber(body.day, { field: "day", required: true, integer: true, min: 0 });
    const theme = ensureString(body.theme, { field: "theme", required: true, maxLength: 140 });
    const caption = ensureString(body.caption, { field: "caption", required: false, maxLength: 140 }) || "";
    const message = ensureString(body.message, { field: "message", required: true, maxLength: 2000 });
    const signature = ensureString(body.signature, { field: "signature", required: true, maxLength: 255 });
    const address = ensureString(body.address, { field: "address", required: true, maxLength: 64, pattern: /^0x[a-fA-F0-9]{40}$/ });
    const mediaPath = ensureString(body.mediaPath, { field: "mediaPath", required: false, maxLength: 255 });
    const username = ensureString(body.username, { field: "username", required: false, maxLength: 64 });
    const isInfiltrator = ensureBoolean(body.isInfiltrator, { field: "isInfiltrator" });

    const ok = await verifyMessage({ address, message, signature });
    if (!ok) return res.status(401).json({ error: "invalid_signature" });

    const { effective: dynamicVoteQuorum } = await getDynamicVoteQuorum();
    const payloadToStore = {
      address: req.user.address,
      username,
      day,
      theme,
      caption,
      message,
      signature,
      media_path: mediaPath,
      vote_quorum: dynamicVoteQuorum,
      status: "pending",
      is_infiltrator: isInfiltrator,
    };

    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const { data, error } = await supabaseAdmin.from("submissions").insert(payloadToStore).select("*").single();
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
    return res.json({ ok: true, submission: { ...data, mediaUrl, votes: { real: 0, fake: 0 }, voteQuorum: data.vote_quorum ?? dynamicVoteQuorum } });
  } catch (error) {
    sendValidationError(res, error);
  }
});

app.get("/api/feed", async (req, res) => {
  const address = await getOptionalAuthAddress(req);
  if (!address) return res.json({ ok: true, submissions: [] });

  try {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

    const { data: subs, error } = await supabaseAdmin
      .from("submissions")
      .select("id,created_at,address,username,day,theme,caption,media_path,status,vote_quorum,is_infiltrator")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });

    const ids = subs.map((s) => s.id);
    const voteCounts = new Map();
    if (ids.length > 0) {
      const { data: agg, error: aggErr } = await supabaseAdmin.from("votes").select("submission_id,vote").in("submission_id", ids);
      if (!aggErr && Array.isArray(agg)) {
        for (const row of agg) {
          const cur = voteCounts.get(row.submission_id) || { real: 0, fake: 0 };
          if (row.vote === "real") cur.real += 1;
          if (row.vote === "fake") cur.fake += 1;
          voteCounts.set(row.submission_id, cur);
        }
      }
    }

    const withVotes = subs.map((s) => ({ ...s, votes: voteCounts.get(s.id) || { real: 0, fake: 0 }, mediaUrl: null, voteQuorum: s.vote_quorum ?? VOTE_QUORUM }));
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
  } catch (e) {
    res.status(400).json({ error: "feed_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post(
  "/api/vote",
  requireAuth,
  rateLimit({ keyFn: (req) => `vote:${req.user?.address || req.ip}`, limit: 30, windowMs: 60_000, storage: rateLimitStorage }),
  async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;

    try {
      const submissionId = ensureNumber(body.submissionId, { field: "submissionId", required: true, integer: true, min: 1 });
      const vote = ensureEnum(body.vote, { field: "vote", required: true, values: ["real", "fake"] });

      if (REQUIRE_WORLD_ID_FOR_VOTING) {
        const addr = req.user.address.toLowerCase();
        let verified = false;
        if (supabaseAdmin) {
          const { data } = await supabaseAdmin
            .from("users")
            .select("world_id_verified, humanity_nullifier")
            .eq("address", req.user.address)
            .single();
          verified = Boolean(data?.world_id_verified) || Boolean(data?.humanity_nullifier);
        }
        if (!verified) return res.status(403).json({ error: "humanity_verification_required" });
      }

      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.from("votes").insert({ submission_id: submissionId, voter_address: req.user.address, vote });
        if (error) {
          if (String(error.message || "").includes("duplicate")) return res.status(409).json({ error: "already_voted" });
          return res.status(400).json({ error: "db_vote_failed", message: error.message });
        }

        // Enqueue for onchain batch submission
        try { enqueueVote(submissionId, req.user.address, vote); } catch {};

        // Anti-cheat: vote ring detection (scoped to this voter's history)
        const { data: voterVotes } = await supabaseAdmin
          .from("votes")
          .select("submission_id,voter_address,vote")
          .eq("voter_address", req.user.address);
        const { data: voterSubs } = await supabaseAdmin
          .from("submissions")
          .select("id,status")
          .in("id", [...new Set((voterVotes || []).map((v) => v.submission_id))]);
        const ringReason = checkVoteRing(req.user.address, submissionId, voterVotes || [], voterSubs || []);
        if (ringReason) {
          log("anticheat_flag", { reason: ringReason, address: req.user.address, submissionId });
          await flagSubmission(supabaseAdmin, submissionId, ringReason, { voter: req.user.address });
        }

        const countedVotes = { real: 0, fake: 0 };
        const { data: subVotes } = await supabaseAdmin
          .from("votes")
          .select("vote")
          .eq("submission_id", submissionId);
        for (const v of subVotes || []) {
          if (v.vote === "real") countedVotes.real += 1;
          if (v.vote === "fake") countedVotes.fake += 1;
        }

        const { data: subRow } = await supabaseAdmin.from("submissions").select("vote_quorum").eq("id", submissionId).single();
        const quorum = subRow?.vote_quorum ?? VOTE_QUORUM;
        const computed = computeVoteStatus(countedVotes, quorum);
        if (computed.status !== "pending") {
          await supabaseAdmin.from("submissions").update({ status: computed.status }).eq("id", submissionId);
          updateVoterAccuracy(submissionId, computed.status).catch(() => {});
        }

        return res.json({ ok: true, votes: countedVotes, status: computed.status, voteQuorum: quorum, onchain: Boolean(process.env.VOTE_REGISTRY_ADDRESS) });
      }
    } catch (error) {
      sendValidationError(res, error);
    }
  },
);

async function updateVoterAccuracy(submissionId, finalStatus) {
  if (!supabaseAdmin) return;
  const correctVote = finalStatus === "verified" ? "real" : finalStatus === "flagged" ? "fake" : null;
  if (!correctVote) return;
  const { data: allVotes } = await supabaseAdmin.from("votes").select("voter_address,vote").eq("submission_id", submissionId);
  if (!Array.isArray(allVotes)) return;

  const correctAddrs = allVotes.filter((v) => v.vote === correctVote).map((v) => v.voter_address);
  const wrongAddrs = allVotes.filter((v) => v.vote !== correctVote).map((v) => v.voter_address);

  if (correctAddrs.length) {
    await Promise.allSettled(correctAddrs.map((address) => supabaseAdmin.from("users").update({ last_seen_at: new Date().toISOString() }).eq("address", address)));
  }
  if (wrongAddrs.length) {
    await Promise.allSettled(wrongAddrs.map((address) => supabaseAdmin.from("users").update({ last_seen_at: new Date().toISOString() }).eq("address", address)));
  }
}

app.get("/api/voter-stats/:address", async (req, res) => {
  try {
    const addr = req.params.address;
    if (!supabaseAdmin) return res.json({ ok: true, address: addr, accuracy: null, correct: 0, total: 0 });
    const { data: votes } = await supabaseAdmin.from("votes").select("submission_id,vote").eq("voter_address", addr);
    if (!votes?.length) return res.json({ ok: true, address: addr, accuracy: null, correct: 0, total: 0 });

    const submissionIds = [...new Set(votes.map((v) => v.submission_id))];
    const { data: subs } = await supabaseAdmin.from("submissions").select("id,status").in("id", submissionIds);
    const statusById = new Map((subs || []).map((s) => [s.id, s.status]));

    let total = 0;
    let correct = 0;
    for (const v of votes) {
      const status = statusById.get(v.submission_id);
      if (status !== "verified" && status !== "flagged") continue;
      total += 1;
      if ((status === "verified" && v.vote === "real") || (status === "flagged" && v.vote === "fake")) correct += 1;
    }

    return res.json({ ok: true, address: addr, accuracy: total ? correct / total : null, correct, total });
  } catch (e) {
    res.status(400).json({ error: "voter_stats_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function requireAdmin(req, res, next) {
  if (ADMIN_TOKEN && req.headers["x-admin-token"] === ADMIN_TOKEN) return next();
  if (ADMIN_ADDRESS && req.user?.address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) return next();
  if (!ADMIN_TOKEN && !ADMIN_ADDRESS) return res.status(501).json({ error: "admin_not_configured" });
  return res.status(401).json({ error: "invalid_admin_token" });
}

function currentDayNumber(launchAtMs) {
  if (!launchAtMs) return null;
  const elapsed = Date.now() - launchAtMs;
  if (elapsed < 0) return null;
  return Math.floor(elapsed / (1000 * 60 * 60 * 24)) + 1;
}

async function loadRound(day) {
  if (day == null) return null;
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from("rounds").select("*").eq("day", day).maybeSingle();
  return data || null;
}

async function checkinCountForDay(day) {
  if (!supabaseAdmin) return 0;
  const { count } = await supabaseAdmin.from("checkins").select("id", { count: "exact", head: true }).eq("day", day);
  return count ?? 0;
}

async function userCheckinForDay(day, address) {
  if (!address) return null;
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from("checkins").select("*").eq("day", day).eq("address", address).maybeSingle();
  return data || null;
}

async function getUserRecord(address) {
  if (!address) return null;
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from("users").select("*").eq("address", address).maybeSingle();
  return data || null;
}

async function reservedCount() {
  if (!supabaseAdmin) return 0;
  const { count } = await supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true);
  return count ?? 0;
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

    const address = await getOptionalAuthAddress(req);
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

    const cohortFull = reserved >= COHORT_SIZE;
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
      defaults: { survivalCap: DAILY_SURVIVAL_CAP, radiusM: CHECKIN_RADIUS_M },
    });
  } catch (e) {
    res.status(500).json({ error: "game_state_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post(
  "/api/checkin/location",
  requireAuth,
  rateLimit({ keyFn: (req) => `geo:${req.user?.address || req.ip}`, limit: 20, windowMs: 60_000, storage: rateLimitStorage }),
  async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;

    try {
      const lat = ensureNumber(body.lat, { field: "lat", required: false, min: -90, max: 90 });
      const lng = ensureNumber(body.lng, { field: "lng", required: false, min: -180, max: 180 });
      const accuracy = ensureNumber(body.accuracy, { field: "accuracy", required: false, min: 0, max: 10_000 });

      const launchAtMs = GAME_LAUNCH_AT ? Date.parse(GAME_LAUNCH_AT) : null;
      if (!launchAtMs || Date.now() < launchAtMs) return res.status(400).json({ error: "game_not_live" });
      const day = currentDayNumber(launchAtMs);
      const round = await loadRound(day);
      if (!round) return res.status(400).json({ error: "round_not_set", day });

      const opensAtMs = Date.parse(round.opens_at);
      const closesAtMs = Date.parse(round.closes_at);
      const nowMs = Date.now();
      if (nowMs < opensAtMs) return res.status(400).json({ error: "round_not_open", opensAt: round.opens_at });
      if (nowMs > closesAtMs) return res.status(400).json({ error: "round_closed", closesAt: round.closes_at });

      const hasUserGps = typeof lat === "number" && typeof lng === "number";
      const hasRoundGps = round.lat != null && round.lng != null;
      let distance = null;
      if (hasUserGps && hasRoundGps) {
        distance = haversineMeters(lat, lng, Number(round.lat), Number(round.lng));
      }

      // Anti-cheat: GPS plausibility
      const radiusM = round.radius_m ?? CHECKIN_RADIUS_M;
      const gpsReason = checkGpsPlausibility(distance, typeof accuracy === "number" ? accuracy : null, radiusM);
      if (gpsReason) {
        log("anticheat_flag", { reason: gpsReason, address: req.user.address, day, distanceM: distance != null ? Math.round(distance) : null });
      }

      const userRec = await getUserRecord(req.user.address);
      if (!userRec?.paid) return res.status(403).json({ error: "not_reserved" });
      if (userRec?.eliminated) return res.status(403).json({ error: "already_eliminated", day: userRec.eliminated_at_day });

      const existing = await userCheckinForDay(day, req.user.address);
      if (existing) {
        return res.json({ ok: true, alreadyCheckedIn: true, rank: existing.rank, survived: existing.survived, distanceM: existing.distance_m != null ? Math.round(existing.distance_m) : null, survivalCap: round.survival_cap ?? DAILY_SURVIVAL_CAP });
      }

      // Anti-cheat: timing anomaly
      let timingReason = null;
      if (supabaseAdmin) {
        const { data: recent } = await supabaseAdmin.from("checkins").select("address,day,created_at").eq("day", day).order("created_at", { ascending: false }).limit(50);
        timingReason = checkTimingAnomaly(req.user.address, day, recent || []);
        if (timingReason) log("anticheat_flag", { reason: timingReason, address: req.user.address, day });
      }

      const cap = round.survival_cap ?? DAILY_SURVIVAL_CAP;
      const username = userRec?.username ?? null;

      if (supabaseAdmin) {
        log("checkin_rpc", { address: req.user.address, day, gpsShared: hasUserGps, distanceM: distance != null ? Math.round(distance) : null });
        const { data, error } = await supabaseAdmin.rpc("create_checkin", {
          p_day: day,
          p_address: req.user.address,
          p_username: username,
          p_lat: hasUserGps ? lat : null,
          p_lng: hasUserGps ? lng : null,
          p_accuracy_m: typeof accuracy === "number" ? accuracy : null,
          p_distance_m: distance,
          p_survival_cap: cap,
        });
        if (error) {
          log("checkin_error", { address: req.user.address, day, message: error.message });
          return res.status(400).json({ error: "db_insert_failed", message: error.message });
        }
        if (!data?.survived) {
          await supabaseAdmin.from("users").update({ eliminated: true, eliminated_at_day: day }).eq("address", req.user.address);
          log("checkin_eliminated", { address: req.user.address, day, rank: data?.rank });
        } else {
          log("checkin_survived", { address: req.user.address, day, rank: data?.rank });
        }

        const { data: ckId } = await supabaseAdmin
          .from("checkins")
          .select("id")
          .eq("address", req.user.address)
          .eq("day", day)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return res.json({ ok: true, rank: data.rank, survived: data.survived, distanceM: data.distance_m != null ? Math.round(data.distance_m) : null, survivalCap: cap, gpsShared: hasUserGps, checkinId: ckId?.id ?? null });
      }

      return res.status(501).json({ error: "supabase_not_configured", message: "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable check-ins." });
    } catch (error) {
      log("checkin_error", { address: req.user.address, message: error instanceof Error ? error.message : "unknown" });
      sendValidationError(res, error);
    }
  },
);

app.get("/api/cohort/roster", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("address, username, reserved_at, eliminated, eliminated_at_day, referral_code, referral_count")
      .eq("paid", true)
      .order("reserved_at", { ascending: false })
      .limit(200);
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
    return res.json({ ok: true, roster: data || [] });
  } catch (e) {
    res.status(400).json({ error: "roster_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post("/api/chat",
  requireAuth,
  rateLimit({ keyFn: (req) => `chat:${req.user?.address || req.ip}`, limit: 20, windowMs: 60_000, storage: rateLimitStorage }),
  async (req, res) => {
    const body = ensureObjectBody(req, res);
  if (!body) return;

  try {
    const text = ensureString(body.message, { field: "message", required: true, maxLength: 500 });
    const address = req.user.address;

    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const { data: u } = await supabaseAdmin.from("users").select("username").eq("address", address).single();
    const row = { address, username: u?.username || null, message: text };
    const { data, error } = await supabaseAdmin.from("chat_messages").insert(row).select("*").single();
    if (error) return res.status(400).json({ error: "chat_insert_failed", message: error.message });
    return res.json({ ok: true, msg: data });
  } catch (error) {
    sendValidationError(res, error);
  }
});

app.get("/api/chat/messages", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  try {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const { data, error } = await supabaseAdmin.from("chat_messages").select("id, address, username, message, created_at").order("created_at", { ascending: false }).limit(limit);
    if (error) return res.status(400).json({ error: "chat_read_failed", message: error.message });
    return res.json({ ok: true, messages: (data || []).reverse() });
  } catch (e) {
    res.status(400).json({ error: "chat_messages_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.get("/api/checkins/today", async (req, res) => {
  try {
    const launchAtMs = GAME_LAUNCH_AT ? Date.parse(GAME_LAUNCH_AT) : null;
    const day = currentDayNumber(launchAtMs);
    if (day == null) return res.json({ ok: true, day: null, checkins: [] });

    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const { data, error } = await supabaseAdmin.from("checkins").select("rank, address, username, distance_m, survived, created_at").eq("day", day).order("rank", { ascending: true }).limit(100);
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
    return res.json({ ok: true, day, checkins: data || [] });
  } catch (e) {
    res.status(400).json({ error: "checkins_today_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post("/api/admin/round", requireAuth, requireAdmin, async (req, res) => {
  const body = ensureObjectBody(req, res);
  if (!body) return;

  try {
    const day = ensureNumber(body.day, { field: "day", required: true, integer: true, min: 1 });
    const name = ensureString(body.name, { field: "name", required: true, maxLength: 140 });
    const prompt = ensureString(body.prompt, { field: "prompt", required: false, maxLength: 500 }) || "";
    const place_type = ensureString(body.place_type, { field: "place_type", required: false, maxLength: 140 }) || name;
    const lat = ensureNumber(body.lat, { field: "lat", required: false, min: -90, max: 90 });
    const lng = ensureNumber(body.lng, { field: "lng", required: false, min: -180, max: 180 });
    const radius_m = ensureNumber(body.radius_m, { field: "radius_m", required: false, integer: true, min: 1, max: 100000 }) ?? CHECKIN_RADIUS_M;
    const survival_cap = ensureNumber(body.survival_cap, { field: "survival_cap", required: false, integer: true, min: 1, max: 100000 }) ?? DAILY_SURVIVAL_CAP;
    const opens_at = ensureIsoDate(body.opens_at, { field: "opens_at", required: true });
    const closes_at = ensureIsoDate(body.closes_at, { field: "closes_at", required: true });
    const status = ensureEnum(body.status, { field: "status", required: false, values: ["scheduled", "open", "closed"] }) || "scheduled";

    const row = { day, name, prompt, place_type, lat, lng, radius_m, survival_cap, opens_at, closes_at, status, updated_at: new Date().toISOString() };
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const { data, error } = await supabaseAdmin.from("rounds").upsert(row, { onConflict: "day" }).select("*").single();
    if (error) return res.status(400).json({ error: "db_upsert_failed", message: error.message });
    return res.json({ ok: true, round: data });
  } catch (error) {
    sendValidationError(res, error);
  }
});

app.get("/api/admin/rounds", requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
  try {
    const { data, error } = await supabaseAdmin
      .from("rounds")
      .select("*")
      .order("day", { ascending: true });
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
    return res.json({ ok: true, rounds: data || [] });
  } catch (e) {
    return res.status(400).json({ error: "rounds_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.get("/api/admin/flags", requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  try {
    const { data, error } = await supabaseAdmin
      .from("submission_flags")
      .select("id,reason,metadata,created_at,submission_id")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
    return res.json({ ok: true, flags: data || [] });
  } catch (e) {
    return res.status(400).json({ error: "flags_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post("/api/admin/close-day", requireAuth, requireAdmin, async (req, res) => {
  const body = ensureObjectBody(req, res);
  if (!body) return;

  try {
    const day = ensureNumber(body.day, { field: "day", required: true, integer: true, min: 1 });
    const round = await loadRound(day);
    if (!round) return res.status(404).json({ error: "round_not_found" });
    const cap = round.survival_cap ?? DAILY_SURVIVAL_CAP;

    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    await supabaseAdmin.from("checkins").update({ survived: false }).eq("day", day).gt("rank", cap);
    const { data: ck } = await supabaseAdmin.from("checkins").select("address, rank").eq("day", day);
    const survivorAddrs = new Set((ck || []).filter((r) => r.rank <= cap).map((r) => r.address.toLowerCase()));

    const { data: paidUsersRows } = await supabaseAdmin.from("users").select("address, eliminated").eq("paid", true);
    const toEliminate = (paidUsersRows || []).filter((u) => !u.eliminated && !survivorAddrs.has(u.address.toLowerCase())).map((u) => u.address);
    if (toEliminate.length > 0) {
      await supabaseAdmin.from("users").update({ eliminated: true, eliminated_at_day: day }).in("address", toEliminate);
    }

    await supabaseAdmin.from("rounds").update({ status: "closed", updated_at: new Date().toISOString() }).eq("day", day);
    return res.json({ ok: true, day, survivors: survivorAddrs.size, eliminated: toEliminate.length });
  } catch (error) {
    sendValidationError(res, error);
  }
});

// Manual trigger for the Postgres advance_rounds() function.
// Useful as a fallback if the setInterval scheduler is down, or for ad-hoc admin control.
// Uses pg_advisory_xact_lock so it is safe to call concurrently with the scheduler.
app.post("/api/admin/trigger-rounds", requireAuth, requireAdmin, async (req, res) => {
  if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
  try {
    const { data, error } = await supabaseAdmin.rpc("advance_rounds");
    if (error) return res.status(500).json({ error: "rpc_failed", message: error.message });
    return res.json({ ok: true, result: data });
  } catch (e) {
    return res.status(500).json({ error: "trigger_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});







// Mount route modules. These were extracted from this file to reduce
// its size; behavior is preserved. The original route handlers remain
// below (commented out) for reference during the transition.
app.use("/api", authRoutes({
  requireAuth,
  supabaseAdmin,
  log,
  randomId,
  makeNonce,
  makeReferralCode,
  createSessionRecord,
  getSessionRecord,
  deleteSessionRecord,
  setSessionCookie,
  clearSessionCookie,
  getUserRecord,
  isProd: IS_PROD,
  SESSION_COOKIE,
}));

app.use("/api", paymentRoutes({
  requireAuth,
  supabaseAdmin,
  log,
  upsertPaidUser,
  createPayReferenceRecord,
  consumePayReferenceRecord,
  createSessionRecord,
  setSessionCookie,
  rateLimitStorage,
}));

app.use("/api", referralRoutes({ supabaseAdmin, log, makeReferralCode, rateLimitStorage }));
app.use("/api", ariaRoutes({ requireAuth, requireAdmin, log }));
app.use("/api", activityRoutes({ supabaseAdmin, log }));
app.use("/", farcasterRoutes({ supabaseAdmin, log }));
app.use("/api", shareRoutes({ supabaseAdmin, log }));

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}
