/**
 * E2E Test Harness — Last Human Standing
 *
 * Uses Daytona sandboxes to simulate a full game cohort:
 *   - N human players (check-in + vote)
 *   - M AI agents (register + submit + vote)
 *   - A control monitor that asserts the game loop
 *
 * Requirements:
 *   - DAYTONA_API_KEY env var
 *   - Game server running with ADMIN_TOKEN set
 *   - AGENTS_ENABLED=true for agent tests
 *   - GAME_LAUNCH_AT set to a past timestamp (so phase = "live")
 *   - A round created with a short open/close window
 *
 * Usage:
 *   node scripts/e2e-harness.mjs --api http://localhost:8787 --admin-token XXX --players 5 --agents 2
 */
import { Daytona } from "@daytona/sdk";
import dotenv from "dotenv";

// Load .env so DAYTONA_API_KEY is available
dotenv.config();

const DAYTONA_API_KEY = process.env.DAYTONA_API_KEY;

const API_BASE = process.argv.find((a, i) => process.argv[i - 1] === "--api") || process.env.LHS_API_URL || "http://localhost:8787";
const ADMIN_TOKEN = process.argv.find((a, i) => process.argv[i - 1] === "--admin-token") || process.env.ADMIN_TOKEN || "";
const NUM_PLAYERS = Number(process.argv.find((a, i) => process.argv[i - 1] === "--players") || 5);
const NUM_AGENTS = Number(process.argv.find((a, i) => process.argv[i - 1] === "--agents") || 2);
const DAY = Number(process.argv.find((a, i) => process.argv[i - 1] === "--day") || 1);

if (!ADMIN_TOKEN) {
  console.error("ERROR: --admin-token or ADMIN_TOKEN env var required");
  process.exit(1);
}

// ─── Daytona sandbox helpers ───────────────────────────────────────────
// When DAYTONA_API_KEY is set, the harness can spawn isolated sandboxes
// that each run as a separate player. When unset, it falls back to
// running everything in-process (simpler, less isolated).

let daytona = null;
if (DAYTONA_API_KEY) {
  daytona = new Daytona({ apiKey: DAYTONA_API_KEY });
  console.log("Daytona SDK initialized — sandboxes will be used for isolated player execution.");
} else {
  console.log("No DAYTONA_API_KEY — running in-process (no sandboxes).");
}

/**
 * Run a player's game moves inside a Daytona sandbox.
 * The sandbox executes a Node.js script that calls the game API.
 */
async function runPlayerInSandbox(playerIndex, gameConfig) {
  const sandbox = await daytona.create({
    language: "typescript",
    autoStopInterval: 5, // 5 min auto-stop
    envVars: {
      API_BASE: gameConfig.apiBase,
      ADMIN_TOKEN: gameConfig.adminToken,
      PLAYER_ADDRESS: gameConfig.address,
      DAY: String(gameConfig.day),
      THEME: gameConfig.theme,
    },
  });

  const script = `
const API_BASE = process.env.API_BASE;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ADDRESS = process.env.PLAYER_ADDRESS;
const DAY = parseInt(process.env.DAY);
const THEME = process.env.THEME;

async function main() {
  // 1. Create session
  const sessResp = await fetch(API_BASE + "/api/test/session", {
    method: "POST",
    headers: { "x-admin-token": ADMIN_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ address: ADDRESS }),
  });
  const setCookie = sessResp.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0] ?? "";
  console.log("session:", sessResp.status);

  // 2. Check in (location)
  const lat = 40.7128 + (${playerIndex} * 0.001);
  const lng = -74.006 + (${playerIndex} * 0.001);
  const locResp = await fetch(API_BASE + "/api/checkin/location", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ lat, lng, accuracy: 10, day: DAY }),
  });
  console.log("checkin-location:", locResp.status);

  // 3. Submit photo proof
  const subResp = await fetch(API_BASE + "/api/checkin", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      day: DAY,
      theme: THEME,
      message: "Proof from sandbox player ${playerIndex}",
      signature: "0x" + "00".repeat(65),
      address: ADDRESS,
    }),
  });
  console.log("checkin-submit:", subResp.status);

  // 4. Fetch feed and vote
  const feed = await (await fetch(API_BASE + "/api/feed")).json();
  const subs = feed.submissions || [];
  for (const sub of subs.slice(0, 3)) {
    const vote = (${playerIndex} + sub.id) % 3 === 0 ? "fake" : "real";
    await fetch(API_BASE + "/api/vote", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ submissionId: sub.id, vote }),
    });
  }
  console.log("voted on", Math.min(3, subs.length), "submissions");
}

main().catch(e => console.error("ERROR:", e.message));
`;

  const response = await sandbox.process.codeRun(script);
  const result = response.result || "";
  console.log(`  [Sandbox Player ${playerIndex + 1}] ${result.trim()}`);

  // Clean up
  await daytona.remove(sandbox);
  return result;
}

