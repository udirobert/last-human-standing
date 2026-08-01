import * as Sentry from "@sentry/node";
import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { verifySiweMessage } from "@worldcoin/minikit-js/siwe";
import { verifyMessage } from "viem";
import { signRequest as idkitSignRequest } from "@worldcoin/idkit-server";
import { getSupabaseAdmin } from "./supabase.js";
import { checkGpsPlausibility, checkTimingAnomaly, checkVoteRing, checkVelocitySpoof, flagSubmission } from "./anticheat.js";
import { rateLimit } from "./rateLimit.js";
import { verifySelfProof } from "./selfVerify.js";
import { fetchCeloPot } from "./lib/celoBalance.js";
import { drawLottery, ALGORITHM_VERSION, freeSlotsFor } from "./lib/lottery.js";
import { debugCeloBalances } from "./lib/celoBalance.js";
import { ariaBroadcastPayoutTx, ariaSuggestNextRound } from "./lib/ariaAgent.js";
import { agentSeatSummary, isValidAgentTier } from "./lib/agents.js";
import { getEliminationReason } from "./lib/eliminationReason.js";
import { checkPhotoDuplicate, normalizePhotoHash } from "./lib/photoDedup.js";
import helmet from "helmet";
import cors from "cors";
import pushRoutes from "./routes/push.js";
import authRoutes from "./routes/auth.js";
import paymentRoutes from "./routes/payment.js";
import profileRoutes from "./routes/profile.js";
import telegramRoutes from "./routes/telegram.js";
import referralRoutes from "./routes/referral.js";
import ariaRoutes from "./routes/aria.js";
import activityRoutes from "./routes/activity.js";
import farcasterRoutes from "./routes/farcaster.js";
import shareRoutes from "./routes/share.js";
import agentRoutes from "./routes/agents.js";
import adminRoutes from "./routes/admin.js";
import {
  ensureObjectBody, ensureString, ensureNumber, ensureBoolean,
  ensureEnum, ensureIsoDate, sendValidationError,
} from "./lib/validators.js";
import { sendPushToAddress, broadcastPush } from "./lib/push.js";
import { startVoteRelayer, enqueueVote } from "./lib/voteRelayer.js";
import { Group } from "@semaphore-protocol/group";
import { createSemaphoreAuditVerifier } from "./lib/semaphoreAudit.js";

// ─── Sentry initialization (before anything else) ─────────────────────
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    enabled: Boolean(SENTRY_DSN),
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sendDefaultPii: false,
  });
}

// ─── Process-level error handlers ───────────────────────────────────────
// Without these, an unhandled promise rejection or uncaught exception
// kills the entire server process silently. We catch, log, and exit
// gracefully so the process manager (PM2/Docker) can restart.
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
  console.error(JSON.stringify({ time: new Date().toISOString(), event: "unhandled_rejection", error: msg }));
  if (SENTRY_DSN) Sentry.captureException(reason);
  // PM2 / Docker will restart — don't leave the process in an unknown state
  process.exitCode = 1;
});

process.on("uncaughtException", (err) => {
  console.error(JSON.stringify({ time: new Date().toISOString(), event: "uncaught_exception", error: err.stack || err.message }));
  if (SENTRY_DSN) Sentry.captureException(err);
  process.exitCode = 1;
});

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
const VOTE_QUORUM = Number(process.env.VOTE_QUORUM || 8);
const VOTE_QUORUM_LOW = Number(process.env.VOTE_QUORUM_LOW || 5);
const VOTE_ACTIVITY_WINDOW_MIN = Number(process.env.VOTE_ACTIVITY_WINDOW_MIN || 60);
const VOTE_ACTIVITY_THRESHOLD = Number(process.env.VOTE_ACTIVITY_THRESHOLD || 30);
const VOTE_DAILY_GOAL = Number(process.env.VOTE_DAILY_GOAL || 5);
const AUDIT_NUDGE_HOURS = Number(process.env.AUDIT_NUDGE_HOURS || 2);
const SEMAPHORE_AUDIT_ENABLED = process.env.SEMAPHORE_AUDIT_ENABLED === "true";
const REAL_PCT_TO_VERIFY = Number(process.env.REAL_PCT_TO_VERIFY || 0.7);
const FAKE_PCT_TO_FLAG = Number(process.env.FAKE_PCT_TO_FLAG || 0.3);
const REQUIRE_WORLD_ID_FOR_VOTING = process.env.REQUIRE_WORLD_ID_FOR_VOTING === "true";

function extractWorldIdNullifier(result) {
  // World ID 3.0 uses nullifier_hash, while IDKit 4.0 returns one proof
  // response per requested credential. Accept both while migration remains
  // enabled, but never persist a successful proof without its nullifier.
  if (typeof result?.nullifier_hash === "string" && result.nullifier_hash) {
    return result.nullifier_hash;
  }
  const responses = Array.isArray(result?.responses) ? result.responses : [];
  const response = responses.find((item) => typeof item?.nullifier === "string" && item.nullifier);
  return response?.nullifier ?? null;
}

// Jury: eliminated players keep playing as the audit jury. Their votes
// count double once their accuracy record is good enough — this is what
// keeps the 49 losers voting (the quorum math needs them).
const JURY_WEIGHT = Number(process.env.JURY_WEIGHT || 2);
const JURY_MIN_ACCURACY = Number(process.env.JURY_MIN_ACCURACY || 0.8);
const JURY_MIN_RESOLVED = Number(process.env.JURY_MIN_RESOLVED || 5);

// Lazy lottery draw gating. The draw is held until EITHER
// the cohort has at least LOTTERY_MIN_CANDIDATES free entries
// OR LOTTERY_MAX_DELAY_HOURS has passed since T-0, whichever
// comes first. This prevents the "empty launch draw" failure
// mode where the lottery runs on zero entrants because no one
// was signed up at the exact T-0 timestamp.
const LOTTERY_MIN_CANDIDATES = Number(process.env.LOTTERY_MIN_CANDIDATES || 10);
const LOTTERY_MAX_DELAY_HOURS = Number(process.env.LOTTERY_MAX_DELAY_HOURS || 6);

const GAME_LAUNCH_AT = process.env.GAME_LAUNCH_AT || null;
const COHORT_2_LAUNCH_AT = process.env.COHORT_2_LAUNCH_AT || null;
const COHORT_SIZE = Number(process.env.COHORT_SIZE || 50);
const DAILY_SURVIVAL_CAP = Number(process.env.DAILY_SURVIVAL_CAP || 40);
// Competing AI agents (Turing-test arena). Off by default — flip when ready.
const AGENTS_ENABLED = process.env.AGENTS_ENABLED === "true";
const MAX_AGENT_RATIO = Number(process.env.MAX_AGENT_RATIO || 0.25);
const MIN_AGENT_COUNT = Number(process.env.MIN_AGENT_COUNT || 5);
// Hide World ID / Self badges in gameplay UI; still verify in the background.
const SILENT_VERIFICATION = process.env.SILENT_VERIFICATION === "true";

// Cap decay schedule: Day 1: 40, Day 2: 20, Day 3: 8, Day 4: 3, Day 5+: 1.
// Mirrors the SQL function survival_cap_for_day() — used when the round
// row doesn't have an explicit override (admin can set a custom cap
// per-round and it will be respected).
function survivalCapForDay(day) {
  if (day <= 1) return 40;
  if (day === 2) return 20;
  if (day === 3) return 8;
  if (day === 4) return 3;
  return 1;
}
const CHECKIN_RADIUS_M = Number(process.env.CHECKIN_RADIUS_M || 100);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || null;

let balanceCache = { value: 0, fetchedAt: 0 };
let celoBalanceCache = { value: null, fetchedAt: 0 };

// Cohort composition. Half paid (guaranteed) + half free (lottery).
// Override per-cohort later via the lottery_results table.
const COHORT_CONFIG = {
  cohort: 1,
  size: COHORT_SIZE,
  paidSlots: Math.ceil(COHORT_SIZE / 2),
  freeSlots: Math.floor(COHORT_SIZE / 2),
};

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

    // Notify subscribing users when rounds open — personalized per player
    for (const r of result.opened ?? []) {
      log("round_auto_opened", { day: r.day });
      const themeName = r.name || `Day ${r.day}`;
      const themePrompt = r.prompt || "Find your spot and snap your proof.";

      // Personalized push: survivors get "you're still alive" + theme,
      // eliminated players get "vote in the feed" nudge, new users get generic.
      try {
        const { data: allUsers } = await supabaseAdmin
          .from("users")
          .select("address,paid,eliminated,eliminated_at_day")
          .eq("paid", true);

        for (const u of allUsers || []) {
          if (u.eliminated) {
            // Jury member — nudge to vote
            sendPushToAddress(supabaseAdmin, u.address, {
              title: `⚖️ Day ${r.day} is live`,
              body: `${themeName}: ${themePrompt} You're the jury — audit submissions in the feed.`,
              data: { type: "round_opened_jury", day: r.day },
            }).catch(() => {});
          } else {
            // Survivor — "you're still alive"
            sendPushToAddress(supabaseAdmin, u.address, {
              title: `☀️ Day ${r.day}: You're still in`,
              body: `${themeName}: ${themePrompt} Check in before the cap shrinks.`,
              data: { type: "round_opened_alive", day: r.day },
            }).catch(() => {});
          }
        }
        // Also notify non-paid users (lottery/waitlist) with the generic broadcast
        broadcastPush(supabaseAdmin, {
          title: "New round open!",
          body: `Day ${r.day} check-in is now live. ${themeName}.`,
          data: { type: "round_opened", day: r.day },
        }).catch((e) => log("push_error", { where: "round_opened", error: String(e) }));
      } catch (e) {
        // Fallback to broadcast if personalized fails
        broadcastPush(supabaseAdmin, {
          title: "New round open!",
          body: `Day ${r.day} check-in is now live. Find your spot.`,
          data: { type: "round_opened", day: r.day },
        }).catch(() => {});
      }

      // Seed chat with a daily theme prompt so the lobby isn't empty.
      // Uses the round's prompt if available, falls back to a generic icebreaker.
      try {
        const themePrompt = r.prompt || `Day ${r.day} is live — where are you checking in?`;
        const themeName = r.name || `Day ${r.day}`;
        await supabaseAdmin.from("chat_messages").insert({
          address: "0x0000000000000000000000000000000000000000",
          username: "LHS_Bot",
          message: `📍 ${themeName}: ${themePrompt}`,
        });
      } catch (e) {
        log("chat_seed_error", { day: r.day, error: String(e) });
      }
    }

    // Day-close ceremony: survivors, DQ'd, eliminated, verdict, winner.
    if ((result.closed ?? []).length > 0) {
      endgameCache = { value: null, fetchedAt: 0 };
    }
    for (const r of result.closed ?? []) {
      log("round_auto_closed", {
        day: r.day, survivors: r.survivors, eliminated: r.eliminated,
        flagged: r.flagged ?? 0, dq: (r.dq || []).length, promoted: (r.promoted || []).length,
        remaining: r.remaining ?? null, winner: r.winner || null,
        streak_bonuses: r.streak_bonuses ?? 0,
      });
      notifyDayClosed(r).catch((e) => log("push_error", { where: "round_closed", error: String(e) }));

      // Wildcard revival: on Day 4, the jury votes one eliminated player
      // back into the game. Triggered automatically after close_day.
      if (r.day === 4 && supabaseAdmin && !r.winner) {
        try {
          const { data: reviveResult, error: reviveError } = await supabaseAdmin.rpc("revive_player", { p_day: r.day });
          if (reviveError) {
            log("revive_error", { day: r.day, error: reviveError.message });
          } else if (reviveResult?.revived) {
            log("revive_success", { day: r.day, revived: reviveResult.revived, votes: reviveResult.votes });
            broadcastPush(supabaseAdmin, {
              title: "Wildcard revival!",
              body: "The jury has spoken — one eliminated player is back in the game.",
              data: { type: "revival", day: r.day, revived: reviveResult.revived },
            }).catch((e) => log("push_error", { where: "revival", error: String(e) }));
          }
        } catch (e) {
          log("revive_error", { day: r.day, error: String(e) });
        }
      }

      // End-game: handle winner detection and automatic payout.
      // close_day sets r.winner when remaining_active = 1.
      // If remaining_active = 0 (everyone eliminated), resolve via tiebreaker.
      if (supabaseAdmin) {
        const remaining = r.remaining ?? null;
        let winnerAddr = r.winner || null;

        // Edge case: no survivors — pick the best eliminated player
        if (remaining === 0 && !winnerAddr) {
          try {
            const { data: tiebreaker, error: tbError } = await supabaseAdmin.rpc("resolve_no_survivors", { p_day: r.day });
            if (tbError) {
              log("no_survivors_error", { day: r.day, error: tbError.message });
            } else if (tiebreaker?.winner) {
              winnerAddr = tiebreaker.winner;
              log("no_survivors_resolved", { day: r.day, winner: winnerAddr, reason: tiebreaker.reason });
              r.winner = winnerAddr;
              r.remaining = 1;
              notifyDayClosed(r).catch((e) => log("push_error", { where: "no_survivors", error: String(e) }));
            }
          } catch (e) {
            log("no_survivors_error", { day: r.day, error: String(e) });
          }
        }

        // Winner detected — record and attempt automatic payout
        if (winnerAddr) {
          handleWinnerPayout(r.day, winnerAddr).catch((e) => log("winner_payout_error", { day: r.day, error: String(e) }));
        }
      }
    }

    for (const r of result.errors ?? []) {
      log("round_scheduler_error", { day: r.day, error: r.error });
    }
  } catch (e) {
    log("round_scheduler_error", { source: "catch", error: e instanceof Error ? e.message : "unknown" });
  }
}

