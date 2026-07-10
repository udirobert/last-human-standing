import { Router } from "express";
import { getPublicOrigin } from "../lib/publicOrigin.js";

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "checkins";
const SUPABASE_BUCKET_PRIVATE = process.env.SUPABASE_BUCKET_PRIVATE === "true";

// Brand palette — mirrors tailwind.config.js so the share artifact looks
// like the app, not a third-party card.
const C = {
  blood: "#FF1A1A",
  ash: "#0D0D0D",
  smoke: "#1A1A1A",
  ember: "#2A2A2A",
  bone: "#F0EDE8",
  amber: "#FFB800",
  neon: "#00FF94",
  dim: "#888888",
};

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Render the elimination curve (50→25→12→6→3→1) as an SVG polyline.
// Highlights the player's current day with a glowing dot.
function renderEliminationCurve(day, survived) {
  const caps = [50, 25, 12, 6, 3, 1];
  const dayNum = Number(day) || 0;
  const points = caps.map((cap, i) => {
    const x = 300 + (i * 120);
    const y = 540 - (cap * 3); // scale: 50→390, 1→537
    return { x, y, cap, day: i + 1 };
  });

  const polyline = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const dots = points
    .map((p) => {
      const isCurrent = p.day === dayNum;
      const fill = isCurrent ? (survived ? C.neon : C.blood) : C.ember;
      const r = isCurrent ? 8 : 4;
      return `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" ${isCurrent ? 'filter="url(#glow)"' : ""}/>`;
    })
    .join("");

  const labels = points
    .map((p) => `<text x="${p.x}" y="${p.y + 25}" text-anchor="middle" fill="${C.dim}" font-family="monospace" font-size="11">${p.cap}</text>`)
    .join("");

  return `<polyline points="${points.map(p => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${C.ember}" stroke-width="2"/>${dots}${labels}`;
}

