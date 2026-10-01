/**
 * Co-presence routes — docs/TOKEN_ROUNDS.md §2.
 *
 * The nonce exchange:
 *   1. POST /cocircle/challenge  — the challenger opens a nonce exchange and
 *      states where they are. A nonce is issued with a short TTL.
 *   2. POST /cocircle/respond     — the responder presents the SAME nonce and
 *      their own coordinates. buildAttestation() decides whether the two were
 *      genuinely co-present; the server never asks them to prove it, it
 *      measures it.
 *   3. POST /cocircle/transfer    — a token moves, backed by the attested
 *      handshake. There is no path that writes a transfer without one.
 *
 * The whole design rests on step 2 being MUTUAL: both humans participate, so
 * faking it means coordinating two fraudulent devices in place, in real time.
 *
 * Gated on GAME_V3_ENABLED; mounted at /api/v3.
 */
import { Router } from "express";
import { rateLimit } from "../rateLimit.js";
import { ensureObjectBody, ensureNumber, ensureString, sendValidationError } from "../lib/validators.js";
import { buildAttestation, nearestPlayers, DEFAULT_RADIUS_M } from "../lib/coPresence.js";
import { buildAward } from "../lib/creditLedger.js";

/** Radius for the "who's near me" affordance. Not an attestation radius. */
const NEARBY_RADIUS_M = Number(process.env.V3_NEARBY_RADIUS_M || 5000);

function point(lat, lng) {
  return { lat, lng };
}