// The verdict ceremony — the second dramatic beat of every day. Called by
// the scheduler and the admin close-day endpoint with close_day()'s result.
async function notifyDayClosed(r) {
  if (!supabaseAdmin) return;
  const day = r.day;
  const dq = new Set((r.dq || []).map((a) => String(a).toLowerCase()));
  const promoted = new Set((r.promoted || []).map((a) => String(a).toLowerCase()));

  // Survivors get told they made it — the beat that was missing entirely.
  const { data: survivorRows } = await supabaseAdmin
    .from("checkins")
    .select("address")
    .eq("day", day)
    .eq("survived", true);
  for (const row of survivorRows || []) {
    const body = promoted.has(row.address.toLowerCase())
      ? `The audit saved you — a flagged player was disqualified and you inherited their slot. ${r.remaining ?? "?"} humans left.`
      : `You made the cut. ${r.remaining ?? "?"} humans left — the next theme drops soon.`;
    sendPushToAddress(supabaseAdmin, row.address, {
      title: `You survived Day ${day} ✅`,
      body,
      data: { type: "survived", day },
    }).catch(() => {});
  }

  // Eliminated (including DQ'd) get the jury hook, not just a shrug.
  const { data: eliminatedRows } = await supabaseAdmin
    .from("users")
    .select("address")
    .eq("eliminated_at_day", day);
  const survivalCap = r.survivalCap ?? r.cap ?? null;
  for (const u of eliminatedRows || []) {
    const wasDq = dq.has(u.address.toLowerCase());
    // Near-miss detection: was their rank within 3 of the cap?
    let nearMissBody = "";
    if (!wasDq && survivalCap != null) {
      const { data: ci } = await supabaseAdmin
        .from("checkins")
        .select("rank")
        .eq("day", day)
        .eq("address", u.address)
        .maybeSingle();
      const rank = Number(ci?.rank) || 0;
      if (rank > survivalCap && rank <= survivalCap + 3) {
        const spotsAway = rank - survivalCap;
        nearMissBody = ` So close — ${spotsAway} ${spotsAway === 1 ? "spot" : "spots"} from survival. The next cohort is calling.`;
      }
    }
    sendPushToAddress(supabaseAdmin, u.address, {
      title: wasDq ? "Disqualified by the crowd 🚫" : "Eliminated 💀",
      body: wasDq
        ? `The audit flagged your Day ${day} photo. You're out — but the jury needs you: accurate votes count double and earn lottery tickets for the next cohort.`
        : `Day ${day} is closed. You're out — but you're the jury now: accurate votes count double and earn lottery tickets for the next cohort.${nearMissBody}`,
      data: { type: "eliminated", day, near_miss: Boolean(nearMissBody) },
    }).catch(() => {});
  }

  // Everyone gets the verdict summary — the shared reveal moment.
  broadcastPush(supabaseAdmin, {
    title: `Day ${day} verdict is in`,
    body: `${r.survivors ?? 0} survived · ${r.flagged ?? 0} flagged · ${(r.dq || []).length} disqualified. ${r.remaining ?? "?"} humans remain.`,
    data: { type: "verdict", day },
  }).catch(() => {});

  // Day 1 → Day 2 transition: infiltrator mode unlocks. This is a reveal
  // moment — the temptation to cheat emerges after you've played honestly.
  if (day === 1 && !r.winner) {
    broadcastPush(supabaseAdmin, {
      title: `🎭 Infiltrator mode unlocked`,
      body: `Day 2: Submit a photo that could go either way. Trick the crowd → immunity + jury tickets. Get caught → you're out.`,
      data: { type: "infiltrator_unlocked", day: 2 },
    }).catch(() => {});
  }

  if (r.winner) {
    broadcastPush(supabaseAdmin, {
      title: "🏆 We have a Last Human Standing",
      body: "One human outlasted the cohort. Open the app for the ceremony.",
      data: { type: "winner", day },
    }).catch(() => {});
  }
}

// "Final hour" urgency push — fired once per round (closing_notified_at
// guards repeats), checked on the same 60s scheduler tick.
async function notifyClosingSoon() {
  if (!supabaseAdmin) return;
  const nowIso = new Date().toISOString();
  const soonIso = new Date(Date.now() + 60 * 60_000).toISOString();
  const { data: rows } = await supabaseAdmin
    .from("rounds")
    .select("day,closes_at")
    .eq("status", "open")
    .is("closing_notified_at", null)
    .gt("closes_at", nowIso)
    .lte("closes_at", soonIso);
  for (const r of rows || []) {
    const { error } = await supabaseAdmin
      .from("rounds")
      .update({ closing_notified_at: nowIso })
      .eq("day", r.day)
      .is("closing_notified_at", null);
    if (error) continue;
    broadcastPush(supabaseAdmin, {
      title: "⏳ Final hour",
      body: `Day ${r.day} check-in closes soon. Don't get ranked out.`,
      data: { type: "closing_soon", day: r.day },
    }).catch(() => {});
  }
}

// Audit participation nudge — fires once per open round, AUDIT_NUDGE_HOURS
// after the window opens. Targets paid players who haven't hit VOTE_DAILY_GOAL.
const auditNudgeFiredFor = new Set();

async function notifyAuditNeeded() {
  if (!supabaseAdmin) return;

  const nudgeMs = AUDIT_NUDGE_HOURS * 60 * 60 * 1000;
  const quorum = (await getDynamicVoteQuorum()).effective;

  const { data: rounds } = await supabaseAdmin
    .from("rounds")
    .select("day,opens_at")
    .eq("status", "open");

  for (const r of rounds || []) {
    if (auditNudgeFiredFor.has(r.day)) continue;
    if (!r.opens_at) continue;
    if (Date.now() - Date.parse(r.opens_at) < nudgeMs) continue;

    auditNudgeFiredFor.add(r.day);

    const { data: subs } = await supabaseAdmin
      .from("submissions")
      .select("id,status")
      .eq("day", r.day);

    const ids = (subs || []).map((s) => s.id);
    let needsVotes = 0;
    if (ids.length > 0) {
      const { data: agg } = await supabaseAdmin
        .from("votes")
        .select("submission_id")
        .in("submission_id", ids);
      const counts = new Map();
      for (const row of agg || []) {
        counts.set(row.submission_id, (counts.get(row.submission_id) || 0) + 1);
      }
      for (const s of subs || []) {
        if (s.status !== "pending") continue;
        if ((counts.get(s.id) || 0) < quorum) needsVotes += 1;
      }
    }

    const { data: voters } = await supabaseAdmin
      .from("users")
      .select("address")
      .eq("paid", true);

    for (const u of voters || []) {
      let votesToday = 0;
      if (r.opens_at) {
        const { count } = await supabaseAdmin
          .from("votes")
          .select("id", { count: "exact", head: true })
          .eq("voter_address", u.address)
          .gte("created_at", r.opens_at);
        votesToday = count ?? 0;
      }
      if (votesToday >= VOTE_DAILY_GOAL) continue;

      const remaining = Math.max(0, VOTE_DAILY_GOAL - votesToday);
      sendPushToAddress(supabaseAdmin, u.address, {
        title: needsVotes > 0 ? `${needsVotes} photos need your vote` : "The audit needs you",
        body: needsVotes > 0
          ? `You've cast ${votesToday}/${VOTE_DAILY_GOAL} today — ${remaining} more to hit your goal. Verdicts only work if humans vote.`
          : `You've cast ${votesToday}/${VOTE_DAILY_GOAL} today. Open the feed and vote HUMAN or SUS.`,
        data: { type: "audit_nudge", day: r.day, needsVotes, votesToday },
      }).catch(() => {});
    }
  }
}

setInterval(() => {
  cleanupPersistentState().catch(() => {});
  autoAdvanceRounds().catch(() => {});
  notifyClosingSoon().catch(() => {});
  notifyRankSnapshot().catch(() => {});
  notifyAuditNeeded().catch(() => {});
}, 60_000).unref();

// Mid-day rank snapshot — fires once at ~50% through the check-in window.
// Gives players a reason to re-open the app between check-in and close.
let rankSnapshotFiredFor = new Set(); // day numbers we've already snapshotted

async function notifyRankSnapshot() {
  if (!supabaseAdmin) return;
  const { data: rounds } = await supabaseAdmin
    .from("rounds")
    .select("day,opens_at,closes_at")
    .eq("status", "open");
  for (const r of rounds || []) {
    if (rankSnapshotFiredFor.has(r.day)) continue;
    if (!r.opens_at || !r.closes_at) continue;
    const open = Date.parse(r.opens_at);
    const close = Date.parse(r.closes_at);
    const now = Date.now();
    const midpoint = open + (close - open) * 0.5;
    // Fire after the midpoint of the check-in window
    if (now < midpoint) continue;

    rankSnapshotFiredFor.add(r.day);

    // Get current check-in count for context
    const { count: checkinCount } = await supabaseAdmin
      .from("checkins")
      .select("address", { count: "exact", head: true })
      .eq("day", r.day);

    // Notify all active (non-eliminated) players
    const { data: activePlayers } = await supabaseAdmin
      .from("users")
      .select("address")
      .eq("paid", true)
      .eq("eliminated", false);

    for (const p of activePlayers || []) {
      // Check if they've checked in today
      const { data: ci } = await supabaseAdmin
        .from("checkins")
        .select("rank,survived")
        .eq("day", r.day)
        .eq("address", p.address)
        .maybeSingle();

      // Get their streak for loss aversion messaging
      const { data: userRec } = await supabaseAdmin
        .from("users")
        .select("checkin_streak")
        .eq("address", p.address)
        .maybeSingle();
      const streak = userRec?.checkin_streak ?? 0;

      if (ci) {
        // Already checked in — tell them their rank
        sendPushToAddress(supabaseAdmin, p.address, {
          title: `📊 Mid-day snapshot`,
          body: `You're rank #${ci.rank ?? "?"}. ${checkinCount ?? "?"} humans checked in so far. Verdicts start landing soon.`,
          data: { type: "rank_snapshot", day: r.day },
        }).catch(() => {});
      } else {
        // Haven't checked in — nudge them with streak loss aversion
        const streakWarning = streak >= 2
          ? `🔥 Your ${streak}-day streak is at risk. Don't lose it — check in now.`
          : `${checkinCount ?? "?"} humans already checked in. Don't get ranked out — check in now.`;
        sendPushToAddress(supabaseAdmin, p.address, {
          title: streak >= 2 ? `🔥 Don't lose your streak` : `⏰ Day ${r.day} is half over`,
          body: streakWarning,
          data: { type: "rank_snapshot", day: r.day, streak_at_risk: streak >= 2 },
        }).catch(() => {});
      }
    }
  }
}