export default function shareRoutes({ supabaseAdmin }) {
  const router = Router();

  async function loadCheckin(id) {
    if (!supabaseAdmin) return null;
    const { data: ck } = await supabaseAdmin
      .from("checkins")
      .select("id,address,username,day,rank,survived,created_at")
      .eq("id", id)
      .maybeSingle();
    return ck || null;
  }

  // The submitted photo is the most shareable object the game produces.
  // Check-ins store rank; the photo lives on the matching submission.
  async function loadPhotoUrl(ck) {
    if (!supabaseAdmin || !ck) return null;
    const { data: sub } = await supabaseAdmin
      .from("submissions")
      .select("media_path")
      .eq("day", ck.day)
      .ilike("address", ck.address)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!sub?.media_path) return null;
    if (!SUPABASE_BUCKET_PRIVATE) {
      return supabaseAdmin.storage.from(SUPABASE_BUCKET).getPublicUrl(sub.media_path).data.publicUrl;
    }
    const { data: signed } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(sub.media_path, 60 * 60 * 24 * 7);
    return signed?.signedUrl ?? null;
  }

  router.get("/og-image/checkin/:id", async (req, res) => {
    try {
      const ck = await loadCheckin(req.params.id);
      if (!ck && !supabaseAdmin) return res.status(404).end();

      const name = ck?.username || (ck?.address ? `${ck.address.slice(0, 6)}…${ck.address.slice(-4)}` : "Player");
      const rank = ck?.rank ?? "—";
      const day = ck?.day ?? "—";
      const status = ck?.survived ? "SURVIVED" : "JURY NOW";
      const statusColor = ck?.survived ? C.neon : C.amber;
      const headline = ck?.survived ? `RANK #${rank}` : "OUT — NOT DONE";
      const subline = ck?.survived
        ? `Day ${day}`
        : `Survived Day ${day} · votes decide who stays`;
      const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${C.ash}"/>
            <stop offset="100%" stop-color="${C.smoke}"/>
          </linearGradient>
          <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${C.blood}"/>
            <stop offset="100%" stop-color="${C.amber}"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>
        <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="${C.ember}" stroke-width="2"/>

        <!-- Brand -->
        <text x="600" y="110" text-anchor="middle" fill="${C.blood}" font-family="monospace" font-size="18" letter-spacing="10" filter="url(#glow)">LAST HUMAN STANDING</text>

        <!-- Status badge -->
        <rect x="450" y="140" width="300" height="44" rx="22" fill="none" stroke="${statusColor}" stroke-width="2"/>
        <text x="600" y="170" text-anchor="middle" fill="${statusColor}" font-family="monospace" font-size="20" font-weight="bold" letter-spacing="4">${status}</text>

        <!-- Player name -->
        <text x="600" y="250" text-anchor="middle" fill="${C.bone}" font-family="sans-serif" font-size="44" font-weight="bold">${escapeHtml(name)}</text>

        <!-- Headline -->
        <text x="600" y="360" text-anchor="middle" fill="${ck?.survived ? C.amber : C.blood}" font-family="monospace" font-size="${ck?.survived ? 80 : 56}" font-weight="bold" filter="url(#glow)">${escapeHtml(headline)}</text>

        <!-- Subline -->
        <line x1="450" y1="400" x2="750" y2="400" stroke="${C.ember}" stroke-width="1"/>
        <text x="600" y="440" text-anchor="middle" fill="${C.dim}" font-family="monospace" font-size="22">${escapeHtml(subline)}</text>

        <!-- Elimination curve: 50→25→12→6→3→1 -->
        ${renderEliminationCurve(day, ck?.survived)}

        <!-- Footer -->
        <text x="600" y="570" text-anchor="middle" fill="${C.dim}" font-family="monospace" font-size="14">${origin.replace(/^https?:\/\//, "")} · 50 humans. One pot.</text>
      </svg>`;

      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(svg);
    } catch {
      res.status(500).end();
    }
  });

  router.get("/share/checkin/:id", async (req, res) => {
    try {
      const ck = await loadCheckin(req.params.id);
      if (!ck) return res.status(404).send("Check-in not found");

      const name = ck.username || `${ck.address.slice(0, 6)}…${ck.address.slice(-4)}`;
      const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";
      const photoUrl = await loadPhotoUrl(ck);
      // Photo-first: crawlers (X, Farcaster, iMessage) render raster images
      // reliably; SVG cards often don't. The SVG card is the fallback.
      const ogImage = photoUrl || `${origin}/api/og-image/checkin/${ck.id}`;
      const statusText = ck.survived ? `Rank #${ck.rank} · Survived Day ${ck.day}` : `Jury · Survived Day ${ck.day}`;
      const title = `${name} — ${statusText} · Last Human Standing`;
      const description = ck.survived
        ? `Made the cut on Day ${ck.day}. One verified human takes the pot — watch the crowd audit live.`
        : `Out on Day ${ck.day} — now on the jury. Votes decide who stays. Watch the audit live.`;
      const shareUrl = `${origin}/api/share/checkin/${ck.id}`;

      // Modern Mini App embed spec (miniapps.farcaster.xyz). Farcaster clients
      // render this as an inline mini app launch; legacy `fc:frame` vNext tags
      // are kept below for backwards compatibility with older clients.
      const miniappEmbed = {
        version: "1",
        imageUrl: ogImage,
        button: {
          title: "Open Last Human Standing",
          action: {
            type: "launch_frame",
            name: "Last Human Standing",
            url: origin,
            splashImageUrl: `${origin}/splash.png`,
            splashBackgroundColor: "#0a0a0a",
          },
        },
      };

      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta name="fc:miniapp" content='${JSON.stringify(miniappEmbed).replace(/'/g, "&#39;")}' />
  <meta name="fc:frame" content="vNext" />
  <meta name="fc:frame:image" content="${ogImage}" />
  <meta name="fc:frame:button:1" content="View on Last Human Standing" />
  <meta name="fc:frame:post_url" content="${origin}" />
  <style>
    html,body{margin:0;padding:0;background:${C.ash};color:${C.bone};font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:${C.smoke};border:1px solid ${C.ember};border-radius:24px;padding:32px;max-width:480px;text-align:center;margin:24px}
    .photo{width:100%;border-radius:16px;border:1px solid ${C.ember};margin-bottom:20px;display:block}
    h1{color:${C.blood};font-size:14px;letter-spacing:4px;text-transform:uppercase;margin:0 0 16px}
    h2{font-size:28px;margin:0 0 4px;color:${C.bone}}
    .rank{color:${C.amber};font-size:44px;font-weight:bold;margin:12px 0 4px}
    .status{color:${ck.survived ? C.neon : C.blood};font-size:18px;margin:4px 0}
    .day{color:${C.dim};font-size:14px;margin:16px 0 24px}
    .cta{display:block;background:${C.blood};color:${C.bone};text-decoration:none;font-size:18px;letter-spacing:2px;padding:14px;border-radius:14px;margin-bottom:10px}
    .cta.secondary{background:${C.ash};border:1px solid ${C.ember};font-size:14px}
  </style>
</head>
<body>
  <div class="card">
    <h1>Last Human Standing</h1>
    ${photoUrl ? `<img class="photo" src="${photoUrl}" alt="Day ${ck.day} check-in photo" />` : ""}
    <h2>${escapeHtml(name)}</h2>
    <div class="rank">#${ck.rank}</div>
    <div class="status">${ck.survived ? "SURVIVED" : "JURY NOW"}</div>
    <div class="day">Day ${ck.day} · ${ck.survived ? "the crowd still judges" : "votes decide who stays"}</div>
    <a class="cta" href="${origin}">JOIN THE NEXT COHORT →</a>
    <a class="cta secondary" href="${origin}/?screen=feed">Watch the live audit (no signup)</a>
  </div>
</body>
</html>`);
    } catch {
      res.status(500).send("Error");
    }
  });

  async function loadWinner() {
    if (!supabaseAdmin) return null;
    const { data: round } = await supabaseAdmin
      .from("rounds")
      .select("day, game_winner")
      .not("game_winner", "is", null)
      .order("day", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!round?.game_winner) return null;
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("username, address")
      .ilike("address", round.game_winner)
      .maybeSingle();
    return {
      day: round.day,
      address: round.game_winner,
      username: user?.username ?? null,
    };
  }

  router.get("/og-image/winner", async (req, res) => {
    try {
      const winner = await loadWinner();
      const name = winner?.username
        ? `@${winner.username}`
        : winner?.address
          ? `${winner.address.slice(0, 6)}…${winner.address.slice(-4)}`
          : "One human";
      const day = winner?.day ?? 5;
      const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${C.ash}"/>
            <stop offset="100%" stop-color="${C.smoke}"/>
          </linearGradient>
          <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${C.blood}"/>
            <stop offset="100%" stop-color="${C.neon}"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>
        <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="${C.ember}" stroke-width="2"/>
        <text x="600" y="110" text-anchor="middle" fill="${C.blood}" font-family="monospace" font-size="18" letter-spacing="10" filter="url(#glow)">LAST HUMAN STANDING</text>
        <rect x="450" y="140" width="300" height="44" rx="22" fill="none" stroke="${C.amber}" stroke-width="2"/>
        <text x="600" y="170" text-anchor="middle" fill="${C.amber}" font-family="monospace" font-size="20" font-weight="bold" letter-spacing="4">LAST HUMAN</text>
        <text x="600" y="270" text-anchor="middle" fill="${C.amber}" font-family="sans-serif" font-size="48" font-weight="bold">${escapeHtml(name)}</text>
        <text x="600" y="360" text-anchor="middle" fill="${C.bone}" font-family="sans-serif" font-size="56" font-weight="bold">TOOK THE POT</text>
        <text x="600" y="430" text-anchor="middle" fill="${C.dim}" font-family="monospace" font-size="22">Outlasted the cohort · Day ${day}</text>
        <text x="600" y="570" text-anchor="middle" fill="${C.dim}" font-family="monospace" font-size="14">${origin.replace(/^https?:\/\//, "")} · 50 humans. One pot.</text>
      </svg>`;

      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(svg);
    } catch {
      res.status(500).end();
    }
  });

  router.get("/share/winner", async (req, res) => {
    try {
      const winner = await loadWinner();
      const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";
      const name = winner?.username
        ? `@${winner.username}`
        : winner?.address
          ? `${winner.address.slice(0, 6)}…${winner.address.slice(-4)}`
          : "One human";
      const day = winner?.day ?? 5;
      const ogImage = `${origin}/api/og-image/winner`;
      const title = `${name} is the Last Human Standing`;
      const description = `Outlasted the cohort on Day ${day}. One verified human took the pot. Next cohort is coming.`;
      const shareUrl = `${origin}/api/share/winner`;
      const miniappEmbed = {
        version: "1",
        imageUrl: ogImage,
        button: {
          title: "Join the next cohort",
          action: {
            type: "launch_frame",
            name: "Last Human Standing",
            url: origin,
            splashImageUrl: `${origin}/splash.png`,
            splashBackgroundColor: "#0a0a0a",
          },
        },
      };

      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta name="fc:miniapp" content='${JSON.stringify(miniappEmbed).replace(/'/g, "&#39;")}' />
  <style>
    html,body{margin:0;padding:0;background:${C.ash};color:${C.bone};font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:${C.smoke};border:1px solid ${C.ember};border-radius:24px;padding:32px;max-width:480px;text-align:center;margin:24px}
    h1{color:${C.blood};font-size:14px;letter-spacing:4px;text-transform:uppercase;margin:0 0 16px}
    h2{font-size:28px;margin:0 0 4px;color:${C.amber}}
    .status{color:${C.bone};font-size:22px;margin:12px 0}
    .day{color:${C.dim};font-size:14px;margin:16px 0 24px}
    .cta{display:block;background:${C.blood};color:${C.bone};text-decoration:none;font-size:18px;letter-spacing:2px;padding:14px;border-radius:14px}
  </style>
</head>
<body>
  <div class="card">
    <h1>Last Human Standing</h1>
    <h2>${escapeHtml(name)}</h2>
    <div class="status">TOOK THE POT</div>
    <div class="day">Day ${day} · outlasted the cohort</div>
    <a class="cta" href="${origin}">JOIN THE NEXT COHORT →</a>
  </div>
</body>
</html>`);
    } catch {
      res.status(500).send("Error");
    }
  });

  return router;
}