export default function cocircleRoutes({ supabaseAdmin, rateLimitStorage, requireAuth, GAME_V3_ENABLED }) {
  const router = Router();

  router.use((req, res, next) => {
    if (!GAME_V3_ENABLED) return res.status(404).json({ error: "v3_not_enabled" });
    next();
  });

  // ---------- POST /api/v3/cocircle/challenge ----------
  // Open the exchange. The nonce is what makes the attestation mutual AND
  // single-use: both parties must present it, and it dies quickly.
  router.post(
    "/cocircle/challenge",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3ch:${req.user?.address || req.ip}`, limit: 30, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const body = ensureObjectBody(req, res);
      if (!body) return;

      try {
        const regionId = ensureString(body.regionId, { field: "regionId", required: true, maxLength: 32 });
        const lat = ensureNumber(body.lat, { field: "lat", min: -90, max: 90, required: true });
        const lng = ensureNumber(body.lng, { field: "lng", min: -180, max: 180, required: true });
        const accuracyM = ensureNumber(body.accuracyM, { field: "accuracyM", min: 0, max: 100_000, required: false });

        const nonce = globalThis.crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60_000);

        const { data, error } = await supabaseAdmin
          .from("handshakes")
          .insert({
            challenger: req.user.address.toLowerCase(),
            region_id: regionId,
            nonce,
            status: "pending",
            challenger_lat: lat,
            challenger_lng: lng,
            accuracy_m: accuracyM == null ? null : Math.round(accuracyM),
            expires_at: expiresAt.toISOString(),
          })
          .select("id, nonce, expires_at")
          .single();

        if (error) return res.status(500).json({ error: "challenge_failed", message: error.message });

        // The nonce is returned to the challenger, who passes it to the
        // responder out-of-band. It is NOT a bearer token for any value.
        return res.status(201).json({ ok: true, handshakeId: data.id, nonce, expiresAt: data.expires_at });
      } catch (e) {
        return sendValidationError(res, e);
      }
    },
  );

  // ---------- POST /api/v3/cocircle/respond ----------
  // Complete the exchange. This is where co-presence is actually established.
  router.post(
    "/cocircle/respond",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3rs:${req.user?.address || req.ip}`, limit: 60, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const body = ensureObjectBody(req, res);
      if (!body) return;

      try {
        const handshakeId = ensureNumber(body.handshakeId, { field: "handshakeId", required: true, integer: true });
        const nonce = ensureString(body.nonce, { field: "nonce", required: true, maxLength: 64 });
        const lat = ensureNumber(body.lat, { field: "lat", min: -90, max: 90, required: true });
        const lng = ensureNumber(body.lng, { field: "lng", min: -180, max: 180, required: true });
        const accuracyM = ensureNumber(body.accuracyM, { field: "accuracyM", min: 0, max: 100_000, required: false });

        const { data: handshake, error: fetchErr } = await supabaseAdmin
          .from("handshakes")
          .select("*")
          .eq("id", handshakeId)
          .maybeSingle();
        if (fetchErr) return res.status(500).json({ error: "handshake_lookup_failed", message: fetchErr.message });
        if (!handshake) return res.status(404).json({ error: "handshake_not_found" });

        const responder = req.user.address.toLowerCase();

        // Replay guard at the data layer as well as in buildAttestation: a
        // nonce already consumed by any handshake cannot be reused.
        const { data: priorNonces } = await supabaseAdmin
          .from("handshakes")
          .select("nonce, challenger, responder")
          .eq("nonce", nonce)
          .neq("id", handshakeId);

        const verdict = buildAttestation({
          challenger: handshake.challenger,
          responder,
          nonce,
          expectedNonce: handshake.nonce,
          challengerPoint: point(handshake.challenger_lat, handshake.challenger_lng),
          responderPoint: point(lat, lng),
          accuracyM,
          createdAt: handshake.created_at,
          now: new Date(),
          handshakeStatus: handshake.status,
          priorNonces: priorNonces || [],
        });

        if (!verdict.ok) {
          // Rejections are recorded too — an attempt is auditable evidence.
          await supabaseAdmin
            .from("handshakes")
            .update({ status: "rejected", responder, responder_lat: lat, responder_lng: lng, reject_reason: verdict.reason })
            .eq("id", handshakeId);
          return res.status(400).json({ error: "attestation_failed", reason: verdict.reason, detail: verdict.detail });
        }

        const { data: updated, error: updateErr } = await supabaseAdmin
          .from("handshakes")
          .update({
            status: "attested",
            responder,
            responder_lat: lat,
            responder_lng: lng,
            accuracy_m: accuracyM == null ? handshake.accuracy_m : Math.round(accuracyM),
            distance_m: verdict.distanceM,
            attested_at: new Date().toISOString(),
            reject_reason: null,
          })
          .eq("id", handshakeId)
          .select("id, distance_m, attested_at")
          .single();

        if (updateErr) return res.status(500).json({ error: "attest_failed", message: updateErr.message });

        return res.json({
          ok: true,
          handshakeId: updated.id,
          distanceM: verdict.distanceM,
          attestedAt: updated.attested_at,
          radiusM: DEFAULT_RADIUS_M,
        });
      } catch (e) {
        return sendValidationError(res, e);
      }
    },
  );

  // ---------- GET /api/v3/cocircle/nearby ----------
  // "Someone is 200m away and carrying the token." — the affordance that
  // turns a flash moment into a movement reflex.
  router.get(
    "/cocircle/nearby",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3nb:${req.user?.address || req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      try {
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        const regionId = String(req.query.region || "");
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return res.status(400).json({ error: "invalid_coordinates" });
        }
        if (!regionId) return res.status(400).json({ error: "missing_region" });

        // Recent, live handshakes give us live positions without storing a
        // permanent trail of where anyone has been.
        const since = new Date(Date.now() - 30 * 60_000).toISOString();
        const { data: recent, error } = await supabaseAdmin
          .from("handshakes")
          .select("address, challenger, responder, challenger_lat, challenger_lng, responder_lat, responder_lng, attested_at")
          .eq("region_id", regionId)
          .eq("status", "attested")
          .gte("attested_at", since);

        if (error) return res.status(500).json({ error: "nearby_failed", message: error.message });

        const me = req.user.address.toLowerCase();
        const seen = new Map();
        for (const h of recent || []) {
          const addr = h.responder || h.challenger;
          if (!addr || addr.toLowerCase() === me) continue;
          const p = h.responder_lat != null
            ? point(h.responder_lat, h.responder_lng)
            : point(h.challenger_lat, h.challenger_lng);
          if (p.lat == null || p.lng == null) continue;
          seen.set(addr.toLowerCase(), { address: addr.toLowerCase(), ...p });
        }

        const near = nearestPlayers(point(lat, lng), [...seen.values()], { radiusM: NEARBY_RADIUS_M });
        return res.json({ ok: true, nearby: near, radiusM: NEARBY_RADIUS_M });
      } catch (e) {
        return sendValidationError(res, e);
      }
    },
  );

  // ---------- POST /api/v3/cocircle/transfer ----------
  // Move a token. Every transfer is backed by an ATTESTED handshake — the
  // DB enforces this with a NOT NULL FK, so there is no code path that
  // writes a transfer without physical co-presence behind it.
  router.post(
    "/cocircle/transfer",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3tr:${req.user?.address || req.ip}`, limit: 30, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const body = ensureObjectBody(req, res);
      if (!body) return;

      try {
        const tokenId = ensureNumber(body.tokenId, { field: "tokenId", required: true, integer: true });
        const toAddress = ensureString(body.toAddress, { field: "toAddress", required: true, maxLength: 42 });
        const handshakeId = ensureNumber(body.handshakeId, { field: "handshakeId", required: true, integer: true });

        const me = req.user.address.toLowerCase();
        const to = toAddress.toLowerCase();
        if (me === to) return res.status(400).json({ error: "self_transfer" });

        // The handshake must be ATTESTED, must involve me, and must not have
        // already been spent on a transfer (replay of a valid proof).
        const { data: handshake, error: hsErr } = await supabaseAdmin
          .from("handshakes")
          .select("id, status, challenger, responder, distance_m")
          .eq("id", handshakeId)
          .maybeSingle();
        if (hsErr) return res.status(500).json({ error: "handshake_lookup_failed", message: hsErr.message });
        if (!handshake) return res.status(404).json({ error: "handshake_not_found" });
        if (handshake.status !== "attested") {
          return res.status(400).json({ error: "handshake_not_attested", status: handshake.status });
        }

        const parties = [String(handshake.challenger || "").toLowerCase(), String(handshake.responder || "").toLowerCase()];
        if (!parties.includes(me) || !parties.includes(to)) {
          return res.status(403).json({ error: "handshake_does_not_bind_both_parties" });
        }

        const { data: spent } = await supabaseAdmin
          .from("token_transfers")
          .select("id")
          .eq("handshake_id", handshakeId)
          .maybeSingle();
        if (spent) return res.status(409).json({ error: "handshake_already_used" });

        const { data: token, error: tokErr } = await supabaseAdmin
          .from("tokens")
          .select("id, region_id, status, holder")
          .eq("id", tokenId)
          .maybeSingle();
        if (tokErr) return res.status(500).json({ error: "token_lookup_failed", message: tokErr.message });
        if (!token) return res.status(404).json({ error: "token_not_found" });
        if (token.status !== "held" || String(token.holder || "").toLowerCase() !== me) {
          return res.status(403).json({ error: "not_the_holder" });
        }

        const { data: transfer, error: trErr } = await supabaseAdmin
          .from("token_transfers")
          .insert({
            token_id: token.id,
            from_address: me,
            to_address: to,
            region_id: token.region_id,
            handshake_id: handshakeId,
            distance_m: handshake.distance_m,
          })
          .select()
          .single();
        if (trErr) return res.status(500).json({ error: "transfer_failed", message: trErr.message });

        const { error: upErr } = await supabaseAdmin
          .from("tokens")
          .update({ holder: to, held_via_handshake_id: handshakeId, taken_at: new Date().toISOString() })
          .eq("id", token.id);
        if (upErr) return res.status(500).json({ error: "token_update_failed", message: upErr.message });

        // Credits mint here — the faucet. Only IRL actions create credits,
        // which is what gives the always-on market something to demand.
        const awards = [
          buildAward({ address: to, regionId: token.region_id, reason: "transfer_delivered", ref: String(token.id) }),
          buildAward({ address: me, regionId: token.region_id, reason: "transfer_intercepted", ref: String(token.id) }),
        ].flat();
        if (awards.length) {
          await supabaseAdmin.from("credit_ledger").insert(awards);
        }

        return res.status(201).json({ ok: true, transfer, awarded: awards.length });
      } catch (e) {
        return sendValidationError(res, e);
      }
    },
  );

  return router;
}