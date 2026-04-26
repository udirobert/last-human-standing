import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { verifyMessage } from "viem";
import { getSupabaseAdmin } from "./supabase.js";
import { signRequest } from "@worldcoin/idkit/signing";
import { rateLimit } from "./rateLimit.js";

const PORT = Number(process.env.PORT || 8787);
const IS_PROD = process.env.NODE_ENV === "production";
const supabaseAdmin = getSupabaseAdmin();
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "checkins";
const SUPABASE_BUCKET_PRIVATE = process.env.SUPABASE_BUCKET_PRIVATE === "true";

// ---- Game parameters (tunable)
const ROUND_JOIN_QUORUM = Number(process.env.ROUND_JOIN_QUORUM || 200); // paid players required to activate prize round
const VOTE_QUORUM = Number(process.env.VOTE_QUORUM || 25); // normal votes required to finalize a check-in
const VOTE_QUORUM_LOW = Number(process.env.VOTE_QUORUM_LOW || 10); // low-activity votes required
const VOTE_ACTIVITY_WINDOW_MIN = Number(process.env.VOTE_ACTIVITY_WINDOW_MIN || 60);
const VOTE_ACTIVITY_THRESHOLD = Number(process.env.VOTE_ACTIVITY_THRESHOLD || 30); // if votes in window < threshold -> low activity
const REAL_PCT_TO_VERIFY = Number(process.env.REAL_PCT_TO_VERIFY || 0.7);
const FAKE_PCT_TO_FLAG = Number(process.env.FAKE_PCT_TO_FLAG || 0.3);
const REQUIRE_WORLD_ID_FOR_VOTING = process.env.REQUIRE_WORLD_ID_FOR_VOTING === "true";

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
  const app_id = process.env.WORLD_ID_APP_ID;
  const action = process.env.WORLD_ID_ACTION || "last-human-standing";
  const apiKey = process.env.WORLD_DEV_PORTAL_API_KEY;
  const bypass = process.env.DEV_BYPASS_VERIFICATION === "true";

  const { idkitResponse } = req.body || {};
  if (!idkitResponse) return res.status(400).json({ error: "missing_idkit_response" });

  if (!app_id) {
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
      message: "Set WORLD_ID_APP_ID (and WORLD_DEV_PORTAL_API_KEY) to verify proofs.",
    });
  }

  try {
    const resp = await fetch(`https://developer.worldcoin.org/api/v2/verify/${app_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        nullifier_hash: idkitResponse.nullifier_hash,
        merkle_root: idkitResponse.merkle_root,
        proof: idkitResponse.proof,
        verification_level: idkitResponse.verification_level || "orb",
        action,
        signal_hash: idkitResponse.signal_hash || undefined,
      }),
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
        await supabaseAdmin.from("users").upsert(
          { address: req.user.address, paid: true, last_seen_at: new Date().toISOString() },
          { onConflict: "address" },
        );
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
      await supabaseAdmin.from("users").upsert(
        { address: req.user.address, paid: true, last_seen_at: new Date().toISOString() },
        { onConflict: "address" },
      );
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
  const { day, theme, caption, message, signature, address, mediaPath, username } = req.body || {};
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

app.get("/api/feed", requireAuth, (req, res) => {
  (async () => {
    if (!supabaseAdmin) return res.json({ ok: true, submissions: submissions.slice(0, 50) });

    const { data: subs, error } = await supabaseAdmin
      .from("submissions")
      .select("id,created_at,address,username,day,theme,caption,media_path,status,vote_quorum")
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

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});
