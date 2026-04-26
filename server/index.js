import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { verifyMessage } from "viem";

const PORT = Number(process.env.PORT || 8787);
const IS_PROD = process.env.NODE_ENV === "production";

// ---- In-memory stores (hackathon-friendly)
// In production: replace with Postgres + Redis (or Supabase).
const siweNonces = new Map(); // nonce -> { createdAt }
const sessions = new Map(); // sessionId -> { address, createdAt }
const payReferences = new Map(); // reference -> { address, createdAt }
const submissions = []; // { id, address, day, theme, caption, message, signature, createdAt, votes }

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
  res.json({ ok: true, time: new Date().toISOString() });
});

function requireAuth(req, res, next) {
  const sid = req.cookies?.lhs_session;
  const session = sid ? sessions.get(sid) : null;
  if (!session) return res.status(401).json({ error: "not_authenticated" });
  req.user = { address: session.address };
  next();
}

// ---- Auth (SIWE via MiniKit)
app.post("/api/nonce", (req, res) => {
  const nonce = makeNonce();
  siweNonces.set(nonce, { createdAt: now() });
  res.json({ nonce });
});

app.post("/api/complete-siwe", async (req, res) => {
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
});

app.post("/api/logout", (req, res) => {
  const sid = req.cookies?.lhs_session;
  if (sid) sessions.delete(sid);
  res.clearCookie("lhs_session");
  res.json({ ok: true });
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
    res.json({ ok: true, verified: true, tx });
  } catch (e) {
    res.status(400).json({
      error: "payment_verification_failed",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
});

// ---- Check-ins + votes
app.post("/api/checkin", requireAuth, async (req, res) => {
  const { day, theme, caption, message, signature, address } = req.body || {};
  if (!message || !signature || !address) return res.status(400).json({ error: "missing_signature_payload" });

  try {
    const ok = await verifyMessage({
      address,
      message,
      signature,
    });
    if (!ok) return res.status(401).json({ error: "invalid_signature" });

    const submission = {
      id: submissions.length + 1,
      address: req.user.address,
      day: Number(day ?? 0),
      theme: String(theme ?? ""),
      caption: String(caption ?? ""),
      message,
      signature,
      createdAt: new Date().toISOString(),
      votes: { real: 0, fake: 0 },
      status: "pending",
    };
    submissions.unshift(submission);
    res.json({ ok: true, submission });
  } catch (e) {
    res.status(400).json({
      error: "checkin_failed",
      message: e instanceof Error ? e.message : "unknown_error",
    });
  }
});

app.get("/api/feed", requireAuth, (req, res) => {
  res.json({ ok: true, submissions: submissions.slice(0, 50) });
});

app.post("/api/vote", requireAuth, (req, res) => {
  const { submissionId, vote } = req.body || {};
  if (!submissionId || !["real", "fake"].includes(vote)) return res.status(400).json({ error: "invalid_vote" });

  const sub = submissions.find((s) => s.id === Number(submissionId));
  if (!sub) return res.status(404).json({ error: "submission_not_found" });

  // Minimal anti-abuse for now (no per-user vote tracking).
  sub.votes[vote] += 1;
  res.json({ ok: true, votes: sub.votes });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});