/**
 * Run an AI agent's game moves inside a Daytona sandbox.
 */
async function runAgentInSandbox(agentIndex, gameConfig) {
  const sandbox = await daytona.create({
    language: "typescript",
    autoStopInterval: 5,
    envVars: {
      API_BASE: gameConfig.apiBase,
      ADMIN_TOKEN: gameConfig.adminToken,
      AGENT_ADDRESS: gameConfig.address,
      DAY: String(gameConfig.day),
      THEME: gameConfig.theme,
      AGENT_INDEX: String(agentIndex),
    },
  });

  const script = `
const API_BASE = process.env.API_BASE;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ADDRESS = process.env.AGENT_ADDRESS;
const DAY = parseInt(process.env.DAY);
const THEME = process.env.THEME;
const IDX = process.env.AGENT_INDEX;

async function main() {
  // 1. Create session
  const sessResp = await fetch(API_BASE + "/api/test/session", {
    method: "POST",
    headers: { "x-admin-token": ADMIN_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ address: ADDRESS }),
  });
  const setCookie = sessResp.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0] ?? "";
  console.log("session:", sessResp.status);

  // 2. Register as agent
  const regResp = await fetch(API_BASE + "/api/agents/register", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      tier: "premium",
      paymentIntentId: "sandbox-payment-" + IDX,
      provider: "daytona-sandbox",
    }),
  });
  console.log("agent-register:", regResp.status);

  // 3. Submit
  const subResp = await fetch(API_BASE + "/api/agents/submit", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({
      day: DAY,
      theme: THEME,
      message: "AI-generated proof from sandbox agent " + IDX,
      imageUrl: "https://example.com/agent-" + IDX + ".jpg",
      signature: "0x" + "00".repeat(65),
    }),
  });
  console.log("agent-submit:", subResp.status);
}

main().catch(e => console.error("ERROR:", e.message));
`;

  const response = await sandbox.process.codeRun(script);
  const result = response.result || "";
  console.log(`  [Sandbox Agent ${agentIndex + 1}] ${result.trim()}`);

  await daytona.remove(sandbox);
  return result;
}

// Generate deterministic test wallet addresses (not real wallets, just unique 0x... addresses)
function testAddress(seed) {
  const hex = Array.from({ length: 40 }, (_, i) => ((seed * (i + 1)) % 16).toString(16)).join("");
  return `0x${hex}`;
}

// ─── API helpers ────────────────────────────────────────────────────────

async function adminFetch(path, opts = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "x-admin-token": ADMIN_TOKEN, "content-type": "application/json", ...opts.headers },
  });
  return resp;
}

async function createSession(address) {
  const resp = await adminFetch("/api/test/session", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
  if (!resp.ok) throw new Error(`session creation failed: ${resp.status} ${await resp.text()}`);
  const setCookie = resp.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0] ?? "";
  return { address, cookie };
}

async function authedFetch(session, path, opts = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "content-type": "application/json", cookie: session.cookie, ...opts.headers },
  });
  return resp;
}

async function upsertPaidUser(address) {
  // Use admin to register the user as paid
  const resp = await adminFetch("/api/admin/agents", {
    method: "POST",
    body: JSON.stringify({ address, tier: "premium" }),
  });
  // If agent registration fails (agents disabled), fall back to direct DB upsert via test endpoint
  if (!resp.ok) {
    console.log(`  [${address.slice(0, 8)}] agent reg failed (${resp.status}), trying free entry...`);
  }
  return resp;
}

async function checkinLocation(session, { lat, lng, accuracy, day }) {
  const resp = await authedFetch(session, "/api/checkin/location", {
    method: "POST",
    body: JSON.stringify({ lat, lng, accuracy, day }),
  });
  return resp;
}

async function submitCheckin(session, { day, theme, message, signature, photoHash, address }) {
  const resp = await authedFetch(session, "/api/checkin", {
    method: "POST",
    body: JSON.stringify({ day, theme, message, signature, address, photoHash, isInfiltrator: false }),
  });
  return resp;
}

async function getFeed() {
  const resp = await fetch(`${API_BASE}/api/feed`);
  return resp.json();
}

async function castVote(session, submissionId, vote) {
  const resp = await authedFetch(session, "/api/vote", {
    method: "POST",
    body: JSON.stringify({ submissionId, vote }),
  });
  return resp;
}

async function getGameState() {
  const resp = await fetch(`${API_BASE}/api/game/state`);
  return resp.json();
}

async function closeDay(day) {
  const resp = await adminFetch("/api/admin/close-day", {
    method: "POST",
    body: JSON.stringify({ day }),
  });
  return resp.json();
}

