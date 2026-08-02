import { Router } from "express";
import {
  ensureObjectBody, ensureString, ensureNumber, ensureIsoDate, ensureEnum, sendValidationError,
} from "../lib/validators.js";
import { ariaSuggestNextRound, ariaBroadcastPayoutTx } from "../lib/ariaAgent.js";
import { isValidAgentTier } from "../lib/agents.js";

/**
 * Admin routes — round CRUD, agent registration, close-day, payout retry.
 */
export default function adminRoutes(deps) {
  const {
    requireAuth,
    requireAdmin,
    supabaseAdmin,
    log,
    loadRound,
    getAgentSeatState,
    getUserRecord,
    makeReferralCode,
    CHECKIN_RADIUS_M,
    DAILY_SURVIVAL_CAP,
    COHORT_CONFIG,
    AGENTS_ENABLED,
    SILENT_VERIFICATION,
    FAKE_PCT_TO_FLAG,
    notifyDayClosed,
    handleWinnerPayout,
    clearEndgameCache,
  } = deps;

  const router = Router();

  router.get("/admin/suggest-round", requireAuth, requireAdmin, async (req, res) => {
    try {
      const day = Number(req.query.day) || 1;
      let previousThemes = [];
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from("rounds")
          .select("name")
          .order("day", { ascending: false })
          .limit(5);
        previousThemes = (data || []).map((r) => r.name).filter(Boolean);
      }
      const suggestion = await ariaSuggestNextRound({ day, previousThemes });
      return res.json({ ok: true, suggestion });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  router.post("/admin/round", requireAuth, requireAdmin, async (req, res) => {
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

  router.get("/admin/rounds", requireAuth, requireAdmin, async (req, res) => {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    try {
      const { data, error } = await supabaseAdmin.from("rounds").select("*").order("day", { ascending: true });
      if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
      return res.json({ ok: true, rounds: data || [] });
    } catch (e) {
      return res.status(400).json({ error: "rounds_failed", message: e instanceof Error ? e.message : "unknown_error" });
    }
  });

  router.post("/admin/agents", requireAuth, requireAdmin, async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

    try {
      const address = ensureString(body.address, {
        field: "address",
        required: true,
        maxLength: 64,
        pattern: /^0x[a-fA-F0-9]{40}$/,
      }).toLowerCase();
      const username = ensureString(body.username, { field: "username", required: false, maxLength: 32 });
      const tier = ensureString(body.tier, { field: "tier", required: false, maxLength: 16 }) || "premium";
      const agentProvider = ensureString(body.agentProvider, { field: "agentProvider", required: false, maxLength: 64 });
      const entryFeeUsd = body.entryFeeUsd != null
        ? ensureNumber(body.entryFeeUsd, { field: "entryFeeUsd", min: 0, max: 10_000 })
        : null;

      if (!isValidAgentTier(tier)) {
        return res.status(400).json({ error: "invalid_agent_tier", allowed: ["basic", "standard", "premium"] });
      }

      const seats = await getAgentSeatState({ forPublic: false });
      const existing = await getUserRecord(address);
      if (!existing?.is_agent && seats.agentsFull) {
        return res.status(409).json({ error: "agent_slots_full", maxSlots: seats.maxSlots, agentCount: seats.agentCount });
      }

      const refCode = existing?.referral_code || makeReferralCode(`agent${address.slice(2, 6)}`);
      const nowIso = new Date().toISOString();
      const { error } = await supabaseAdmin.from("users").upsert(
        {
          address,
          paid: true,
          is_agent: true,
          agent_tier: tier,
          agent_provider: agentProvider || null,
          agent_entry_fee_usd: entryFeeUsd,
          verified_human: false,
          entry_kind: "agent",
          entry_token: entryFeeUsd != null ? "x402" : null,
          reserved_at: existing?.reserved_at || nowIso,
          last_seen_at: nowIso,
          referral_code: refCode,
          username: username || existing?.username || null,
          cohort: COHORT_CONFIG.cohort,
          platform: "agent",
        },
        { onConflict: "address" },
      );
      if (error) return res.status(400).json({ error: "agent_upsert_failed", message: error.message });

      // Ensure cohort participation row exists for the agent.
      await supabaseAdmin.rpc("ensure_cohort_participation", {
        p_address: address,
        p_cohort: COHORT_CONFIG.cohort,
      }).catch(() => {});

      if (entryFeeUsd != null && entryFeeUsd > 0) {
        await supabaseAdmin.from("agent_entries").insert({
          agent_address: address,
          cohort: COHORT_CONFIG.cohort,
          amount_usd: entryFeeUsd,
          tier,
          payment_intent_id: body.paymentIntentId || null,
        });
      }

      const nextSeats = await getAgentSeatState({ forPublic: false });
      log("admin_agent_registered", { address, tier, entryFeeUsd });
      return res.json({ ok: true, address, tier, agents: nextSeats });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  router.get("/admin/agents", requireAuth, requireAdmin, async (req, res) => {
    try {
      if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
      const seats = await getAgentSeatState({ forPublic: false });
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("address, username, agent_tier, agent_provider, agent_entry_fee_usd, reserved_at, eliminated, eliminated_at_day")
        .eq("is_agent", true)
        .order("reserved_at", { ascending: false })
        .limit(200);
      if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
      return res.json({
        ok: true,
        enabled: AGENTS_ENABLED,
        silentVerification: SILENT_VERIFICATION,
        seats,
        agents: data || [],
      });
    } catch (e) {
      res.status(400).json({ error: "admin_agents_failed", message: e instanceof Error ? e.message : "unknown_error" });
    }
  });

  router.get("/admin/flags", requireAuth, requireAdmin, async (req, res) => {
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

  router.post("/admin/close-day", requireAuth, requireAdmin, async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;

    try {
      const day = ensureNumber(body.day, { field: "day", required: true, integer: true, min: 1 });
      const round = await loadRound(day);
      if (!round) return res.status(404).json({ error: "round_not_found" });
      const cap = round.survival_cap ?? DAILY_SURVIVAL_CAP;

      if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

      const { data, error } = await supabaseAdmin.rpc("close_day", {
        p_day: day,
        p_cap: cap,
        p_flag_pct: FAKE_PCT_TO_FLAG,
      });
      if (error) return res.status(400).json({ error: "close_day_failed", message: error.message });

      clearEndgameCache?.();
      notifyDayClosed(data).catch((e) => log("push_error", { where: "admin_close_day", error: String(e) }));

      if (data?.winner) {
        handleWinnerPayout(data.day, data.winner).catch((e) => log("admin_payout_error", { error: String(e) }));
      } else if (data?.remaining === 0) {
        try {
          const { data: tiebreaker } = await supabaseAdmin.rpc("resolve_no_survivors", { p_day: day });
          if (tiebreaker?.winner) {
            log("admin_no_survivors_resolved", { day, winner: tiebreaker.winner });
            await handleWinnerPayout(day, tiebreaker.winner).catch((e) => log("admin_payout_error", { error: String(e) }));
          }
        } catch (e) {
          log("admin_no_survivors_error", { day, error: String(e) });
        }
      }

      return res.json({ ok: true, day, ...data });
    } catch (error) {
      sendValidationError(res, error);
    }
  });

  router.post("/admin/retry-payout", requireAuth, requireAdmin, async (req, res) => {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    // Cohort 1 pilot: settlement is manual (two in-kind transfers after the
    // appeal window). Automatic hot-EOA payout — including retries — only
    // runs when explicitly enabled.
    if (process.env.AUTO_PAYOUT_ENABLED !== "true") {
      return res.status(403).json({
        error: "auto_payout_disabled",
        message: "Cohort 1 settles manually — see docs/COHORT1_PILOT.md. Re-enable only with escrow-grade settlement.",
      });
    }
    const body = ensureObjectBody(req, res);
    if (!body) return;
    try {
      const winnerAddress = ensureString(body.winnerAddress, { field: "winnerAddress", required: true, maxLength: 64, pattern: /^0x[a-fA-F0-9]{40}$/ });

      // The recorded payout row is the source of truth: an admin retry may
      // NOT mint an arbitrary winner, token, or amount.
      const { data: failedRow } = await supabaseAdmin
        .from("payouts")
        .select("id,winner_address,amount_usd,token")
        .eq("winner_address", winnerAddress)
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!failedRow) return res.status(404).json({ error: "no_failed_payout" });
      const amountUsd = Number(failedRow.amount_usd) || 0;
      const token = failedRow.token || "cUSD";

      const result = await ariaBroadcastPayoutTx({ winnerAddress, amountUsd, token });
      if (result.ok) {
        await supabaseAdmin.from("payouts")
          .update({ status: "submitted", tx_hash: result.txHash, explorer_url: result.explorerUrl, error: null })
          .eq("id", failedRow.id);
        log("admin_retry_payout_success", { winnerAddress, txHash: result.txHash, payoutId: failedRow.id });
        return res.json({ ok: true, ...result });
      }
      return res.json({ ok: false, error: result.reason });
    } catch (e) {
      return res.status(400).json({ error: "retry_payout_failed", message: e instanceof Error ? e.message : "unknown_error" });
    }
  });

  router.post("/admin/trigger-rounds", requireAuth, requireAdmin, async (req, res) => {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    try {
      const { data, error } = await supabaseAdmin.rpc("advance_rounds");
      if (error) return res.status(500).json({ error: "rpc_failed", message: error.message });
      return res.json({ ok: true, result: data });
    } catch (e) {
      return res.status(500).json({ error: "trigger_failed", message: e instanceof Error ? e.message : "unknown_error" });
    }
  });

  return router;
}
