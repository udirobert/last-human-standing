/**
 * Market routes — docs/TOKEN_ROUNDS.md §3.1, §6.
 *
 * The market is the DEMAND side of the IRL economy. Its whole job is to make
 * IRL-minted scarce goods worth something to people who never leave their
 * desks — which is the only reason the always-on layer earns its existence.
 *
 * Credits are closed and non-withdrawable: escrow moves credits between
 * players, it never mints cash value.
 *
 * Gated on GAME_V3_ENABLED; mounted at /api/v3.
 */
import { Router } from "express";
import crypto from "crypto";
import { rateLimit } from "../rateLimit.js";
import { ensureObjectBody, ensureNumber, ensureString, sendValidationError } from "../lib/validators.js";
import { validateListing, fillListing, DEFAULT_LISTING_TTL_MS } from "../lib/market.js";
import { meshyConfigured, createTextToImageTask, getTextToImageTask, downloadMeshyImage } from "../lib/meshy.js";

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "checkins";

// Catalog plates — one generated museum-specimen illustration per listing,
// cached forever by content hash. Shared art (no faces), stored outside any
// user's prefix; signed URLs are minted here, not via /api/media-url.
const marketArtJobs = new Map(); // meshyTaskId -> { path, label, createdAt }
const MARKET_ART_JOB_TTL_MS = 15 * 60_000;
const MARKET_ART_MAX_PENDING = 3;
const MARKET_ART_STYLE =
  "Museum catalog plate for a mythic survival game's artifact auction. " +
  "Bold gouache storybook illustration, deep navy background, warm amber accent light, " +
  "engraved specimen-label aesthetic, dramatic rim lighting, subtle film grain, " +
  "centered single object, no text, no letters, no watermark";

function marketArtPrompt(label) {
  return `${MARKET_ART_STYLE}. Subject: ${label}.`;
}