// Start onchain vote relayer — reads from vote_queue table, submits to VoteRegistry on Celo.
// No-op (logs "vote_relayer_offline") if VOTE_REGISTRY_ADDRESS + CELO_SIGNING_KEY + Supabase not set.
const stopRelayer = startVoteRelayer({ log, supabaseAdmin });

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
      workerSrc: ["'self'", "blob:"],
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

app.get("/api/health", async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  res.json({ ok: true, time: new Date().toISOString(), supabase: dbHealth.ok, dbError: dbHealth.error || null });
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

// Lightweight page-view ping. No PII captured, no auth required.
// Logs a row in page_views (created by the 005 migration) so the
// launch operator can see how many humans saw the page, when,
// and on what route. Rate-limited to 30 / hour / IP to keep
// noise out of the table.
app.post(
  "/api/track",
  rateLimit({ keyFn: (req) => `track:${req.ip}`, limit: 30, windowMs: 60 * 60_000, storage: rateLimitStorage }),
  async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    const path = ensureString(body.path, { field: "path", maxLength: 200 }) ?? null;
    const referrer = ensureString(body.referrer, { field: "referrer", maxLength: 500 }) ?? null;
    const sessionId = req.cookies?.[SESSION_COOKIE] ?? null;
    const ua = (req.headers["user-agent"] || "").slice(0, 300);
    const ipHash = crypto.createHash("sha256").update(req.ip || "").digest("hex").slice(0, 32);
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from("cohort_page_views").insert({
          path,
          referrer,
          session_id: sessionId,
          ip_hash: ipHash,
          user_agent: ua,
        });
      } catch (e) {
        log?.("track_error", { error: e instanceof Error ? e.message : String(e) });
      }
    }
    res.json({ ok: true });
  },
);

