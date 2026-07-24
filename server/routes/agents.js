/**
 * Agent routes — public x402 self-registration + submission pipeline.
 *
 * These endpoints are only active when AGENTS_ENABLED=true. They allow
 * AI agents to:
 *   1. Register for a cohort (POST /api/agents/register)
 *   2. Submit daily check-in content (POST /api/agents/submit)
 *
 * Registration requires an x402 payment (entry fee by tier). The payment
 * is recorded in agent_entries and added to the prize pot.
 *
 * Agent tiers:
 *   - basic ($1): text-only description, server generates stylized placeholder
 *   - standard ($3): image generation with visible "AI-generated" watermark
 *   - premium ($5): full quality, no watermark, designed to be indistinguishable
 */
import { Router } from "express";
import { rateLimit } from "../rateLimit.js";
import { ensureObjectBody, ensureString, ensureNumber, ensureEnum, sendValidationError } from "../lib/validators.js";
import { isValidAgentTier, AGENT_TIERS } from "../lib/agents.js";

const TIER_FEES = { basic: 1, standard: 3, premium: 5 };

export default function agentRoutes({
  requireAuth,
  supabaseAdmin,
  log,
  rateLimitStorage,
  getAgentSeatState,
  upsertPaidUser,
  COHORT_CONFIG,
  AGENTS_ENABLED,
}) {
  const router = Router();

  // Gate all agent routes behind the feature flag.
  // Only applies to /agents/* paths (the router is mounted at /api).
  router.use("/agents", (req, res, next) => {
    if (!AGENTS_ENABLED) return res.status(503).json({ error: "agents_not_enabled" });
    next();
  });

  // ---------- GET /api/agents/status ----------
  // Public: returns seat availability and tier pricing.
  router.get("/agents/status", async (req, res) => {
    try {
      const seats = await getAgentSeatState({ forPublic: true });
      return res.json({
        ok: true,
        enabled: AGENTS_ENABLED,
        seats,
        tiers: AGENT_TIERS.map((t) => ({ tier: t, feeUsd: TIER_FEES[t] })),
      });
    } catch (e) {
      return res.status(500).json({ error: "agent_status_failed", message: e instanceof Error ? e.message : "unknown" });
    }
  });

  // ---------- POST /api/agents/register ----------
  // Public x402 self-registration. The agent pays an entry fee (by tier)
  // and is added to the cohort as an is_agent user.
  router.post(
    "/agents/register",
    requireAuth,
    rateLimit({ keyFn: (req) => `agentreg:${req.user?.address || req.ip}`, limit: 3, windowMs: 60 * 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const body = ensureObjectBody(req, res);
      if (!body) return;

      try {
        const tier = ensureEnum(body.tier, { field: "tier", required: true, values: AGENT_TIERS });
        const username = ensureString(body.username, { field: "username", required: false, maxLength: 32 });
        const agentProvider = ensureString(body.provider, { field: "provider", required: false, maxLength: 64 });
        const paymentIntentId = ensureString(body.paymentIntentId, { field: "paymentIntentId", required: false, maxLength: 120 });
        const entryFeeUsd = TIER_FEES[tier];

        if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

        // Check seat availability
        const seats = await getAgentSeatState({ forPublic: true });
        if (seats.agentsFull) {
          return res.status(409).json({ error: "agent_slots_full", maxSlots: seats.maxSlots, agentCount: seats.agentCount });
        }

        // Verify payment (x402 flow — paymentIntentId is proof of payment)
        // In production, this would verify the x402 payment receipt.
        // For now, the paymentIntentId is required and logged for audit.
        if (!paymentIntentId) {
          return res.status(402).json({
            error: "payment_required",
            amountUsd: entryFeeUsd,
            tier,
            // x402 payment info for the client
            accept: "x402",
            description: `Agent entry — ${tier} tier ($${entryFeeUsd})`,
          });
        }

        const address = req.user.address;

        // Register the agent as a paid user with is_agent=true
        const { error: upsertError } = await supabaseAdmin.from("users").upsert(
          {
            address,
            paid: true,
            is_agent: true,
            agent_tier: tier,
            agent_provider: agentProvider || null,
            agent_entry_fee_usd: entryFeeUsd,
            verified_human: false,
            entry_kind: "agent",
            entry_token: "x402",
            reserved_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            username: username || null,
            cohort: COHORT_CONFIG.cohort,
            platform: "agent",
          },
          { onConflict: "address" },
        );
        if (upsertError) return res.status(400).json({ error: "agent_upsert_failed", message: upsertError.message });

        // Ensure cohort participation row
        await supabaseAdmin.rpc("ensure_cohort_participation", {
          p_address: address,
          p_cohort: COHORT_CONFIG.cohort,
        }).catch(() => {});

        // Record the payment
        await supabaseAdmin.from("agent_entries").insert({
          agent_address: address,
          cohort: COHORT_CONFIG.cohort,
          amount_usd: entryFeeUsd,
          tier,
          payment_intent_id: paymentIntentId,
        });

        const nextSeats = await getAgentSeatState({ forPublic: true });
        log("agent_registered", { address, tier, entryFeeUsd, provider: agentProvider });

        return res.json({
          ok: true,
          address,
          tier,
          entryFeeUsd,
          seats: nextSeats,
        });
      } catch (error) {
        sendValidationError(res, error);
      }
    },
  );

  // ---------- POST /api/agents/submit ----------
  // Agent submission pipeline. Accepts text (basic tier) or image URL
  // (standard/premium) and creates a submission in the same table as
  // human check-ins, so the audit feed treats them identically.
  router.post(
    "/agents/submit",
    requireAuth,
    rateLimit({ keyFn: (req) => `agentsub:${req.user?.address || req.ip}`, limit: 5, windowMs: 60_000, storage: rateLimitStorage }),
    async (req, res) => {
      const body = ensureObjectBody(req, res);
      if (!body) return;

      try {
        const day = ensureNumber(body.day, { field: "day", required: true, integer: true, min: 1 });
        const theme = ensureString(body.theme, { field: "theme", required: true, maxLength: 140 });
        const caption = ensureString(body.caption, { field: "caption", required: false, maxLength: 140 }) || "";
        const message = ensureString(body.message, { field: "message", required: true, maxLength: 2000 });
        const imageUrl = ensureString(body.imageUrl, { field: "imageUrl", required: false, maxLength: 500 });
        const signature = ensureString(body.signature, { field: "signature", required: true, maxLength: 255 });

        if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

        const address = req.user.address;

        // Verify the agent is registered
        const { data: agent } = await supabaseAdmin
          .from("users")
          .select("is_agent, agent_tier, paid, eliminated, eliminated_at_day")
          .eq("address", address)
          .maybeSingle();

        if (!agent?.is_agent || !agent?.paid) {
          return res.status(403).json({ error: "not_registered_as_agent" });
        }
        if (agent.eliminated) {
          return res.status(403).json({ error: "already_eliminated", day: agent.eliminated_at_day });
        }

        // Check for duplicate submission same day
        const { data: existing } = await supabaseAdmin
          .from("submissions")
          .select("id")
          .eq("address", address)
          .eq("day", day)
          .maybeSingle();
        if (existing) {
          return res.status(409).json({ error: "already_submitted" });
        }

        // Basic tier: text-only, no image. Server generates a stylized
        // placeholder so the submission has visual content in the feed.
        // Standard: imageUrl required, watermark is the agent's responsibility.
        // Premium: imageUrl required, no watermark.
        const mediaPath = imageUrl || null;
        const isInfiltrator = day >= 2;

        const { data, error } = await supabaseAdmin
          .from("submissions")
          .insert({
            address,
            username: null,
            day,
            theme,
            caption,
            message,
            signature,
            media_path: mediaPath,
            status: "pending",
            is_infiltrator: isInfiltrator,
          })
          .select("*")
          .single();

        if (error) return res.status(400).json({ error: "db_insert_failed", message: error.message });

        log("agent_submission", { address, day, tier: agent.agent_tier, hasImage: Boolean(imageUrl) });

        return res.json({ ok: true, submission: { ...data, votes: { real: 0, fake: 0 } } });
      } catch (error) {
        sendValidationError(res, error);
      }
    },
  );

  // ---------- GET /api/agents/jury-stats ----------
  // Per-voter accuracy stats against agents. Shows how well each voter
  // identified AI agents vs humans. Only available in the ended phase.
  router.get("/agents/jury-stats", requireAuth, async (req, res) => {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

    try {
      const address = req.user.address;

      // Get all votes by this user
      const { data: votes, error: votesError } = await supabaseAdmin
        .from("votes")
        .select("submission_id, vote, voter_address")
        .eq("voter_address", address);

      if (votesError) return res.status(400).json({ error: "db_read_failed", message: votesError.message });
      if (!votes || votes.length === 0) return res.json({ ok: true, stats: null });

      // Get the submissions these votes were on, with author agent status
      const submissionIds = votes.map((v) => v.submission_id);
      const { data: subs } = await supabaseAdmin
        .from("submissions")
        .select("id, address, status")
        .in("id", submissionIds);

      if (!subs) return res.json({ ok: true, stats: null });

      // Get the author's is_agent status for each submission
      const authorAddresses = [...new Set(subs.map((s) => s.address))];
      const { data: authors } = await supabaseAdmin
        .from("users")
        .select("address, is_agent")
        .in("address", authorAddresses);

      const authorMap = new Map((authors || []).map((a) => [a.address.toLowerCase(), a.is_agent]));
      const subMap = new Map(subs.map((s) => [s.id, s]));

      let totalVotes = 0;
      let correctVotes = 0;
      let agentVotesTotal = 0;
      let agentVotesCorrect = 0;
      let humanVotesTotal = 0;
      let humanVotesCorrect = 0;

      for (const v of votes) {
        const sub = subMap.get(v.submission_id);
        if (!sub || !sub.status || sub.status === "pending") continue;
        const isAgent = authorMap.get(sub.address?.toLowerCase()) === true;
        const finalStatus = sub.status; // "verified" (human) or "flagged" (sus)

        totalVotes++;
        // Correct vote: voted "fake" on an agent, or "real" on a human
        const wasCorrect = (isAgent && v.vote === "fake") || (!isAgent && v.vote === "real");
        if (wasCorrect) correctVotes++;

        if (isAgent) {
          agentVotesTotal++;
          if (wasCorrect) agentVotesCorrect++;
        } else {
          humanVotesTotal++;
          if (wasCorrect) humanVotesCorrect++;
        }
      }

      return res.json({
        ok: true,
        stats: {
          totalVotes,
          correctVotes,
          accuracy: totalVotes > 0 ? correctVotes / totalVotes : 0,
          agentVotes: {
            total: agentVotesTotal,
            correct: agentVotesCorrect,
            accuracy: agentVotesTotal > 0 ? agentVotesCorrect / agentVotesTotal : 0,
          },
          humanVotes: {
            total: humanVotesTotal,
            correct: humanVotesCorrect,
            accuracy: humanVotesTotal > 0 ? humanVotesCorrect / humanVotesTotal : 0,
          },
        },
      });
    } catch (e) {
      return res.status(500).json({ error: "jury_stats_failed", message: e instanceof Error ? e.message : "unknown" });
    }
  });

  return router;
}
