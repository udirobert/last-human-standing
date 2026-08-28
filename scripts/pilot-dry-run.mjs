/**
 * Gate 1 operator dry run against production.
 * Requires ENABLE_TEST_ROUTES=true and GAME_LAUNCH_AT in the past (set by pilot-dry-run.sh).
 */
import { privateKeyToAccount } from "viem/accounts";

const API = process.env.LHS_API_URL || "https://lasthumanstanding.thisyearnofear.com";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const DAY = 1;

const alphaAccount = privateKeyToAccount(`0x${"11".repeat(32)}`);
const betaAccount = privateKeyToAccount(`0x${"22".repeat(32)}`);
const unverifiedAccount = privateKeyToAccount(`0x${"33".repeat(32)}`);

const ALPHA = alphaAccount.address;
const BETA = betaAccount.address;
const UNVERIFIED = unverifiedAccount.address;

if (!ADMIN_TOKEN) {
  console.error("ADMIN_TOKEN required");
  process.exit(1);
}

const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function adminFetch(path, opts = {}) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
      ...(opts.headers || {}),
    },
  });
}

async function sessionFor(address) {
  const resp = await adminFetch("/api/test/session", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
  if (!resp.ok) throw new Error(`test/session ${resp.status}: ${await resp.text()}`);
  const cookie = resp.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { address, cookie };
}

async function authed(session, path, opts = {}) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
      ...(opts.headers || {}),
    },
  });
}