export default function marketRoutes({ supabaseAdmin, rateLimitStorage, requireAuth, GAME_V3_ENABLED }) {
  const router = Router();

  async function marketArtSign(path, ttlSeconds = 300) {
    const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).createSignedUrl(path, ttlSeconds);
    return error ? null : data.signedUrl;
  }

  router.use((req, res, next) => {
    if (!GAME_V3_ENABLED) return res.status(404).json({ error: "v3_not_enabled" });
    next();
  });

  async function ledgerFor(regionId, season) {
    const { data } = await supabaseAdmin
      .from("credit_ledger")
      .select("address, amount, reason, ref")
      .eq("region_id", regionId)
      .eq("season", season);
    return data || [];
  }

  // ---------- GET /api/v3/market ----------
  router.get(
    "/market",
    rateLimit({ keyFn: (req) => `v3mk:${req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const regionId = String(req.query.region || "");
      if (!regionId) return res.status(400).json({ error: "missing_region" });

      // Expired listings are hidden rather than shown as dead: the scarcity
      // window is the product, and a wall of stale offers flattens it.
      const { data, error } = await supabaseAdmin
        .from("market_listings")
        .select("id, region_id, seller, item_kind, item_ref, price, status, expires_at, buyer, created_at")
        .eq("region_id", regionId)
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .order("price", { ascending: true })
        .limit(100);

      if (error) return res.status(500).json({ error: "market_failed", message: error.message });
      return res.json({ ok: true, listings: data || [] });
    },
  );

  // ---------- GET /api/v3/market/balance ----------
  router.get(
    "/market/balance",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3mb:${req.user?.address || req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const regionId = String(req.query.region || "");
      if (!regionId) return res.status(400).json({ error: "missing_region" });
      const season = Number(req.query.season || 1);
      if (!Number.isInteger(season) || season < 1) return res.status(400).json({ error: "invalid_season" });

      const entries = await ledgerFor(regionId, season);
      const mine = entries.filter((e) => e.address === req.user.address.toLowerCase());
      const minted = mine.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
      const spent = mine.filter((e) => e.amount < 0).reduce((sum, e) => sum + Math.abs(e.amount), 0);

      return res.json({ ok: true, balance: minted - spent, minted, spent });
    },
  );

  // ---------- POST /api/v3/market/listings ----------
  router.post(
    "/market/listings",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3mkl:${req.user?.address || req.ip}`, limit: 60, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const body = ensureObjectBody(req, res);
      if (!body) return;

      try {
        const regionId = ensureString(body.regionId, { field: "regionId", required: true, maxLength: 32 });
        const itemKind = ensureString(body.itemKind, { field: "itemKind", required: true, maxLength: 40 });
        const itemRef = ensureString(body.itemRef, { field: "itemRef", required: false, maxLength: 120 });
        const price = ensureNumber(body.price, { field: "price", min: 1, max: 1_000_000, required: true, integer: true });
        const season = Number(body.season || 1);
        if (!Number.isInteger(season) || season < 1) return res.status(400).json({ error: "invalid_season" });

        const seller = req.user.address.toLowerCase();
        const entries = await ledgerFor(regionId, season);

        const verdict = validateListing({
          seller,
          price,
          itemKind,
          regionId,
          now: Date.now(),
          ttlMs: DEFAULT_LISTING_TTL_MS,
          ledger: entries,
        });
        if (!verdict.ok) return res.status(400).json({ error: "invalid_listing", reason: verdict.reason });

        const { data, error } = await supabaseAdmin
          .from("market_listings")
          .insert({
            region_id: regionId,
            seller,
            item_kind: itemKind,
            item_ref: itemRef || null,
            price,
            status: "open",
            expires_at: verdict.expiresAt.toISOString(),
          })
          .select()
          .single();

        if (error) return res.status(500).json({ error: "create_listing_failed", message: error.message });
        return res.status(201).json({ ok: true, listing: data });
      } catch (e) {
        return sendValidationError(res, e);
      }
    },
  );

  // ---------- POST /api/v3/market/listings/:id/fill ----------
  router.post(
    "/market/listings/:id/fill",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3mkf:${req.user?.address || req.ip}`, limit: 60, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_listing_id" });

      const { data: listing, error: fetchErr } = await supabaseAdmin
        .from("market_listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr) return res.status(500).json({ error: "listing_lookup_failed", message: fetchErr.message });
      if (!listing) return res.status(404).json({ error: "listing_not_found" });

      const buyer = req.user.address.toLowerCase();
      const entries = await ledgerFor(listing.region_id, 1);

      const verdict = fillListing({ listing, buyer, ledger: entries, now: Date.now() });
      if (!verdict.ok) return res.status(400).json({ error: "fill_failed", reason: verdict.reason });

      // Mark filled FIRST. The unique-ish guard is the status flip: a second
      // concurrent fill reads status='open' but its own status-conditional
      // update will match zero rows, so credits cannot be double-moved.
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from("market_listings")
        .update({ status: "filled", buyer, filled_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "open")
        .select()
        .maybeSingle();

      if (claimErr) return res.status(500).json({ error: "fill_failed", message: claimErr.message });
      if (!claimed) return res.status(409).json({ error: "listing_already_taken" });

      const { error: ledgerErr } = await supabaseAdmin.from("credit_ledger").insert(verdict.entries);
      if (ledgerErr) return res.status(500).json({ error: "escrow_failed", message: ledgerErr.message });

      return res.json({ ok: true, listing: claimed });
    },
  );

  // ---------- POST /api/v3/market/listings/:id/cancel ----------
  router.post(
    "/market/listings/:id/cancel",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3mkc:${req.user?.address || req.ip}`, limit: 60, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_listing_id" });

      const { data: cancelled, error } = await supabaseAdmin
        .from("market_listings")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("status", "open")
        .eq("seller", req.user.address.toLowerCase())
        .select()
        .maybeSingle();

      if (error) return res.status(500).json({ error: "cancel_failed", message: error.message });
      if (!cancelled) return res.status(404).json({ error: "listing_not_found_or_not_open" });

      return res.json({ ok: true, listing: cancelled });
    },
  );

  // ---------- POST /api/v3/market/art ----------
  // Generate (or fetch cached) catalog-plate art for a listing's item.
  router.post(
    "/market/art",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3mka:${req.user?.address || req.ip}`, limit: 20, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      if (!meshyConfigured()) return res.status(501).json({ error: "meshy_not_configured" });

      const body = ensureObjectBody(req, res);
      if (!body) return;

      try {
        const itemKind = ensureString(body.itemKind, { field: "itemKind", required: true, maxLength: 40 });
        const itemRef = ensureString(body.itemRef, { field: "itemRef", required: false, maxLength: 120 }) || "";
        const label = `${itemKind}${itemRef ? ` — ${itemRef}` : ""}`.slice(0, 140);

        const hash = crypto.createHash("sha256").update(label.toLowerCase()).digest("hex").slice(0, 32);
        const artPath = `_market/${hash}.png`;

        const cached = await marketArtSign(artPath, 60);
        if (cached) return res.json({ ok: true, cached: true, url: cached });

        const now = Date.now();
        for (const [id, job] of marketArtJobs) {
          if (now - job.createdAt > MARKET_ART_JOB_TTL_MS) marketArtJobs.delete(id);
        }
        const pending = [...marketArtJobs.values()].filter(
          (j) => j.address === req.user.address.toLowerCase(),
        ).length;
        if (pending >= MARKET_ART_MAX_PENDING) {
          return res.status(429).json({ error: "too_many_pending" });
        }

        const taskId = await createTextToImageTask(marketArtPrompt(label));
        marketArtJobs.set(taskId, { address: req.user.address.toLowerCase(), path: artPath, label, createdAt: now });
        return res.json({ ok: true, taskId, status: "processing" });
      } catch (error) {
        if (error?.status === 402) return res.status(402).json({ error: "meshy_credits" });
        console.warn("market-art create failed:", error?.message);
        return res.status(502).json({ error: "meshy_failed" });
      }
    },
  );

  // ---------- GET /api/v3/market/art/:taskId ----------
  router.get(
    "/market/art/:taskId",
    requireAuth,
    async (req, res) => {
      if (!meshyConfigured()) return res.status(501).json({ error: "meshy_not_configured" });

      const job = marketArtJobs.get(req.params.taskId);
      if (!job || job.address !== req.user.address.toLowerCase()) {
        return res.status(404).json({ error: "job_not_found" });
      }

      try {
        const { status, imageUrl } = await getTextToImageTask(req.params.taskId);

        if (status === "SUCCEEDED" && imageUrl) {
          const buf = await downloadMeshyImage(imageUrl);
          const { error: upErr } = await supabaseAdmin.storage
            .from(SUPABASE_BUCKET)
            .upload(job.path, buf, { contentType: "image/png", upsert: true });
          if (upErr) throw upErr;
          marketArtJobs.delete(req.params.taskId);
          const url = await marketArtSign(job.path, 60 * 5);
          return res.json({ ok: true, status: "done", url });
        }

        if (["FAILED", "EXPIRED", "CANCELLED", "CANCELED"].includes(status)) {
          marketArtJobs.delete(req.params.taskId);
          return res.json({ ok: false, status: "failed" });
        }

        return res.json({ ok: true, status: "processing" });
      } catch (error) {
        console.warn("market-art poll failed:", error?.message);
        return res.status(502).json({ error: "meshy_failed" });
      }
    },
  );

  return router;
}