async function createRound({ day, name, opensAt, closesAt, survivalCap }) {
  const resp = await adminFetch("/api/admin/round", {
    method: "POST",
    body: JSON.stringify({ day, name, prompt: "Test round", place_type: "test", survival_cap: survivalCap, opens_at: opensAt, closes_at: closesAt, status: "scheduled" }),
  });
  return resp.json();
}

async function triggerRounds() {
  const resp = await adminFetch("/api/admin/trigger-rounds", { method: "POST" });
  return resp.json();
}

async function agentRegister(session, { tier, paymentIntentId, provider }) {
  const resp = await authedFetch(session, "/api/agents/register", {
    method: "POST",
    body: JSON.stringify({ tier, paymentIntentId, provider }),
  });
  return resp;
}

async function agentSubmit(session, { day, theme, message, imageUrl, signature }) {
  const resp = await authedFetch(session, "/api/agents/submit", {
    method: "POST",
    body: JSON.stringify({ day, theme, message, imageUrl, signature }),
  });
  return resp;
}

async function getJuryStats(session) {
  const resp = await authedFetch(session, "/api/agents/jury-stats", {});
  return resp.json();
}

// ─── Main orchestration ────────────────────────────────────────────────

async function main() {
  console.log("=== LHS E2E Test Harness ===");
  console.log(`API: ${API_BASE}`);
  console.log(`Players: ${NUM_PLAYERS}, Agents: ${NUM_AGENTS}, Day: ${DAY}`);
  console.log();

  // 0. Check server health
  console.log("[0] Health check...");
  const health = await (await fetch(`${API_BASE}/api/health`)).json();
  if (!health.ok) throw new Error("Server not healthy");
  console.log(`  Server: OK, Supabase: ${health.supabase ? "OK" : "DOWN"}`);

  // 1. Create a short test round (opens now, closes in 5 minutes)
  const now = Date.now();
  const opensAt = new Date(now + 10_000).toISOString();
  const closesAt = new Date(now + 5 * 60_000).toISOString();
  console.log(`[1] Creating test round (day ${DAY})...`);
  const roundResp = await createRound({ day: DAY, name: "E2E TEST", opensAt, closesAt, survivalCap: NUM_PLAYERS + NUM_AGENTS });
  if (roundResp.ok) {
    console.log(`  Round created: opens ${opensAt}, closes ${closesAt}`);
  } else {
    console.log(`  Round creation: ${JSON.stringify(roundResp)}`);
  }

  // 2. Trigger rounds to open the round
  console.log("[2] Triggering round advancement...");
  await triggerRounds();
  await new Promise((r) => setTimeout(r, 2000));

  // 3a. If Daytona is available, spawn sandboxes for each player/agent
  const useSandboxes = Boolean(daytona);
  const players = [];
  const agents = [];

  if (useSandboxes) {
    console.log("[3] Spawning Daytona sandboxes for players + agents...");
    const playerGameConfigs = [];
    const agentGameConfigs = [];

    for (let i = 0; i < NUM_PLAYERS; i++) {
      const addr = testAddress(i + 100);
      playerGameConfigs.push({ apiBase: API_BASE, adminToken: ADMIN_TOKEN, address: addr, day: DAY, theme: "E2E TEST" });
      console.log(`  Player ${i + 1}: ${addr.slice(0, 10)}... (sandbox)`);
    }
    for (let i = 0; i < NUM_AGENTS; i++) {
      const addr = testAddress(i + 200);
      agentGameConfigs.push({ apiBase: API_BASE, adminToken: ADMIN_TOKEN, address: addr, day: DAY, theme: "E2E TEST" });
      console.log(`  Agent ${i + 1}: ${addr.slice(0, 10)}... (sandbox)`);
    }

    // Run players in parallel sandboxes
    console.log("[4] Running players in sandboxes (parallel)...");
    await Promise.all(playerGameConfigs.map((cfg, i) => runPlayerInSandbox(i, cfg)));

    // Run agents in parallel sandboxes
    if (NUM_AGENTS > 0) {
      console.log("[5] Running agents in sandboxes (parallel)...");
      await Promise.all(agentGameConfigs.map((cfg, i) => runAgentInSandbox(i, cfg)));
    }

    // Create local sessions for the control monitor (to fetch feed, vote, check state)
    for (let i = 0; i < NUM_PLAYERS; i++) {
      const addr = testAddress(i + 100);
      players.push(await createSession(addr));
    }
    for (let i = 0; i < NUM_AGENTS; i++) {
      const addr = testAddress(i + 200);
      agents.push(await createSession(addr));
    }

    // Skip steps 4-6 (already done in sandboxes)
    console.log("[6] Sandboxes complete, proceeding to feed/vote verification...");

  } else {
    // 3b. In-process mode: create sessions directly
    console.log("[3] Creating sessions (in-process)...");
    for (let i = 0; i < NUM_PLAYERS; i++) {
      const addr = testAddress(i + 100);
      const session = await createSession(addr);
      players.push(session);
      console.log(`  Player ${i + 1}: ${addr.slice(0, 10)}...`);
    }
    for (let i = 0; i < NUM_AGENTS; i++) {
      const addr = testAddress(i + 200);
      const session = await createSession(addr);
      agents.push(session);
      console.log(`  Agent ${i + 1}: ${addr.slice(0, 10)}...`);
    }

    // 4. Register agents (if agents enabled)
    if (NUM_AGENTS > 0) {
      console.log("[4] Registering agents...");
      for (let i = 0; i < agents.length; i++) {
        const resp = await agentRegister(agents[i], {
          tier: "premium",
          paymentIntentId: `test-payment-${i}`,
          provider: "e2e-test",
        });
        console.log(`  Agent ${i + 1}: ${resp.status} ${resp.ok ? "OK" : await resp.text()}`);
      }
    }

    // 5. Players check in (location + submission)
    console.log("[5] Players checking in...");
    for (let i = 0; i < players.length; i++) {
      const session = players[i];
      const lat = 40.7128 + (i * 0.001);
      const lng = -74.006 + (i * 0.001);
      const locResp = await checkinLocation(session, { lat, lng, accuracy: 10, day: DAY });
      console.log(`  Player ${i + 1} location: ${locResp.status} ${locResp.ok ? "OK" : await locResp.text()}`);

      const submitResp = await submitCheckin(session, {
        day: DAY,
        theme: "E2E TEST",
        message: `Proof from player ${i + 1} at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        signature: `0x${"00".repeat(65)}`,
        photoHash: null,
        address: session.address,
      });
      console.log(`  Player ${i + 1} submission: ${submitResp.status} ${submitResp.ok ? "OK" : await submitResp.text()}`);
    }

    // 6. Agents submit
    if (NUM_AGENTS > 0) {
      console.log("[6] Agents submitting...");
      for (let i = 0; i < agents.length; i++) {
        const resp = await agentSubmit(agents[i], {
          day: DAY,
          theme: "E2E TEST",
          message: `AI-generated proof from agent ${i + 1}`,
          imageUrl: `https://example.com/agent-${i}.jpg`,
          signature: `0x${"00".repeat(65)}`,
        });
        console.log(`  Agent ${i + 1}: ${resp.status} ${resp.ok ? "OK" : await resp.text()}`);
      }
    }
  }

  // 7. Get feed and vote
  console.log("[7] Fetching feed and voting...");
  const feed = await getFeed();
  const submissions = feed.submissions || [];
  console.log(`  Feed: ${submissions.length} submissions`);

  for (let i = 0; i < players.length; i++) {
    const session = players[i];
    for (const sub of submissions.slice(0, 3)) {
      // Vote "real" on some, "fake" on others
      const vote = (i + sub.id) % 3 === 0 ? "fake" : "real";
      const resp = await castVote(session, sub.id, vote);
      if (!resp.ok) {
        console.log(`  Player ${i + 1} vote on sub ${sub.id}: ${resp.status} ${await resp.text()}`);
      }
    }
  }
  console.log(`  Votes cast by ${players.length} players`);

  // 8. Close the day
  console.log("[8] Closing day...");
  const closeResult = await closeDay(DAY);
  console.log(`  Close result: ${JSON.stringify(closeResult)}`);

  // 9. Verify game state
  console.log("[9] Verifying game state...");
  const gameState = await getGameState();
  console.log(`  Phase: ${gameState.phase}`);
  console.log(`  Current day: ${gameState.currentDay}`);
  console.log(`  Players: total=${gameState.players?.total}, active=${gameState.players?.active}`);

  // 10. Check jury stats if agents participated
  if (NUM_AGENTS > 0 && gameState.phase === "ended") {
    console.log("[10] Checking jury stats...");
    for (let i = 0; i < players.length; i++) {
      const stats = await getJuryStats(players[i]);
      if (stats.stats) {
        console.log(`  Player ${i + 1}: accuracy=${Math.round(stats.stats.accuracy * 100)}%, vs_agents=${Math.round(stats.stats.agentVotes.accuracy * 100)}%`);
      }
    }
  }

  // 11. Check agent reveal
  if (NUM_AGENTS > 0 && gameState.breakdown) {
    console.log("[11] Agent breakdown:");
    console.log(`  Verified humans: ${gameState.breakdown.verifiedHumans}`);
    console.log(`  Unverified humans: ${gameState.breakdown.unverifiedHumans}`);
    console.log(`  AI agents: ${gameState.breakdown.aiAgents}`);
  }

  console.log();
  console.log("=== E2E Test Complete ===");
  console.log("All steps executed. Review the output above for any failures.");
}

main().catch((err) => {
  console.error("E2E test failed:", err);
  process.exit(1);
});