// Waitlist signup. Public endpoint, no auth required. Captures
// bounced visitors on the welcome screen / spectator UI so we
// can ping them when cohort 1 is about to launch. Always
// returns 200 with a generic { ok: true } so the API can't be
// used to enumerate which handles/emails are already on the
// list.
app.post(
  "/api/waitlist",
  rateLimit({ keyFn: (req) => `waitlist:${req.ip}`, limit: 5, windowMs: 60 * 60_000, storage: rateLimitStorage }),
  async (req, res) => {
    const body = ensureObjectBody(req, res);
    if (!body) return;
    const xHandleRaw = ensureString(body.x_handle, { field: "x_handle", maxLength: 50 }) ?? null;
    const emailRaw = ensureString(body.email, { field: "email", maxLength: 200 }) ?? null;
    const source = ensureString(body.source, { field: "source", maxLength: 50 }) ?? "welcome_screen";

    if (!xHandleRaw && !emailRaw) {
      // Don't expose a specific error — just succeed silently.
      return res.json({ ok: true });
    }

    const xHandle = xHandleRaw ? xHandleRaw.replace(/^@/, "").toLowerCase() : null;
    const email = emailRaw ? emailRaw.toLowerCase() : null;

    if (xHandle && !/^[a-z0-9_]{1,15}$/.test(xHandle)) {
      return res.json({ ok: true });
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.json({ ok: true });
    }

    const ua = (req.headers["user-agent"] || "").slice(0, 300);
    const ipHash = crypto.createHash("sha256").update(req.ip || "").digest("hex").slice(0, 32);

    if (supabaseAdmin) {
      try {
        // Upsert on the unique index. If the row already exists
        // we leave the original created_at alone but bump source
        // so we know which surface they re-signed up from.
        const conflictCol = xHandle ? "x_handle" : "email";
        const conflictVal = xHandle || email;
        const { data: existing } = await supabaseAdmin
          .from("cohort_waitlist")
          .select("id, x_handle, email, source")
          .eq(conflictCol, conflictVal)
          .maybeSingle();
        if (existing) {
          await supabaseAdmin
            .from("cohort_waitlist")
            .update({ source })
            .eq("id", existing.id);
        } else {
          await supabaseAdmin.from("cohort_waitlist").insert({
            x_handle: xHandle,
            email,
            source,
            user_agent: ua,
            ip_hash: ipHash,
          });
        }
        log?.("waitlist_signup", { xHandle, email, source });
      } catch (e) {
        log?.("waitlist_error", { error: e instanceof Error ? e.message : String(e) });
      }
    }
    res.json({ ok: true });
  },
);

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
    // Official algorithm from @worldcoin/idkit-server (secp256k1 ECDSA
    // over Keccak-256 + EIP-191 — see docs.world.org/idkit/signatures).
    // The old local HMAC-SHA256 signRequest produced signatures World
    // App would reject, so we use the published SDK here.
    const signed = idkitSignRequest({
      signingKeyHex: signing_key,
      action,
      ttl: 5 * 60,
    });
    return res.json({
      rp_context: {
        rp_id,
        nonce: signed.nonce,
        created_at: signed.createdAt,
        expires_at: signed.expiresAt,
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
    // Per the current IDKit spec (docs.world.org/idkit/integrate Step 5):
    // "Forward the IDKit result payload as-is. No field remapping is
    // required." The v4 endpoint accepts both 4.0 and legacy 3.0 proofs.
    // We fall back to the legacy /v2/verify endpoint only if v4 rejects
    // with `app_not_migrated` AND we still have an app_id to verify with.
    const v4Body = JSON.stringify(idkitResponse);
    const legacyBody = JSON.stringify({
      nullifier_hash: idkitResponse.nullifier_hash,
      merkle_root: idkitResponse.merkle_root,
      proof: idkitResponse.proof,
      verification_level: idkitResponse.verification_level || "orb",
      action,
      signal_hash: idkitResponse.signal_hash || undefined,
    });

    const v4Endpoint = `https://developer.world.org/api/v4/verify/${verifyId}`;
    const legacyEndpoint = `https://developer.worldcoin.org/api/v2/verify/${app_id || verifyId}`;

    let resp;
    let json;
    let usedLegacyFallback = false;

    if (isV4) {
      resp = await fetch(v4Endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: v4Body,
      });
      json = await resp.json().catch(() => null);
      if (!resp.ok && json?.code === "app_not_migrated" && app_id) {
        usedLegacyFallback = true;
        resp = await fetch(legacyEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: legacyBody,
        });
        json = await resp.json().catch(() => null);
      }
    } else {
      usedLegacyFallback = true;
      resp = await fetch(legacyEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: legacyBody,
      });
      json = await resp.json().catch(() => null);
    }

    if (!resp.ok) return res.status(400).json({ error: "verify_failed", details: json, used_legacy_fallback: usedLegacyFallback });

    // Store the nullifier returned by the verified IDKit response. V4 places
    // it at responses[n].nullifier; the legacy shape uses nullifier_hash.
    const nullifier = extractWorldIdNullifier(idkitResponse);
    if (!nullifier) {
      return res.status(400).json({ error: "missing_nullifier" });
    }

    if (supabaseAdmin) {
      const verifiedAt = new Date().toISOString();
      const { error: upsertError } = await supabaseAdmin.from("users").upsert(
        {
          address: req.user.address,
          world_id_verified: true, // Legacy flag — kept for backward compat
          humanity_provider: "worldcoin", // New unified humanity column
          humanity_nullifier: nullifier,
          humanity_verified_at: verifiedAt,
          verified_human: true,
          verified_at: verifiedAt,
          last_seen_at: verifiedAt,
        },
        { onConflict: "address" },
      );
      if (upsertError) {
        // The unique nullifier index is the replay-protection boundary.
        // Do not report success if the proof could not be persisted.
        const duplicate = upsertError.code === "23505";
        return res.status(duplicate ? 409 : 500).json({
          error: duplicate ? "nullifier_already_used" : "verification_persist_failed",
        });
      }
    }
    return res.json({ ok: true, verified: true, details: json, used_legacy_fallback: usedLegacyFallback });
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
    log("self_verify_request", {
      attestationId: body?.attestationId,
      hasProof: !!body?.proof,
      signalCount: body?.publicSignals?.length,
      hasUserContext: typeof body?.userContextData === "string",
    });

    const verification = await verifySelfProof(body);
    if (!verification.ok) {
      log("self_verify_failed", {
        reason: verification.reason,
        details: verification.details,
      });
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

      const verifiedAt = new Date().toISOString();
      await supabaseAdmin.from("users").upsert(
        {
          address: walletAddress,
          humanity_provider: "self",
          humanity_nullifier: walletAddress,
          humanity_verified_at: verifiedAt,
          verified_human: true,
          verified_at: verifiedAt,
          world_id_verified: true, // Self is treated as a full PoH proof
          last_seen_at: verifiedAt,
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

// Infiltrator success rate — cached 60s, used by the CheckIn screen
// to show players the odds before they choose infiltrator mode.
let infiltratorStatsCache = { value: null, fetchedAt: 0 };
async function getInfiltratorStats() {
  if (!supabaseAdmin) return null;
  if (Date.now() - infiltratorStatsCache.fetchedAt < 60_000) return infiltratorStatsCache.value;

  const { data: infiltrators } = await supabaseAdmin
    .from("submissions")
    .select("id,status")
    .eq("is_infiltrator", true)
    .in("status", ["verified", "flagged"]);

  const total = infiltrators?.length ?? 0;
  const succeeded = infiltrators?.filter(s => s.status === "verified").length ?? 0;
  const successRate = total > 0 ? Math.round((succeeded / total) * 100) : null;

  const value = { total, succeeded, successRate };
  infiltratorStatsCache = { value, fetchedAt: Date.now() };
  return value;
}

app.get("/api/infiltrator-stats", async (req, res) => {
  try {
    const stats = await getInfiltratorStats();
    res.json({ ok: true, ...stats });
  } catch (e) {
    res.json({ ok: true, total: 0, succeeded: 0, successRate: null });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const prizePoolAddress = process.env.VITE_PRIZE_POOL_ADDRESS;
    const celoPrizePoolAddress = process.env.VITE_CELO_PRIZE_POOL_ADDRESS;
    const now = Date.now();

    if (prizePoolAddress && now - balanceCache.fetchedAt > 60_000) {
      try {
        balanceCache.value = await fetchWldBalance(prizePoolAddress);
        balanceCache.fetchedAt = now;
      } catch {
        // keep stale value
      }
    }
    if (celoPrizePoolAddress && now - celoBalanceCache.fetchedAt > 60_000) {
      try {
        celoBalanceCache.value = await fetchCeloPot(celoPrizePoolAddress);
        celoBalanceCache.fetchedAt = now;
      } catch {
        // keep stale value
      }
    }

    let totalPlayers = 0;
    let activePlayers = 0;
    let paidCount = 0;
    let freeCount = 0;
    if (supabaseAdmin) {
      const [total, active, paid, free] = await Promise.all([
        supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true),
        supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true).eq("eliminated", false),
        supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true).eq("entry_kind", "paid"),
        supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true).eq("entry_kind", "free"),
      ]);
      totalPlayers = total.count ?? 0;
      activePlayers = active.count ?? 0;
      paidCount = paid.count ?? 0;
      freeCount = free.count ?? 0;
    }

    res.json({
      ok: true,
      prizePool: {
        wld: {
          address: prizePoolAddress || null,
          balance: balanceCache.value,
          explorerUrl: prizePoolAddress ? `https://worldscan.org/address/${prizePoolAddress}` : null,
        },
        celo: celoBalanceCache.value || {
          address: celoPrizePoolAddress || null,
          cusd: 0,
          explorerUrl: celoPrizePoolAddress ? `https://celoscan.io/address/${celoPrizePoolAddress}` : null,
        },
        // Backward-compat alias for older clients.
        balanceWld: balanceCache.value,
        address: prizePoolAddress || null,
        explorerUrl: prizePoolAddress ? `https://worldscan.org/address/${prizePoolAddress}` : null,
      },
      cohort: {
        size: COHORT_CONFIG.size,
        paidSlots: COHORT_CONFIG.paidSlots,
        freeSlots: freeSlotsFor(paidCount, COHORT_SIZE),
        freeSlotsMax: COHORT_CONFIG.freeSlots,
        paidCount,
        freeCount,
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



async function upsertPaidUser(address, { referredBy = null, platform = null, entryKind = "paid", entryToken = null } = {}) {
  if (!supabaseAdmin) return;

  const existing = await getUserRecord(address);
  if (!existing?.paid) {
    // Humans cannot take reserved agent seats when agents are enabled.
    const seats = await getAgentSeatState({ forPublic: true });
    if (seats.enabled && seats.humansFull) {
      const err = new Error("human_slots_full");
      err.code = "human_slots_full";
      throw err;
    }
    if (!seats.enabled) {
      const reserved = await reservedCount();
      if (reserved >= COHORT_SIZE) {
        const err = new Error("cohort_full");
        err.code = "cohort_full";
        throw err;
      }
    }
  }

  const refCode = existing?.referral_code || makeReferralCode(address.slice(0, 6));
  await supabaseAdmin.from("users").upsert(
    {
      address,
      paid: true,
      reserved_at: existing?.reserved_at || new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      referral_code: refCode,
      referred_by: referredBy ?? existing?.referred_by ?? null,
      platform,
      entry_kind: entryKind,
      entry_token: entryToken,
      cohort: 1,
      is_agent: false,
    },
    { onConflict: "address", ignoreDuplicates: false },
  );
  if (referredBy && !existing?.referred_by) {
    await supabaseAdmin.rpc("increment_referral", { ref_code: referredBy }).catch(() => {});
  }
  // Ensure a cohort_participations row exists for this user.
  // Per-cohort state (eliminated, streak, immunity) lives there now;
  // the trigger syncs it back to users.* for backward compat.
  await supabaseAdmin.rpc("ensure_cohort_participation", {
    p_address: address,
    p_cohort: COHORT_CONFIG.cohort,
  }).catch(() => {});
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
    const photoHash = normalizePhotoHash(body.photoHash);
    const username = ensureString(body.username, { field: "username", required: false, maxLength: 64 });
    const isInfiltrator = ensureBoolean(body.isInfiltrator, { field: "isInfiltrator" });

    // Day 1 is honest-only — establishes a baseline so infiltrator attempts
    // on Day 2+ are detectable. Server-side guard prevents client bypass.
    const effectiveInfiltrator = day >= 2 ? isInfiltrator : false;

    const ok = await verifyMessage({ address, message, signature });
    if (!ok) return res.status(401).json({ error: "invalid_signature" });

    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

    const { effective: dynamicVoteQuorum } = await getDynamicVoteQuorum();

    if (photoHash) {
      const dup = await checkPhotoDuplicate(supabaseAdmin, {
        photoHash,
        address: req.user.address,
        day,
      });
      if (dup.duplicate) {
        log("anticheat_flag", {
          reason: dup.reason,
          address: req.user.address,
          day,
          matchedDay: dup.matchedDay ?? null,
        });
        return res.status(409).json({ error: "duplicate_photo", reason: dup.reason });
      }
    }

    const payloadToStore = {
      address: req.user.address,
      username,
      day,
      theme,
      caption,
      message,
      signature,
      media_path: mediaPath,
      photo_hash: photoHash,
      vote_quorum: dynamicVoteQuorum,
      status: "pending",
      is_infiltrator: effectiveInfiltrator,
    };

    const { data, error } = await supabaseAdmin.from("submissions").insert(payloadToStore).select("*").single();
    if (error) return res.status(400).json({ error: "db_insert_failed", message: error.message });

    // Social FOMO: notify the referrer that their referral just checked in.
    // "Your referral is playing — are you?" creates social pressure to stay engaged.
    try {
      const { data: userRec } = await supabaseAdmin
        .from("users")
        .select("referred_by")
        .eq("address", req.user.address)
        .maybeSingle();
      const referrerCode = userRec?.referred_by;
      if (referrerCode) {
        // Find the referrer's address by their referral code
        const { data: referrer } = await supabaseAdmin
          .from("users")
          .select("address")
          .eq("referral_code", referrerCode)
          .maybeSingle();
        if (referrer?.address && referrer.address.toLowerCase() !== req.user.address.toLowerCase()) {
          // Only notify on the referrer's first check-in of the day (avoid spam)
          const { count: refCheckinsToday } = await supabaseAdmin
            .from("submissions")
            .select("id", { count: "exact", head: true })
            .eq("address", req.user.address)
            .eq("day", day);
          if (refCheckinsToday === 1) {
            sendPushToAddress(supabaseAdmin, referrer.address, {
              title: `👥 Your referral is playing`,
              body: `Someone you invited just checked in for Day ${day}. Don't let them outlast you.`,
              data: { type: "referral_checkin", day },
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      log("referral_fomo_notify_error", { address: req.user.address, error: String(e) });
    }

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

// Public read — spectators (and share-link visitors) can watch the audit.
// Voting still requires auth + entry. Note: is_infiltrator is deliberately
// NOT exposed — announcing the bluff would kill the deduction game.
app.get("/api/feed", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

    const { data: subs, error } = await supabaseAdmin
      .from("submissions")
      .select("id,created_at,address,username,day,theme,caption,media_path,status,vote_quorum")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });

    const ids = subs.map((s) => s.id);
    const voteCounts = new Map();
    if (ids.length > 0) {
      const { data: agg, error: aggErr } = await supabaseAdmin.from("votes").select("submission_id,vote,weight").in("submission_id", ids);
      if (!aggErr && Array.isArray(agg)) {
        for (const row of agg) {
          const cur = voteCounts.get(row.submission_id) || { real: 0, fake: 0 };
          const w = Number(row.weight) || 1;
          if (row.vote === "real") cur.real += w;
          if (row.vote === "fake") cur.fake += w;
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

// ─── Semaphore anonymous-audit prototype ────────────────────────────────
// Feature-flagged and deliberately separate from /api/vote. It establishes
// verified-cohort enrollment and atomic anonymous-signal replay protection;
// reveal/finalization will be wired only after the cohort UX is approved.
app.post("/api/semaphore/enroll", requireAuth, async (req, res) => {
  if (!SEMAPHORE_AUDIT_ENABLED) return res.status(404).json({ error: "semaphore_audit_disabled" });
  const body = ensureObjectBody(req, res);
  if (!body) return;

  try {
    const identityCommitment = ensureString(body.identityCommitment, { field: "identityCommitment", required: true, min: 1, max: 78 });
    if (!/^\d+$/.test(identityCommitment)) return res.status(400).json({ error: "invalid_identity_commitment" });
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

    const user = await getUserRecord(req.user.address);
    const humanVerified = Boolean(user?.world_id_verified) || Boolean(user?.humanity_nullifier);
    if (!humanVerified) return res.status(403).json({ error: "humanity_verification_required" });
    if (!user?.paid || user.cohort !== COHORT_CONFIG.cohort) return res.status(403).json({ error: "active_cohort_membership_required" });

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("semaphore_enrollments")
      .select("identity_commitment")
      .eq("cohort", COHORT_CONFIG.cohort)
      .eq("address", req.user.address)
      .maybeSingle();
    if (existingError) return res.status(400).json({ error: "semaphore_enrollment_read_failed", message: existingError.message });
    if (existing && existing.identity_commitment !== identityCommitment) {
      return res.status(409).json({ error: "semaphore_identity_already_enrolled" });
    }

    const { error } = await supabaseAdmin.from("semaphore_enrollments").upsert(
      { cohort: COHORT_CONFIG.cohort, address: req.user.address, identity_commitment: identityCommitment },
      { onConflict: "cohort,address", ignoreDuplicates: true },
    );
    if (error) {
      const duplicate = error.code === "23505";
      return res.status(duplicate ? 409 : 400).json({ error: duplicate ? "semaphore_identity_already_enrolled" : "semaphore_enrollment_failed", message: error.message });
    }
    return res.json({ ok: true, cohort: COHORT_CONFIG.cohort });
  } catch (error) {
    sendValidationError(res, error);
  }
});

app.get("/api/semaphore/group", requireAuth, async (req, res) => {
  if (!SEMAPHORE_AUDIT_ENABLED) return res.status(404).json({ error: "semaphore_audit_disabled" });
  if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
  const { data, error } = await supabaseAdmin
    .from("semaphore_enrollments")
    .select("identity_commitment")
    .eq("cohort", COHORT_CONFIG.cohort)
    .order("identity_commitment", { ascending: true });
  if (error) return res.status(400).json({ error: "semaphore_group_read_failed", message: error.message });
  const members = (data || []).map((row) => row.identity_commitment);
  const group = new Group(members.map((member) => BigInt(member)));
  return res.json({ ok: true, cohort: COHORT_CONFIG.cohort, members, root: group.root.toString() });
});

app.post("/api/semaphore/signal", requireAuth, async (req, res) => {
  if (!SEMAPHORE_AUDIT_ENABLED) return res.status(404).json({ error: "semaphore_audit_disabled" });
  const body = ensureObjectBody(req, res);
  if (!body) return;

  try {
    const submissionId = ensureNumber(body.submissionId, { field: "submissionId", required: true, integer: true, min: 1 });
    const roundId = ensureNumber(body.roundId, { field: "roundId", required: true, integer: true, min: 1 });
    const commitment = ensureString(body.commitment, { field: "commitment", required: true, min: 1, max: 78 });
    if (!/^\d+$/.test(commitment) || !body.proof || typeof body.proof !== "object") {
      return res.status(400).json({ error: "invalid_semaphore_signal" });
    }
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

    const { data: members, error: membersError } = await supabaseAdmin
      .from("semaphore_enrollments")
      .select("identity_commitment")
      .eq("cohort", COHORT_CONFIG.cohort)
      .order("identity_commitment", { ascending: true });
    if (membersError) return res.status(400).json({ error: "semaphore_group_read_failed", message: membersError.message });
    if ((members || []).length < 3) return res.status(409).json({ error: "semaphore_anonymity_set_too_small" });

    const group = new Group((members || []).map((row) => BigInt(row.identity_commitment)));
    const scopeLabel = `lhs:audit:cohort-${COHORT_CONFIG.cohort}:round-${roundId}:submission-${submissionId}`;
    const verification = await createSemaphoreAuditVerifier().verifyCommitment({
      proof: body.proof,
      scopeLabel,
      commitment,
      groupRoot: group.root.toString(),
    });
    if (!verification.ok) return res.status(400).json({ error: "semaphore_signal_invalid", reason: verification.reason });

    // The unique primary key in migration 027 makes this replay check atomic
    // across API processes. No voter address is written with the nullifier.
    const { error: insertError } = await supabaseAdmin.from("semaphore_audit_nullifiers").insert({
      cohort: COHORT_CONFIG.cohort,
      round_id: roundId,
      submission_id: submissionId,
      nullifier: verification.nullifier,
      commitment,
    });
    if (insertError) {
      if (insertError.code === "23505") return res.status(409).json({ error: "semaphore_nullifier_already_used" });
      return res.status(400).json({ error: "semaphore_signal_store_failed", message: insertError.message });
    }
    return res.json({ ok: true, submissionId, roundId });
  } catch (error) {
    sendValidationError(res, error);
  }
});

// Audit funnel for the open round — public counts + per-player progress
// when a session cookie is present (via getOptionalAuthAddress).
app.get("/api/audit/status", async (req, res) => {
  try {
    const quorumInfo = await getDynamicVoteQuorum();
    const quorum = quorumInfo.effective;
    const empty = {
      day: null,
      voteQuorum: quorum,
      voteQuorumReason: quorumInfo.reason,
      submissionCount: 0,
      pendingCount: 0,
      needsVotes: 0,
      dailyGoal: VOTE_DAILY_GOAL,
      votesCastToday: null,
      unvotedCount: null,
      goalMet: null,
      opensAt: null,
      closesAt: null,
    };

    if (!supabaseAdmin) return res.json({ ok: true, ...empty });

    const { data: round } = await supabaseAdmin
      .from("rounds")
      .select("day,opens_at,closes_at,status")
      .eq("status", "open")
      .maybeSingle();

    if (!round) return res.json({ ok: true, ...empty });

    const { data: subs } = await supabaseAdmin
      .from("submissions")
      .select("id,status")
      .eq("day", round.day);

    const ids = (subs || []).map((s) => s.id);
    const voteTotals = new Map();
    if (ids.length > 0) {
      const { data: agg } = await supabaseAdmin
        .from("votes")
        .select("submission_id")
        .in("submission_id", ids);
      for (const row of agg || []) {
        voteTotals.set(row.submission_id, (voteTotals.get(row.submission_id) || 0) + 1);
      }
    }

    let pendingCount = 0;
    let needsVotes = 0;
    for (const s of subs || []) {
      if (s.status === "pending") pendingCount += 1;
      const total = voteTotals.get(s.id) || 0;
      if (s.status === "pending" && total < quorum) needsVotes += 1;
    }

    const address = await getOptionalAuthAddress(req);
    let votesCastToday = null;
    let unvotedCount = null;
    let goalMet = null;

    if (address) {
      const votedIds = new Set();
      if (ids.length > 0) {
        const { data: mine } = await supabaseAdmin
          .from("votes")
          .select("submission_id,created_at")
          .eq("voter_address", address)
          .in("submission_id", ids);
        for (const v of mine || []) {
          if (!round.opens_at || v.created_at >= round.opens_at) {
            votedIds.add(v.submission_id);
          }
        }
      }
      votesCastToday = votedIds.size;
      unvotedCount = ids.filter((id) => !votedIds.has(id)).length;
      goalMet = votesCastToday >= VOTE_DAILY_GOAL;
    }

    return res.json({
      ok: true,
      day: round.day,
      voteQuorum: quorum,
      voteQuorumReason: quorumInfo.reason,
      submissionCount: subs?.length ?? 0,
      pendingCount,
      needsVotes,
      dailyGoal: VOTE_DAILY_GOAL,
      votesCastToday,
      unvotedCount,
      goalMet,
      opensAt: round.opens_at,
      closesAt: round.closes_at,
    });
  } catch (e) {
    res.status(500).json({ error: "audit_status_failed", message: e instanceof Error ? e.message : "unknown_error" });
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
        // Jury weight: eliminated players with a proven accuracy record
        // count double. Computed at cast time and stored on the vote row.
        let weight = 1;
        const voterRec = await getUserRecord(req.user.address);
        if (voterRec?.eliminated) {
          const stats = await getVoterStats(req.user.address);
          if (stats.total >= JURY_MIN_RESOLVED && (stats.accuracy ?? 0) >= JURY_MIN_ACCURACY) {
            weight = JURY_WEIGHT;
          }
        }

        // Atomic vote insert + onchain queue in one Postgres transaction.
        // The cast_vote RPC handles duplicate detection, vote insert, and
        // enqueue for the onchain relayer — all-or-nothing.
        const { data: castResult, error: castError } = await supabaseAdmin.rpc("cast_vote", {
          p_submission_id: submissionId,
          p_voter_address: req.user.address,
          p_vote: vote,
          p_weight: weight,
        });
        if (castError) {
          if (String(castError.message || "").includes("duplicate")) return res.status(409).json({ error: "already_voted" });
          return res.status(400).json({ error: "db_vote_failed", message: castError.message });
        }
        if (!castResult?.[0]?.inserted) {
          if (castResult?.[0]?.duplicate) return res.status(409).json({ error: "already_voted" });
          return res.status(400).json({ error: "vote_insert_failed" });
        }

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

        // Reciprocity: notify the submission owner that someone voted on their photo.
        // This creates a social obligation to return the favor — "they voted on mine,
        // I should vote on theirs." Only fires once per submission (first vote only)
        // to avoid spamming the owner.
        try {
          const { data: sub } = await supabaseAdmin
            .from("submissions")
            .select("address,day")
            .eq("id", submissionId)
            .maybeSingle();
          if (sub?.address && sub.address.toLowerCase() !== req.user.address.toLowerCase()) {
            // Check if this is the first vote on this submission (reciprocity is strongest on first interaction)
            const { count: voteCount } = await supabaseAdmin
              .from("votes")
              .select("id", { count: "exact", head: true })
              .eq("submission_id", submissionId);
            if (voteCount === 1) {
              sendPushToAddress(supabaseAdmin, sub.address, {
                title: `👁️ Someone's auditing your photo`,
                body: `A voter just rated your Day ${sub.day ?? "?"} submission. Return the favor — audit theirs in the feed.`,
                data: { type: "reciprocity_vote", submissionId, day: sub.day },
              }).catch(() => {});
            }
          }
        } catch (e) {
          log("reciprocity_notify_error", { submissionId, error: String(e) });
        }

        const countedVotes = { real: 0, fake: 0 };
        const { data: subVotes } = await supabaseAdmin
          .from("votes")
          .select("vote,weight")
          .eq("submission_id", submissionId);
        for (const v of subVotes || []) {
          const w = Number(v.weight) || 1;
          if (v.vote === "real") countedVotes.real += w;
          if (v.vote === "fake") countedVotes.fake += w;
        }

        const { data: subRow } = await supabaseAdmin.from("submissions").select("vote_quorum,status").eq("id", submissionId).single();
        const quorum = subRow?.vote_quorum ?? VOTE_QUORUM;
        const computed = computeVoteStatus(countedVotes, quorum);
        if (computed.status !== "pending" && subRow?.status === "pending") {
          // First transition out of pending: lock the verdict and pay the
          // jury. Later votes don't re-award (close_day only finalizes
          // still-pending submissions, so no double-award there either).
          await supabaseAdmin.from("submissions").update({ status: computed.status }).eq("id", submissionId);
          try {
            await supabaseAdmin.rpc("award_jury_tickets", { p_submission_id: submissionId, p_final_status: computed.status });
          } catch (e) {
            log("jury_ticket_error", { submissionId, error: e instanceof Error ? e.message : String(e) });
          }

          // Vote feedback — notify each voter whether they were right.
          // This closes the engagement loop: vote → verdict → feedback.
          try {
            const { data: allVotes } = await supabaseAdmin
              .from("votes")
              .select("voter_address,vote")
              .eq("submission_id", submissionId);
            const finalStatus = computed.status; // "verified" or "flagged"
            for (const v of allVotes || []) {
              const wasCorrect =
                (finalStatus === "verified" && v.vote === "real") ||
                (finalStatus === "flagged" && v.vote === "fake");
              const stats = await getVoterStats(v.voter_address);
              sendPushToAddress(supabaseAdmin, v.voter_address, {
                title: wasCorrect ? "✅ You were right!" : "❌ You were wrong",
                body: wasCorrect
                  ? `+1 jury ticket. Accuracy: ${stats.accuracy ?? "—"}%`
                  : `The crowd voted ${finalStatus}. Accuracy: ${stats.accuracy ?? "—"}%`,
                data: { type: "vote_feedback", correct: wasCorrect, accuracy: stats.accuracy },
              }).catch(() => {});
            }
          } catch (e) {
            log("vote_feedback_error", { submissionId, error: String(e) });
          }
        }

        return res.json({ ok: true, votes: countedVotes, status: computed.status, voteQuorum: quorum, juryWeight: weight, onchain: Boolean(process.env.VOTE_REGISTRY_ADDRESS) });
      }
    } catch (error) {
      sendValidationError(res, error);
    }
  },
);

// Single source of truth for a voter's accuracy record — used by the
// /api/voter-stats route and by the jury-weight computation in /api/vote.
async function getVoterStats(address) {
  if (!supabaseAdmin) return { accuracy: null, correct: 0, total: 0 };
  const { data: votes } = await supabaseAdmin.from("votes").select("submission_id,vote").eq("voter_address", address);
  if (!votes?.length) return { accuracy: null, correct: 0, total: 0 };

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
  return { accuracy: total ? correct / total : null, correct, total };
}

app.get("/api/voter-stats/:address", async (req, res) => {
  try {
    const addr = req.params.address;
    const stats = await getVoterStats(addr);
    let juryTickets = 0;
    let isJury = false;
    if (supabaseAdmin) {
      const { data: u } = await supabaseAdmin.from("users").select("jury_tickets,eliminated").eq("address", addr).maybeSingle();
      juryTickets = u?.jury_tickets ?? 0;
      isJury = Boolean(u?.eliminated) && stats.total >= JURY_MIN_RESOLVED && (stats.accuracy ?? 0) >= JURY_MIN_ACCURACY;
    }
    return res.json({ ok: true, address: addr, ...stats, juryTickets, isJury, juryWeight: isJury ? JURY_WEIGHT : 1 });
  } catch (e) {
    res.status(400).json({ error: "voter_stats_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// Detective leaderboard — ranked by vote accuracy (min 5 resolved votes).
// Drives jury engagement by making voting competitive.
app.get("/api/detective-board", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.json({ ok: true, board: [] });

    // Get all voters with their votes
    const { data: allVotes } = await supabaseAdmin
      .from("votes")
      .select("voter_address,submission_id,vote");

    if (!allVotes?.length) return res.json({ ok: true, board: [] });

    // Get all submissions to determine which votes were "resolved" (verified/flagged)
    const submissionIds = [...new Set(allVotes.map(v => v.submission_id))];
    const { data: subs } = await supabaseAdmin
      .from("submissions")
      .select("id,status")
      .in("id", submissionIds);

    const statusById = new Map((subs || []).map(s => [s.id, s.status]));

    // Compute accuracy per voter
    const voterMap = new Map(); // address -> { total, correct }
    for (const v of allVotes) {
      const status = statusById.get(v.submission_id);
      if (status !== "verified" && status !== "flagged") continue;
      const entry = voterMap.get(v.voter_address) || { total: 0, correct: 0 };
      entry.total += 1;
      if ((status === "verified" && v.vote === "real") || (status === "flagged" && v.vote === "fake")) {
        entry.correct += 1;
      }
      voterMap.set(v.voter_address, entry);
    }

    // Filter to voters with >= 5 resolved votes, compute accuracy, sort
    const MIN_VOTES = 5;
    const board = [];
    for (const [address, { total, correct }] of voterMap) {
      if (total < MIN_VOTES) continue;
      board.push({ address, total, correct, accuracy: Math.round((correct / total) * 100) });
    }
    board.sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);

    // Enrich with username and jury tickets (top 20 only)
    const top20 = board.slice(0, 20);
    if (top20.length > 0) {
      const addresses = top20.map(b => b.address);
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("address,username,jury_tickets")
        .in("address", addresses);
      const userMap = new Map((users || []).map(u => [u.address.toLowerCase(), u]));
      for (const b of top20) {
        const u = userMap.get(b.address.toLowerCase());
        b.username = u?.username ?? null;
        b.juryTickets = u?.jury_tickets ?? 0;
      }
    }

    res.json({ ok: true, board: top20 });
  } catch (e) {
    res.status(400).json({ error: "detective_board_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// Vote breakdown for a player's submission on a specific day.
// Used by the elimination moment to show "why was I eliminated."
app.get("/api/my-verdict/:day", requireAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const day = Number(req.params.day) || 0;
    const { data: sub } = await supabaseAdmin
      .from("submissions")
      .select("id,status,day,theme,caption,is_infiltrator")
      .eq("address", req.user.address)
      .eq("day", day)
      .maybeSingle();
    if (!sub) return res.json({ ok: true, verdict: null });

    const { data: votes } = await supabaseAdmin
      .from("votes")
      .select("vote,weight")
      .eq("submission_id", sub.id);
    let real = 0, fake = 0;
    for (const v of votes || []) {
      const w = Number(v.weight) || 1;
      if (v.vote === "real") real += w;
      if (v.vote === "fake") fake += w;
    }
    const total = real + fake;
    const realPct = total > 0 ? Math.round((real / total) * 100) : null;
    const fakePct = total > 0 ? Math.round((fake / total) * 100) : null;

    res.json({
      ok: true,
      verdict: {
        submissionId: sub.id,
        status: sub.status,
        day: sub.day,
        theme: sub.theme,
        caption: sub.caption,
        wasInfiltrator: sub.is_infiltrator,
        votes: { real, fake, total, realPct, fakePct },
      },
    });
  } catch (e) {
    res.status(400).json({ error: "verdict_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// Wildcard revival vote: jury members vote for an eliminated player to
// revive on Day 4. One vote per juror per day.
app.post("/api/revive-vote", requireAuth, async (req, res) => {
  if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
  try {
    const { candidateAddress, day } = req.body || {};
    if (!candidateAddress || typeof candidateAddress !== "string") {
      return res.status(400).json({ error: "missing_candidate" });
    }
    const pDay = Number(day) || 4;

    // Only eliminated players (jury) can vote
    const { data: voter } = await supabaseAdmin.from("users").select("eliminated,paid").eq("address", req.user.address).maybeSingle();
    if (!voter?.paid || !voter?.eliminated) {
      return res.status(403).json({ error: "not_jury" });
    }

    // Candidate must be eliminated
    const { data: candidate } = await supabaseAdmin.from("users").select("eliminated,paid").eq("address", candidateAddress).maybeSingle();
    if (!candidate?.paid || !candidate?.eliminated) {
      return res.status(400).json({ error: "candidate_not_eliminated" });
    }

    const { error } = await supabaseAdmin.from("revive_votes").upsert(
      { day: pDay, voter_address: req.user.address, candidate_address: candidateAddress },
      { onConflict: "day,voter_address,candidate_address" },
    );
    if (error) return res.status(400).json({ error: "db_insert_failed", message: error.message });
    return res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "revive_vote_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

// Get revive vote tally for the current day
app.get("/api/revive-votes/:day", async (req, res) => {
  if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
  try {
    const day = Number(req.params.day) || 4;
    const { data, error } = await supabaseAdmin
      .from("revive_votes")
      .select("candidate_address")
      .eq("day", day);
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
    const tally = {};
    for (const v of data || []) {
      const key = v.candidate_address.toLowerCase();
      tally[key] = (tally[key] || 0) + 1;
    }
    return res.json({ ok: true, day, tally });
  } catch (e) {
    res.status(400).json({ error: "revive_tally_failed", message: e instanceof Error ? e.message : "unknown_error" });
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

async function humanReservedCount() {
  if (!supabaseAdmin) return 0;
  const { count } = await supabaseAdmin
    .from("users")
    .select("address", { count: "exact", head: true })
    .eq("paid", true)
    .eq("is_agent", false);
  return count ?? 0;
}

async function agentReservedCount() {
  if (!supabaseAdmin) return 0;
  const { count } = await supabaseAdmin
    .from("users")
    .select("address", { count: "exact", head: true })
    .eq("paid", true)
    .eq("is_agent", true);
  return count ?? 0;
}

async function getAgentSeatState({ forPublic = true } = {}) {
  const [humanCount, agentCount] = await Promise.all([
    humanReservedCount(),
    agentReservedCount(),
  ]);
  return agentSeatSummary({
    cohortSize: COHORT_SIZE,
    maxAgentRatio: MAX_AGENT_RATIO,
    minAgentCount: MIN_AGENT_COUNT,
    // Public surface respects the env flag; admin capacity uses the ratio even when off.
    enabled: forPublic ? AGENTS_ENABLED : true,
    humanCount,
    agentCount,
  });
}

async function getEndgameBreakdown() {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("is_agent, verified_human, eliminated")
    .eq("paid", true);
  if (error || !data) return null;

  const survivors = data.filter((u) => !u.eliminated);
  const verifiedHumans = survivors.filter((u) => !u.is_agent && u.verified_human === true).length;
  const unverifiedHumans = survivors.filter((u) => !u.is_agent && u.verified_human !== true).length;
  const aiAgents = survivors.filter((u) => u.is_agent).length;

  return {
    verifiedHumans,
    unverifiedHumans,
    aiAgents,
    totalSurvivors: survivors.length,
    totalEntered: data.length,
    agentsEntered: data.filter((u) => u.is_agent).length,
  };
}

async function cohortSplitCount() {
  if (!supabaseAdmin) return { paidCount: 0, freeCount: 0, agentCount: 0 };
  const [paid, free, agents] = await Promise.all([
    supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true).eq("entry_kind", "paid").eq("is_agent", false),
    supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true).eq("entry_kind", "free").eq("is_agent", false),
    supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true).eq("is_agent", true),
  ]);
  return {
    paidCount: paid.count ?? 0,
    freeCount: free.count ?? 0,
    agentCount: agents.count ?? 0,
  };
}

// Endgame: the game is over when at most one active player remains AND at
// least one round has actually closed (so a half-empty prelaunch doesn't
// read as a finished game). Cached 30s — this runs on every game/state poll.
let endgameCache = { value: null, fetchedAt: 0 };

// Last day-close stats — used by the DayRecap cinematic overlay.
// Cached 10s (polled every 15s by clients).
let lastDayCloseCache = { value: null, fetchedAt: 0 };

async function getLastDayClose() {
  if (!supabaseAdmin) return null;
  if (Date.now() - lastDayCloseCache.fetchedAt < 10_000) return lastDayCloseCache.value;

  // Find the most recent closed round
  const { data: round } = await supabaseAdmin
    .from("rounds")
    .select("day,status,survival_cap,closing_notified_at")
    .eq("status", "closed")
    .order("day", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!round) {
    lastDayCloseCache = { value: null, fetchedAt: Date.now() };
    return null;
  }

  // Count survivors, eliminated, DQ'd for this day
  const [survivorsRes, eliminatedRes, dqRes] = await Promise.all([
    supabaseAdmin.from("checkins").select("address", { count: "exact", head: true }).eq("day", round.day).eq("survived", true),
    supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("eliminated_at_day", round.day),
    supabaseAdmin.from("checkins").select("address", { count: "exact", head: true }).eq("day", round.day).eq("dq", true),
  ]);

  // Count remaining active players
  const { count: remaining } = await supabaseAdmin
    .from("users")
    .select("address", { count: "exact", head: true })
    .eq("paid", true)
    .eq("eliminated", false);

  const value = {
    day: round.day,
    survivors: survivorsRes.count ?? 0,
    eliminated: eliminatedRes.count ?? 0,
    dq: dqRes.count ?? 0,
    remaining: remaining ?? 0,
    closedAt: round.closing_notified_at ?? null,
  };
  lastDayCloseCache = { value, fetchedAt: Date.now() };
  return value;
}

async function getEndgame() {
  if (!supabaseAdmin) return null;
  if (Date.now() - endgameCache.fetchedAt < 30_000) return endgameCache.value;

  const [active, closed] = await Promise.all([
    supabaseAdmin.from("users").select("address", { count: "exact", head: true }).eq("paid", true).eq("eliminated", false),
    supabaseAdmin.from("rounds").select("day", { count: "exact", head: true }).eq("status", "closed"),
  ]);
  let value = null;
  const activeCount = active.count ?? null;
  if ((closed.count ?? 0) > 0 && activeCount != null && activeCount <= 1) {
    let winner = null;
    if (activeCount === 1) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("address,username")
        .eq("paid", true)
        .eq("eliminated", false)
        .limit(1)
        .maybeSingle();
      if (data) winner = { address: data.address, username: data.username ?? null };
    }
    value = { ended: true, winner };
  }
  endgameCache = { value, fetchedAt: Date.now() };
  return value;
}

app.get("/api/game/state", async (req, res) => {
  try {
    const launchAtMs = GAME_LAUNCH_AT ? Date.parse(GAME_LAUNCH_AT) : null;
    const [reserved, split, agentSeats] = await Promise.all([
      reservedCount(),
      cohortSplitCount(),
      getAgentSeatState({ forPublic: true }),
    ]);

    let phase = "prelaunch";
    let currentDay = null;
    let winner = null;
    if (launchAtMs && Date.now() >= launchAtMs) {
      phase = "live";
      currentDay = currentDayNumber(launchAtMs);
      const endgame = await getEndgame();
      if (endgame?.ended) {
        phase = "ended";
        winner = endgame.winner;
      }
    }

    let round = null;
    let checkinCount = 0;
    let payoutInfo = null;
    let breakdown = null;
    if (phase === "live" && currentDay != null) {
      round = await loadRound(currentDay);
      if (round) checkinCount = await checkinCountForDay(currentDay);
    }
    if (phase === "ended" && supabaseAdmin) {
      const { data: payout } = await supabaseAdmin
        .from("payouts")
        .select("winner_address,amount_usd,token,tx_hash,explorer_url,status,created_at,day")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      payoutInfo = payout || null;
      breakdown = await getEndgameBreakdown();
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
      juryTickets: 0,
      isJury: false,
      juryWeight: 1,
      voteAccuracy: null,
      votesCorrect: 0,
      votesResolved: 0,
      checkinStreak: 0,
    };
    if (address) {
      const u = await getUserRecord(address);
      const ci = currentDay != null ? await userCheckinForDay(currentDay, address) : null;
      const stats = await getVoterStats(address);
      const isJury = Boolean(u?.eliminated) && stats.total >= JURY_MIN_RESOLVED && (stats.accuracy ?? 0) >= JURY_MIN_ACCURACY;
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
        juryTickets: u?.jury_tickets ?? 0,
        isJury,
        juryWeight: isJury ? JURY_WEIGHT : 1,
        voteAccuracy: stats.accuracy,
        votesCorrect: stats.correct,
        votesResolved: stats.total,
        checkinStreak: u?.checkin_streak ?? 0,
        // Own record only — never expose is_agent for other players on public APIs.
        isAgent: Boolean(u?.is_agent),
      };
      if (you.isEliminated && you.eliminatedAtDay) {
        you.eliminationReason = await getEliminationReason(
          supabaseAdmin,
          address,
          you.eliminatedAtDay,
        );
      }
    }

    // When agents are enabled, human seats are capped so agent slots stay reserved.
    const cohortFull = agentSeats.enabled
      ? agentSeats.humansFull
      : reserved >= COHORT_SIZE;
    res.json({
      ok: true,
      now: new Date().toISOString(),
      phase,
      launchAt: GAME_LAUNCH_AT,
      nextCohort: {
        number: 2,
        launchAt: COHORT_2_LAUNCH_AT,
      },
      cohortSize: COHORT_SIZE,
      reservedCount: reserved,
      cohortFull,
      cohort: {
        ...COHORT_CONFIG,
        freeSlots: freeSlotsFor(split.paidCount, COHORT_SIZE),
        paidCount: split.paidCount,
        freeCount: split.freeCount,
        agentCount: split.agentCount,
        humanSlots: agentSeats.humanSlots,
      },
      agents: {
        enabled: agentSeats.enabled,
        maxRatio: agentSeats.maxRatio,
        minCount: agentSeats.minCount,
        maxSlots: agentSeats.maxSlots,
        agentCount: agentSeats.agentCount,
        humanCount: agentSeats.humanCount,
        humanSlots: agentSeats.humanSlots,
        slotsRemaining: agentSeats.slotsRemaining,
      },
      silentVerification: SILENT_VERIFICATION,
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
            survivalCap: round.survival_cap ?? survivalCapForDay(currentDay),
            opensAt: round.opens_at,
            closesAt: round.closes_at,
            status: round.status,
            checkinCount,
            slotsRemaining: Math.max(0, (round.survival_cap ?? survivalCapForDay(currentDay)) - checkinCount),
          }
        : null,
      you,
      winner,
      payout: payoutInfo,
      breakdown,
      lastDayClose: phase === "live" || phase === "ended" ? await getLastDayClose() : null,
      defaults: { survivalCap: DAILY_SURVIVAL_CAP, radiusM: CHECKIN_RADIUS_M },
    });

    // Test-only session bypass: creates a session for any address
    // without SIWE wallet signing. Requires ADMIN_TOKEN. Used by
    // the Daytona E2E test harness to simulate multiple players.
    // Never available without admin auth.
    app.post("/api/test/session", requireAdmin, async (req, res) => {
      const body = ensureObjectBody(req, res);
      if (!body) return;
      try {
        const address = ensureString(body.address, {
          field: "address", required: true, maxLength: 64, pattern: /^0x[a-fA-F0-9]{40}$/,
        });
        const sessionId = await createSessionRecord(address);
        setSessionCookie(res, sessionId);
        res.json({ ok: true, address, sessionId });
      } catch (error) {
        sendValidationError(res, error);
      }
    });

    // Lazy lottery draw — the first /api/game/state call after
    // GAME_LAUNCH_AT triggers the deterministic draw. Idempotent:
    // subsequent calls (and concurrent calls) return the stored
    // result.
    //
    // The draw is HELD until either LOTTERY_MIN_CANDIDATES
    // free-registered humans are signed up OR
    // LOTTERY_MAX_DELAY_HOURS have passed since T-0. This
    // prevents the empty-launch failure mode where the lottery
    // runs on zero entrants at the exact T-0 timestamp.
    if (phase === "live" && supabaseAdmin) {
      try {
        const stored = await getStoredLotteryResult(COHORT_CONFIG.cohort);
        if (!stored) {
          const splitNow = await cohortSplitCount();
          const freeCandidates = splitNow.freeCount;
          const hoursPastLaunch =
            (Date.now() - launchAtMs) / (1000 * 60 * 60);
          const minMet = freeCandidates >= LOTTERY_MIN_CANDIDATES;
          const delayMet = hoursPastLaunch >= LOTTERY_MAX_DELAY_HOURS;
          if (minMet || delayMet) {
            await drawAndStoreLottery({
              cohort: COHORT_CONFIG.cohort,
              drawnBy: "lazy",
            });
            log?.("lottery_lazy_drawn", {
              freeCandidates,
              hoursPastLaunch: Number(hoursPastLaunch.toFixed(2)),
              trigger: minMet && delayMet ? "min+delay" : minMet ? "min" : "delay",
            });
          } else {
            log?.("lottery_lazy_held", {
              freeCandidates,
              hoursPastLaunch: Number(hoursPastLaunch.toFixed(2)),
              minCandidates: LOTTERY_MIN_CANDIDATES,
              maxDelayHours: LOTTERY_MAX_DELAY_HOURS,
            });
          }
        }
      } catch (drawErr) {
        log?.("lottery_lazy_error", { error: drawErr instanceof Error ? drawErr.message : String(drawErr) });
      }
    }
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
        return res.json({ ok: true, alreadyCheckedIn: true, rank: existing.rank, survived: existing.survived, distanceM: existing.distance_m != null ? Math.round(existing.distance_m) : null, survivalCap: round.survival_cap ?? survivalCapForDay(round.day) });
      }

      // Anti-cheat: timing anomaly
      let timingReason = null;
      if (supabaseAdmin) {
        const { data: recent } = await supabaseAdmin.from("checkins").select("address,day,created_at").eq("day", day).order("created_at", { ascending: false }).limit(50);
        timingReason = checkTimingAnomaly(req.user.address, day, recent || []);
        if (timingReason) log("anticheat_flag", { reason: timingReason, address: req.user.address, day });
      }

      // Anti-cheat: velocity spoof — compare with previous check-in GPS
      if (supabaseAdmin && hasUserGps) {
        const { data: prevCheckin } = await supabaseAdmin
          .from("checkins")
          .select("lat,lng,created_at,day")
          .eq("address", req.user.address)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prevCheckin?.lat != null && prevCheckin?.lng != null) {
          const velocityReason = checkVelocitySpoof(
            prevCheckin.lat, prevCheckin.lng, prevCheckin.created_at,
            lat, lng, Date.now(),
          );
          if (velocityReason) {
            log("anticheat_flag", { reason: velocityReason, address: req.user.address, day, prevDay: prevCheckin.day });
          }
        }
      }

      const cap = round.survival_cap ?? survivalCapForDay(round.day);
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
          // Update cohort_participations (the trigger syncs users.eliminated).
          await supabaseAdmin.from("cohort_participations")
            .update({ eliminated: true, eliminated_at_day: day })
            .eq("address", req.user.address)
            .eq("cohort", COHORT_CONFIG.cohort);
          log("checkin_eliminated", { address: req.user.address, day, rank: data?.rank });
        } else {
          log("checkin_survived", { address: req.user.address, day, rank: data?.rank });
        }

        // Track streak: update last_checkin_day on cohort_participations
        // so award_streak_bonuses can compute consecutive check-ins at day close.
        // The trigger syncs this to users.last_checkin_day for backward compat.
        await supabaseAdmin.from("cohort_participations")
          .update({ last_checkin_day: day })
          .eq("address", req.user.address)
          .eq("cohort", COHORT_CONFIG.cohort);

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
      .select("address, username, reserved_at, eliminated, eliminated_at_day, referral_code, referral_count, referred_by, entry_kind, entry_token, cohort, is_agent, agent_tier, verified_human")
      .eq("paid", true)
      .order("reserved_at", { ascending: false })
      .limit(200);
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });

    const roster = data || [];
    // Public roster: strip agent identity + verification so the crowd can't meta-game.
    const publicRoster = roster.map(({ is_agent: _a, agent_tier: _t, verified_human: _v, ...rest }) => rest);
    const paidCount = roster.filter((u) => u.entry_kind === "paid" && !u.is_agent).length;
    const freeCount = roster.filter((u) => u.entry_kind === "free" && !u.is_agent).length;
    return res.json({
      ok: true,
      roster: publicRoster,
      split: {
        cohort: COHORT_CONFIG.cohort,
        size: COHORT_CONFIG.size,
        paidSlots: COHORT_CONFIG.paidSlots,
        freeSlots: freeSlotsFor(paidCount, COHORT_SIZE),
        freeSlotsMax: COHORT_CONFIG.freeSlots,
        paidCount,
        freeCount,
        agentCount: roster.filter((u) => u.is_agent).length,
      },
    });
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

// ─── Startup validation ─────────────────────────────────────────────────
// Validate required configuration at startup so missing env vars are
// loud and obvious (not silently defaulted to broken behaviour).
function validateEnv() {
  const warnings = [];
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY: DB writes will fail silently");
  }
  if (IS_PROD && !process.env.WORLD_APP_ID) {
    warnings.push("WORLD_APP_ID: MiniKit payment / push / wallet-auth commands will fail");
  }
  if (IS_PROD && !process.env.WORLD_DEV_PORTAL_API_KEY) {
    warnings.push("WORLD_DEV_PORTAL_API_KEY: World App payment verification and push notifications will fail");
  }
  if (IS_PROD && !process.env.WORLD_ID_RP_ID) {
    warnings.push("WORLD_ID_RP_ID: World ID verification will not work");
  }
  if (IS_PROD && (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_SECRET)) {
    warnings.push("VAPID keys: push notifications will fail");
  }
  if (IS_PROD && !process.env.ALLOWED_ORIGINS) {
    warnings.push("ALLOWED_ORIGINS: CORS will reject all browser requests");
  }
  if (IS_PROD && !process.env.GAME_LAUNCH_AT) {
    warnings.push("GAME_LAUNCH_AT: game will never enter live phase");
  }
  if (IS_PROD && !process.env.ADMIN_ADDRESS && !process.env.ADMIN_TOKEN) {
    warnings.push("ADMIN_ADDRESS or ADMIN_TOKEN: no admin access configured");
  }
  for (const w of warnings) {
    console.error(JSON.stringify({ time: new Date().toISOString(), event: "env_warning", warning: w }));
  }
  return warnings;
}

/**
 * Health check with actual DB connectivity test.
 * Returns { ok, supabase, error } for the /api/health endpoint.
 */
async function checkDatabaseHealth() {
  if (!supabaseAdmin) return { ok: false, error: "supabase_not_configured" };
  try {
    const { error } = await supabaseAdmin.from("users").select("address", { count: "exact", head: true }).limit(1);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

// =============== Lottery ===============
// Deterministic draw for the free cohort slots. Read-only status
// endpoint for clients; admin-only draw endpoint. The lazy draw
// in /api/game/state triggers it once at GAME_LAUNCH_AT.

let lotteryInFlight = null;

async function getStoredLotteryResult(cohort) {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("lottery_results")
    .select("cohort, seed, algorithm_version, free_slots, candidates, drawn, drawn_at, drawn_by")
    .eq("cohort", cohort)
    .maybeSingle();
  if (error) return null;
  return data;
}

/**
 * Compute the actual free-lottery slot count at draw time.
 * Pure math lives in `freeSlotsFor`; this just queries the live
 * paid count and hands off.
 */
async function computeFreeLotterySlots(cohort) {
  if (!supabaseAdmin) return COHORT_CONFIG.freeSlots;
  const { count } = await supabaseAdmin
    .from("users")
    .select("address", { count: "exact", head: true })
    .eq("paid", true)
    .eq("entry_kind", "paid")
    .eq("cohort", cohort);
  return freeSlotsFor(count ?? 0, COHORT_SIZE);
}

async function drawAndStoreLottery({ cohort, drawnBy = "lazy" }) {
  if (!supabaseAdmin) return null;
  if (!GAME_LAUNCH_AT) {
    throw new Error("GAME_LAUNCH_AT not set; cannot seed lottery");
  }
  if (lotteryInFlight) return lotteryInFlight;

  lotteryInFlight = (async () => {
    // Resolve the actual slot count at draw time, not at request
    // time — paid signups can land between the lazy trigger and
    // the actual draw.
    const freeSlots = await computeFreeLotterySlots(cohort);

    // Pull every free-registered candidate for this cohort. We sort
    // by reserved_at so the seed is the only source of randomness
    // (the order is otherwise arbitrary). referral_count and
    // jury_tickets weight the draw (lottery algorithm v2).
    const { data: candidates, error } = await supabaseAdmin
      .from("users")
      .select("address, username, referral_count, jury_tickets")
      .eq("paid", true)
      .eq("entry_kind", "free")
      .eq("cohort", cohort)
      .order("reserved_at", { ascending: true });
    if (error) throw error;

    const result = drawLottery(candidates || [], {
      launchAtIso: GAME_LAUNCH_AT,
      cohort,
      slots: freeSlots,
    });

    // Persist the canonical draw. ON CONFLICT DO NOTHING so a
    // double-call (admin endpoint after lazy) is idempotent.
    const { error: insertErr } = await supabaseAdmin
      .from("lottery_results")
      .upsert(
        {
          cohort,
          seed: result.seed,
          algorithm_version: result.algorithmVersion,
          free_slots: result.slots,
          candidates: result.candidates,
          drawn: result.drawn,
          drawn_at: new Date().toISOString(),
          drawn_by: drawnBy,
        },
        { onConflict: "cohort", ignoreDuplicates: true },
      );
    if (insertErr) {
      log?.("lottery_persist_error", { error: insertErr.message });
    }

    // Mark the losers as cohort 2 priority so we don't lose them.
    if (result.rolledToCohort2.length > 0) {
      const losers = result.rolledToCohort2.map((u) => u.address);
      await supabaseAdmin
        .from("users")
        .update({ cohort: 2 })
        .in("address", losers)
        .then(({ error: rollErr }) => {
          if (rollErr) log?.("lottery_rollover_error", { error: rollErr.message });
        });
    }

    log?.("lottery_drawn", {
      cohort,
      seed: result.seed,
      algorithm: result.algorithmVersion,
      candidates: result.candidates,
      slots: result.slots,
      drawnBy,
    });
    return result;
  })();

  try {
    return await lotteryInFlight;
  } finally {
    lotteryInFlight = null;
  }
}

// =============== Debug endpoints (admin only) ===============
// Returns raw RPC results for the Celo pool address so we can
// see why the UI shows "—". Gated by ADMIN_TOKEN or a valid
// session cookie, since it exposes the prize-pool balances.
app.get("/api/debug/celo-balances", requireAuth, async (req, res) => {
  try {
    const address = String(req.query.address || "");
    if (!address) return res.status(400).json({ error: "address_required" });
    const result = await debugCeloBalances(address);
    return res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ error: "debug_failed", message: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/lottery/status", async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const cohort = Number(req.query.cohort) || COHORT_CONFIG.cohort;
    const stored = await getStoredLotteryResult(cohort);

    // Count free-registered users so the client can show
    // "12 / 25 free slots filled" before the draw.
    const { count: freeRegistered } = await supabaseAdmin
      .from("users")
      .select("address", { count: "exact", head: true })
      .eq("paid", true)
      .eq("entry_kind", "free")
      .eq("cohort", cohort);

    const launchAtMs = GAME_LAUNCH_AT ? Date.parse(GAME_LAUNCH_AT) : null;
    const now = Date.now();
    const pastLaunch = launchAtMs != null && now >= launchAtMs;

    // Live count so the client can show the right number of free
    // slots. Computed from the same logic the draw uses.
    const liveFreeSlots = await computeFreeLotterySlots(cohort);
    // Lazy draw gating: estimate when the draw will actually
    // fire. The draw fires when EITHER LOTTERY_MIN_CANDIDATES
    // humans are signed up OR LOTTERY_MAX_DELAY_HOURS have
    // passed since T-0. We surface the earlier of the two as
    // nextDrawAtMs so the client can show a countdown.
    const maxDelayMs = LOTTERY_MAX_DELAY_HOURS * 60 * 60 * 1000;
    const candidatesMs = freeRegistered >= LOTTERY_MIN_CANDIDATES
      ? now
      : null;
    const delayMs = pastLaunch && launchAtMs != null
      ? launchAtMs + maxDelayMs
      : null;
    const nextDrawAtMs = [candidatesMs, delayMs].filter((v) => v != null).sort((a, b) => a - b)[0] ?? null;

    return res.json({
      ok: true,
      cohort,
      drawAt: GAME_LAUNCH_AT,
      status: stored ? "drawn" : pastLaunch ? "pending" : "scheduled",
      freeSlots: liveFreeSlots,
      freeSlotsMax: COHORT_CONFIG.freeSlots,
      paidSlots: COHORT_CONFIG.paidSlots,
      freeRegistered: freeRegistered ?? 0,
      minCandidates: LOTTERY_MIN_CANDIDATES,
      maxDelayHours: LOTTERY_MAX_DELAY_HOURS,
      nextDrawAt: nextDrawAtMs ? new Date(nextDrawAtMs).toISOString() : null,
      seed: stored?.seed ?? null,
      algorithmVersion: stored?.algorithm_version ?? ALGORITHM_VERSION,
      drawn: stored?.drawn ?? null,
      drawnAt: stored?.drawn_at ?? null,
      drawnBy: stored?.drawn_by ?? null,
    });
  } catch (e) {
    res.status(400).json({ error: "lottery_status_failed", message: e instanceof Error ? e.message : "unknown_error" });
  }
});

app.post("/api/lottery/draw", requireAdmin, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
    const cohort = Number(req.body?.cohort) || COHORT_CONFIG.cohort;
    const existing = await getStoredLotteryResult(cohort);
    if (existing) {
      return res.json({ ok: true, alreadyDrawn: true, result: existing });
    }
    const result = await drawAndStoreLottery({
      cohort,
      drawnBy: req.user?.address || "admin",
    });
    return res.json({ ok: true, result });
  } catch (e) {
    log?.("lottery_draw_error", { error: e instanceof Error ? e.message : "unknown" });
    res.status(400).json({ error: "lottery_draw_failed", message: e instanceof Error ? e.message : "unknown_error" });
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

// Extracted winner payout logic — shared between autoAdvanceRounds and admin close-day
async function handleWinnerPayout(day, winnerAddr) {
  if (!supabaseAdmin) return;
  try {
    await supabaseAdmin.rpc("record_winner", { p_day: day, p_winner_address: winnerAddr });
    log("winner_recorded", { day, winner: winnerAddr });

    // Prevent double-payout
    const { data: existingPayout } = await supabaseAdmin
      .from("payouts")
      .select("id,status")
      .eq("winner_address", winnerAddr)
      .in("status", ["pending", "submitted", "confirmed"])
      .limit(1)
      .maybeSingle();

    if (existingPayout) {
      log("payout_skipped", { winner: winnerAddr, reason: "already_pending_or_paid" });
      return;
    }

    // Get prize pool balance
    const celoPrizePoolAddress = process.env.VITE_CELO_PRIZE_POOL_ADDRESS;
    let amountUsd = 0;
    if (celoPrizePoolAddress) {
      try {
        const pot = await fetchCeloPot(celoPrizePoolAddress);
        amountUsd = pot?.totalUsd ?? pot?.usd ?? 0;
      } catch (e) {
        log("payout_balance_error", { error: String(e) });
      }
    }

    // Record pending payout
    const { data: payoutRow } = await supabaseAdmin
      .from("payouts")
      .insert({ winner_address: winnerAddr, amount_usd: amountUsd, token: "cUSD", status: "pending", cohort: 1, day })
      .select("id")
      .single();
    const payoutId = payoutRow?.id;

    if (amountUsd > 0) {
      log("payout_attempt", { winner: winnerAddr, amountUsd, payoutId });
      const result = await ariaBroadcastPayoutTx({ winnerAddress: winnerAddr, amountUsd, token: "cUSD" });
      if (result.ok) {
        await supabaseAdmin.from("payouts").update({ status: "submitted", tx_hash: result.txHash, explorer_url: result.explorerUrl }).eq("id", payoutId);
        log("payout_success", { winner: winnerAddr, txHash: result.txHash, amountUsd });
        sendPushToAddress(supabaseAdmin, winnerAddr, {
          title: "🏆 You won!", body: `Prize of ${amountUsd} cUSD sent. Tx: ${result.explorerUrl}`,
          data: { type: "payout", txHash: result.txHash, amountUsd },
        }).catch(() => {});
      } else {
        await supabaseAdmin.from("payouts").update({ status: "failed", error: result.reason }).eq("id", payoutId);
        log("payout_failed", { winner: winnerAddr, reason: result.reason });
      }
    } else {
      await supabaseAdmin.from("payouts").update({ status: "failed", error: "zero_prize_pool_balance" }).eq("id", payoutId);
      log("payout_skipped", { winner: winnerAddr, reason: "zero_balance" });
    }
  } catch (e) {
    log("winner_payout_error", { day, winner: winnerAddr, error: String(e) });
  }
}

// Payout status endpoint — public, shows whether the winner has been paid
app.get("/api/payout/status", async (req, res) => {
  if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });
  try {
    const { data, error } = await supabaseAdmin
      .from("payouts")
      .select("winner_address,amount_usd,token,tx_hash,explorer_url,status,created_at,day")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return res.status(400).json({ error: "db_read_failed", message: error.message });
    return res.json({ ok: true, payout: data || null });
  } catch (e) {
    return res.status(400).json({ error: "payout_status_failed", message: e instanceof Error ? e.message : "unknown" });
  }
});

app.use("/api", adminRoutes({
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
  clearEndgameCache: () => { endgameCache = { value: null, fetchedAt: 0 }; },
}));

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
  rateLimit,
  rateLimitStorage,
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
  getSessionRecord,
  SESSION_COOKIE,
  rateLimitStorage,
}));

app.use("/api", profileRoutes({ requireAuth, supabaseAdmin, log, rateLimit, rateLimitStorage }));
app.use("/api", telegramRoutes({ supabaseAdmin, log }));

app.use("/api", referralRoutes({ supabaseAdmin }));
app.use("/api", ariaRoutes({ requireAuth, requireAdmin, log }));
app.use("/api", activityRoutes({ supabaseAdmin, log }));
app.use("/", farcasterRoutes({ supabaseAdmin, log }));
app.use("/api", shareRoutes({ supabaseAdmin, log }));
app.use("/api", agentRoutes({
  requireAuth, supabaseAdmin, log, rateLimitStorage,
  getAgentSeatState, upsertPaidUser, COHORT_CONFIG, AGENTS_ENABLED,
}));

// ─── Global error handlers ──────────────────────────────────────────────
// 404 catch-all — any unmatched /api/* path returns JSON, not HTML.
// We check req.path here instead of using a wildcard pattern because
// Express 5 / path-to-regexp v8 removed the bare `*` token.
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "not_found", path: req.originalUrl });
  }
  next();
});

// Global Express error handler — catches errors thrown (or passed via next(err))
// from any route above. Without this, Express 5's default handler sends
// HTML stack traces, which leak internals in production.
app.use((err, req, res, _next) => {
  log("express_error", {
    method: req.method,
    path: req.originalUrl,
    message: err instanceof Error ? err.message : String(err),
  });
  res.status(err.status || 500).json({
    error: "internal_error",
    message: IS_PROD ? "Something went wrong" : (err instanceof Error ? err.message : "unknown_error"),
  });
});

// Sentry Express error handler — must be after all routes and the
// built-in error handler, and before app.listen.
if (SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

export { app };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}
