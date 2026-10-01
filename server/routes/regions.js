/**
 * Region + sprint routes — docs/TOKEN_ROUNDS.md §3.4.
 *
 * Sprints are REGION-SCOPED. The v2 18h global window was itself the bug: it
 * meant everyone played at the wrong time. Co-presence requires local
 * density, so a player competes with people inside a few hundred km — not
 * with a global clock. Regional windows overlap partially so no region ever
 * plays an empty world alone.
 *
 * Gated on GAME_V3_ENABLED; mounted at /api/v3.
 */
import { Router } from "express";
import { rateLimit } from "../rateLimit.js";

export default function regionRoutes({ supabaseAdmin, rateLimitStorage, requireAuth, GAME_V3_ENABLED }) {
  const router = Router();

  router.use((req, res, next) => {
    if (!GAME_V3_ENABLED) return res.status(404).json({ error: "v3_not_enabled" });
    next();
  });

  // ---------- GET /api/v3/regions ----------
  router.get(
    "/regions",
    rateLimit({ keyFn: (req) => `v3reg:${req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const { data, error } = await supabaseAdmin
        .from("regions")
        .select("id, name, lat, lng, radius_m, opens_local_minute, timezone")
        .eq("active", true)
        .order("name");
      if (error) return res.status(500).json({ error: "regions_failed", message: error.message });
      return res.json({ ok: true, regions: data || [] });
    },
  );

  // ---------- GET /api/v3/sprints/current ----------
  // "Is anything happening for me right now?" — the always-on layer's most
  // important question. Includes telegraphed flash windows so a player can
  // plan BEFORE the sprint opens.
  router.get(
    "/sprints/current",
    rateLimit({ keyFn: (req) => `v3spr:${req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const now = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from("sprints")
        .select(
          "id, region_id, season, opens_at, field_opens_at, closes_at, status, intent_count, " +
          "sprint_flashes(id, label, lat, lng, radius_m, capacity, opens_at, closes_at)",
        )
        .in("status", ["scheduled", "brief", "field"])
        .lte("opens_at", now)
        .order("field_opens_at", { ascending: true })
        .limit(25);

      if (error) return res.status(500).json({ error: "sprints_failed", message: error.message });
      return res.json({ ok: true, sprints: data || [], now });
    },
  );

  // ---------- GET /api/v3/sprints/:id ----------
  router.get(
    "/sprints/:id",
    rateLimit({ keyFn: (req) => `v3spr1:${req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_sprint_id" });

      const { data, error } = await supabaseAdmin
        .from("sprints")
        .select(
          "id, region_id, season, opens_at, field_opens_at, closes_at, status, intent_count, " +
          "sprint_flashes(id, label, lat, lng, radius_m, capacity, opens_at, closes_at)",
        )
        .eq("id", id)
        .maybeSingle();

      if (error) return res.status(500).json({ error: "sprint_failed", message: error.message });
      if (!data) return res.status(404).json({ error: "sprint_not_found" });
      return res.json({ ok: true, sprint: data });
    },
  );

  // ---------- GET /api/v3/standings ----------
  // The board that replaced the cull. Elimination became a status, never an
  // exile — but only if standings are VISIBLE.
  router.get(
    "/standings",
    rateLimit({ keyFn: (req) => `v3st:${req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const regionId = String(req.query.region || "");
      if (!regionId) return res.status(400).json({ error: "missing_region" });

      const season = Number(req.query.season || 1);
      if (!Number.isInteger(season) || season < 1) return res.status(400).json({ error: "invalid_season" });

      const { data, error } = await supabaseAdmin
        .from("season_standings")
        .select("address, crew_id, score, credits, transfers, sprints_played")
        .eq("region_id", regionId)
        .eq("season", season)
        .order("score", { ascending: false })
        .limit(100);

      if (error) return res.status(500).json({ error: "standings_failed", message: error.message });
      return res.json({ ok: true, standings: data || [], region: regionId, season });
    },
  );

  return router;
}