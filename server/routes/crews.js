/**
 * Crew routes — docs/TOKEN_ROUNDS.md §5.1, §5.2.
 *
 * "Nobody roots for player #4,821." They root for a crew with a name, a local
 * hangout, and a scoreboard rivalry with the crew down the street.
 *
 * Decision (locked): FOUNDER-LED, OPEN JOIN. The operator seeds a few named
 * crews per region so a cold city has identity on day one; anyone can found a
 * crew up to a per-season cap, and anyone can join any open crew.
 *
 * Gated on GAME_V3_ENABLED; mounted at /api/v3.
 */
import { Router } from "express";
import { rateLimit } from "../rateLimit.js";
import { ensureObjectBody, ensureString, sendValidationError } from "../lib/validators.js";

/** Max crews one address may found per region per season. */
export const MAX_FOUNDED_PER_SEASON = Number(process.env.V3_MAX_FOUNDED_PER_SEASON || 3);

/** Crews keep their founding rank: the name you entered is the name you keep. */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export default function crewRoutes({ supabaseAdmin, rateLimitStorage, requireAuth, GAME_V3_ENABLED }) {
  const router = Router();

  router.use((req, res, next) => {
    if (!GAME_V3_ENABLED) return res.status(404).json({ error: "v3_not_enabled" });
    next();
  });

  // ---------- GET /api/v3/crews ----------
  router.get(
    "/crews",
    rateLimit({ keyFn: (req) => `v3cw:${req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const regionId = String(req.query.region || "");
      if (!regionId) return res.status(400).json({ error: "missing_region" });

      const { data: crews, error } = await supabaseAdmin
        .from("crews")
        .select("id, region_id, name, tagline, color, founder, season, open, created_at")
        .eq("region_id", regionId)
        .order("created_at", { ascending: true });

      if (error) return res.status(500).json({ error: "crews_failed", message: error.message });

      // Member counts come from the roster, not a denormalised column, so a
      // join/leave can never leave a stale count on the crew card.
      const ids = (crews || []).map((c) => c.id);
      let counts = new Map();
      if (ids.length) {
        const { data: members } = await supabaseAdmin
          .from("crew_members")
          .select("crew_id")
          .in("crew_id", ids);
        for (const m of members || []) {
          counts.set(m.crew_id, (counts.get(m.crew_id) || 0) + 1);
        }
      }

      return res.json({
        ok: true,
        crews: (crews || []).map((c) => ({ ...c, members: counts.get(c.id) || 0 })),
      });
    },
  );

  // ---------- GET /api/v3/crews/:id ----------
  router.get(
    "/crews/:id",
    rateLimit({ keyFn: (req) => `v3cw1:${req.ip}`, limit: 120, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_crew_id" });

      const { data: crew, error } = await supabaseAdmin
        .from("crews")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) return res.status(500).json({ error: "crew_failed", message: error.message });
      if (!crew) return res.status(404).json({ error: "crew_not_found" });

      const { data: members } = await supabaseAdmin
        .from("crew_members")
        .select("address, role, contribution, joined_at")
        .eq("crew_id", id)
        .order("contribution", { ascending: false })
        .limit(100);

      return res.json({ ok: true, crew, members: members || [] });
    },
  );

  // ---------- POST /api/v3/crews ----------
  router.post(
    "/crews",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3cwf:${req.user?.address || req.ip}`, limit: 5, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const body = ensureObjectBody(req, res);
      if (!body) return;

      try {
        const regionId = ensureString(body.regionId, { field: "regionId", required: true, maxLength: 32 });
        const name = ensureString(body.name, { field: "name", required: true, maxLength: 32 });
        const tagline = ensureString(body.tagline, { field: "tagline", required: false, maxLength: 140 });
        const color = ensureString(body.color, { field: "color", required: false, maxLength: 7 });

        if (color && !HEX_COLOR.test(color)) {
          return res.status(400).json({ error: "invalid_color" });
        }

        const address = req.user.address.toLowerCase();
        const season = Number(body.season || 1);
        if (!Number.isInteger(season) || season < 1) {
          return res.status(400).json({ error: "invalid_season" });
        }

        // Founder cap: founding must stay available without letting one
        // address spam the leaderboard.
        const { data: limitRow } = await supabaseAdmin
          .from("crew_founder_limits")
          .select("founded")
          .eq("region_id", regionId)
          .eq("address", address)
          .eq("season", season)
          .maybeSingle();

        const founded = Number(limitRow?.founded || 0);
        if (founded >= MAX_FOUNDED_PER_SEASON) {
          return res.status(429).json({ error: "found_limit_reached", limit: MAX_FOUNDED_PER_SEASON });
        }

        const { data: crew, error } = await supabaseAdmin
          .from("crews")
          .insert({
            region_id: regionId,
            name,
            tagline: tagline || null,
            color: color || "#7c6a3f",
            founder: address,
            season,
            open: true,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return res.status(409).json({ error: "crew_name_taken" });
          }
          return res.status(500).json({ error: "create_crew_failed", message: error.message });
        }

        await supabaseAdmin
          .from("crew_founder_limits")
          .upsert(
            { region_id: regionId, address, season, founded: founded + 1 },
            { onConflict: "region_id,address,season" },
          );

        // The founder is a member too — founding is not a free pass.
        const { error: memberErr } = await supabaseAdmin
          .from("crew_members")
          .insert({ crew_id: crew.id, address, region_id: regionId, role: "founder" });
        if (memberErr) return res.status(500).json({ error: "founder_roster_failed", message: memberErr.message });

        return res.status(201).json({ ok: true, crew });
      } catch (e) {
        return sendValidationError(res, e);
      }
    },
  );

  // ---------- POST /api/v3/crews/:id/join ----------
  router.post(
    "/crews/:id/join",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3cwj:${req.user?.address || req.ip}`, limit: 30, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_crew_id" });

      const { data: crew, error } = await supabaseAdmin
        .from("crews")
        .select("id, region_id, open")
        .eq("id", id)
        .maybeSingle();
      if (error) return res.status(500).json({ error: "crew_failed", message: error.message });
      if (!crew) return res.status(404).json({ error: "crew_not_found" });
      if (!crew.open) return res.status(403).json({ error: "crew_closed" });

      const address = req.user.address.toLowerCase();

      // One crew per region. A player is a member of exactly one crew in a
      // region; switching means leaving, so the reciprocity loop stays legible.
      const { data: existing } = await supabaseAdmin
        .from("crew_members")
        .select("crew_id")
        .eq("region_id", crew.region_id)
        .eq("address", address)
        .maybeSingle();

      if (existing) {
        if (existing.crew_id === crew.id) return res.json({ ok: true, already: true, crewId: crew.id });
        return res.status(409).json({ error: "already_in_another_crew", crewId: existing.crew_id });
      }

      const { error: joinErr } = await supabaseAdmin
        .from("crew_members")
        .insert({ crew_id: crew.id, address, region_id: crew.region_id, role: "member" });
      if (joinErr) return res.status(500).json({ error: "join_failed", message: joinErr.message });

      return res.status(201).json({ ok: true, crewId: crew.id });
    },
  );

  // ---------- POST /api/v3/crews/:id/leave ----------
  // Leaving is always allowed. Crews must never hold anyone hostage — that
  // would turn a social unit into a trap.
  router.post(
    "/crews/:id/leave",
    requireAuth,
    rateLimit({ keyFn: (req) => `v3cwl:${req.user?.address || req.ip}`, limit: 30, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid_crew_id" });

      const address = req.user.address.toLowerCase();
      const { error } = await supabaseAdmin
        .from("crew_members")
        .delete()
        .eq("crew_id", id)
        .eq("address", address);

      if (error) return res.status(500).json({ error: "leave_failed", message: error.message });
      return res.json({ ok: true });
    },
  );

  return router;
}