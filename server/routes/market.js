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
import { rateLimit } from "../rateLimit.js";
import { ensureObjectBody, ensureNumber, ensureString, sendValidationError } from "../lib/validators.js";
import { validateListing, fillListing, DEFAULT_LISTING_TTL_MS } from "../lib/market.js";

export default function marketRoutes({ supabaseAdmin, rateLimitStorage, requireAuth, GAME_V3_ENABLED }) {
  const router = Router();

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

  return router;
}