async function main() {
  console.log(`=== Pilot dry run — ${API} ===`);

  const health = await (await fetch(`${API}/api/health`)).json();
  record("health", health.ok === true, health.supabase ? "supabase ok" : "supabase down");

  const probe = await adminFetch("/api/test/session", {
    method: "POST",
    body: JSON.stringify({ address: ALPHA }),
  });
  record("test/session registered", probe.status !== 404, `status ${probe.status}`);

  const state0 = await (await fetch(`${API}/api/game/state`)).json();
  record("phase live", state0.phase === "live", `phase=${state0.phase} day=${state0.currentDay}`);

  const now = Date.now();
  const opensAt = new Date(now - 60_000).toISOString();
  // Two-phase round (Riddle Rounds §2): reveal_at starts in the future so the
  // hunt (check-in + submit) is open. We flip it to the past after submissions
  // to open the vote window, simulating the T+18h phase transition.
  const revealAt = new Date(now + 45 * 60_000).toISOString();
  const closesAt = new Date(now + 90 * 60_000).toISOString();
  const roundResp = await adminFetch("/api/admin/round", {
    method: "POST",
    body: JSON.stringify({
      day: DAY,
      name: "DRY RUN — AT A CAFÉ",
      prompt: "Operator dry run only",
      place_type: "AT A CAFÉ",
      survival_cap: 1,
      opens_at: opensAt,
      reveal_at: revealAt,
      closes_at: closesAt,
      status: "scheduled",
    }),
  });
  record("admin round upsert", roundResp.ok, await roundResp.text().then((t) => t.slice(0, 120)));

  await adminFetch("/api/admin/trigger-rounds", { method: "POST" });
  await new Promise((r) => setTimeout(r, 1500));

  const unverified = await sessionFor(UNVERIFIED);
  const unverifiedLoc = await authed(unverified, "/api/checkin/location", {
    method: "POST",
    body: JSON.stringify({ lat: 40.71, lng: -74.0, accuracy: 10 }),
  });
  record(
    "unverified rejected at check-in",
    unverifiedLoc.status === 403,
    `status ${unverifiedLoc.status}`,
  );

  const alpha = await sessionFor(ALPHA);
  const beta = await sessionFor(BETA);

  const aLoc = await authed(alpha, "/api/checkin/location", {
    method: "POST",
    body: JSON.stringify({ lat: 40.7128, lng: -74.006, accuracy: 8 }),
  });
  record("alpha check-in location", aLoc.ok, `status ${aLoc.status} ${aLoc.ok ? "" : await aLoc.clone().text()}`);

  const bLoc = await authed(beta, "/api/checkin/location", {
    method: "POST",
    body: JSON.stringify({ lat: 40.713, lng: -74.007, accuracy: 8 }),
  });
  record("beta check-in location", bLoc.ok, `status ${bLoc.status} ${bLoc.ok ? "" : await bLoc.clone().text()}`);

  const sig = "dry-run-signature";
  const alphaSig = await alphaAccount.signMessage({ message: sig });
  const aSub = await authed(alpha, "/api/checkin", {
    method: "POST",
    body: JSON.stringify({
      day: DAY,
      theme: "DRY RUN",
      message: sig,
      signature: alphaSig,
      address: ALPHA,
      photoHash: "0x" + "aa".repeat(32),
    }),
  });
  const aSubBody = aSub.ok ? await aSub.json() : null;
  record("alpha photo submit", aSub.ok, `status ${aSub.status}`);

  const betaSig = await betaAccount.signMessage({ message: sig });
  const bSub = await authed(beta, "/api/checkin", {
    method: "POST",
    body: JSON.stringify({
      day: DAY,
      theme: "DRY RUN",
      message: sig,
      signature: betaSig,
      address: BETA,
      photoHash: "0x" + "bb".repeat(32),
    }),
  });
  record("beta photo submit", bSub.ok, `status ${bSub.status}`);

  const alphaSubId = aSubBody?.submission?.id ?? aSubBody?.id;
  let alphaSub = alphaSubId ? { id: alphaSubId, address: ALPHA } : null;
  if (!alphaSub) {
    await new Promise((r) => setTimeout(r, 500));
    const feed = await (await fetch(`${API}/api/feed`)).json();
    alphaSub = (feed.submissions || []).find((s) => s.address?.toLowerCase() === ALPHA.toLowerCase());
  }
  record("alpha submission id resolved", Boolean(alphaSub?.id), alphaSub ? `id=${alphaSub.id}` : "missing");

  // Simulate the T+18h phase transition: flip reveal_at into the past so the
  // vote window opens (Riddle Rounds §2.3). In production the scheduler's
  // revealDueSpecs() does this at the real reveal_at.
  const flipResp = await adminFetch("/api/admin/round", {
    method: "POST",
    body: JSON.stringify({
      day: DAY,
      name: "DRY RUN — AT A CAFÉ",
      prompt: "Operator dry run only",
      place_type: "AT A CAFÉ",
      survival_cap: 1,
      opens_at: opensAt,
      reveal_at: new Date(now - 30_000).toISOString(),
      closes_at: closesAt,
      status: "open",
    }),
  });
  record("reveal phase flip", flipResp.ok, `status ${flipResp.status}`);

  const selfVote = await authed(alpha, "/api/vote", {
    method: "POST",
    body: JSON.stringify({ submissionId: alphaSub?.id, vote: "real" }),
  });
  record("self-vote rejected", selfVote.status === 403, `status ${selfVote.status}`);

  const crossVote = await authed(beta, "/api/vote", {
    method: "POST",
    body: JSON.stringify({ submissionId: alphaSub?.id, vote: "real" }),
  });
  record("beta votes on alpha", crossVote.ok, `status ${crossVote.status}`);

  if (alphaSub?.id) {
    // Second vote from an exhibition agent session isn't available here; one vote
    // is enough to prove the vote path works when quorum is low.
  }

  const close = await adminFetch("/api/admin/close-day", {
    method: "POST",
    body: JSON.stringify({ day: DAY }),
  });
  const closeBody = await close.json();
  record("close-day", close.ok, JSON.stringify(closeBody).slice(0, 160));

  const payoutProbe = await adminFetch("/api/admin/retry-payout", {
    method: "POST",
    body: JSON.stringify({ winnerAddress: ALPHA }),
  });
  record(
    "auto payout blocked",
    payoutProbe.status === 403,
    `status ${payoutProbe.status}`,
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== ${results.length - failed.length}/${results.length} passed ===`);
  if (failed.length) {
    console.error("Failures:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
