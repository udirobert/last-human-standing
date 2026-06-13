import { Router } from "express";
import { getPublicOrigin } from "../lib/publicOrigin.js";

export default function shareRoutes({ supabaseAdmin }) {
  const router = Router();

  router.get("/og-image/checkin/:id", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(404).end();
      }
      const { data: ck } = await supabaseAdmin
        .from("checkins")
        .select("id,address,username,day,rank,survived,created_at")
        .eq("id", req.params.id)
        .maybeSingle();

      const name = ck?.username || (ck?.address ? `${ck.address.slice(0, 6)}…${ck.address.slice(-4)}` : "Player");
      const rank = ck?.rank ?? "—";
      const day = ck?.day ?? "—";
      const status = ck?.survived ? "SURVIVED" : "ELIMINATED";
      const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0a0a0f"/>
            <stop offset="100%" stop-color="#1a1a2e"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#bg)"/>
        <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="#2a2a3e" stroke-width="2"/>
        <text x="600" y="140" text-anchor="middle" fill="#ff6b6b" font-family="monospace" font-size="20" letter-spacing="8">LAST HUMAN STANDING</text>
        <text x="600" y="220" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="52" font-weight="bold">${name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
        <text x="600" y="300" text-anchor="middle" fill="#ffd93d" font-family="monospace" font-size="64" font-weight="bold">RANK #${rank}</text>
        <text x="600" y="370" text-anchor="middle" fill="${ck?.survived ? "#4ade80" : "#ef4444"}" font-family="monospace" font-size="28">${status}</text>
        <line x1="400" y1="420" x2="800" y2="420" stroke="#2a2a3e" stroke-width="1"/>
        <text x="600" y="470" text-anchor="middle" fill="#aaaaaa" font-family="monospace" font-size="22">Day ${day}</text>
        <text x="600" y="520" text-anchor="middle" fill="#666666" font-family="monospace" font-size="16">${origin.replace(/^https?:\/\//, "")}</text>
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
      if (!supabaseAdmin) {
        return res.status(404).send("Not found");
      }
      const { data: ck } = await supabaseAdmin
        .from("checkins")
        .select("id,address,username,day,rank,survived,created_at")
        .eq("id", req.params.id)
        .maybeSingle();

      if (!ck) return res.status(404).send("Check-in not found");

      const name = ck?.username || `${ck.address.slice(0, 6)}…${ck.address.slice(-4)}`;
      const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";
      const ogImage = `${origin}/api/og-image/checkin/${ck.id}`;
      const statusText = ck.survived ? `Rank #${ck.rank} · Survived Day ${ck.day}` : `Eliminated Day ${ck.day}`;
      const title = `${name} — ${statusText} · Last Human Standing`;
      const description = `Check-in #${ck.id} on Day ${ck.day}. ${ck.survived ? "Survived" : "Arrived too late."}`;
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
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
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
  <meta http-equiv="refresh" content="0;url=${origin}" />
  <style>
    html,body{margin:0;padding:0;background:#0a0a0f;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#1a1a2e;border:1px solid #2a2a3e;border-radius:24px;padding:48px;max-width:480px;text-align:center}
    h1{color:#ff6b6b;font-size:14px;letter-spacing:4px;text-transform:uppercase;margin:0 0 16px}
    h2{font-size:32px;margin:0 0 8px}
    .rank{color:#ffd93d;font-size:48px;font-weight:bold;margin:16px 0}
    .status{color:${ck.survived ? "#4ade80" : "#ef4444"};font-size:20px;margin:8px 0}
    .day{color:#aaa;font-size:16px;margin:24px 0 0}
    a{color:#ff6b6b;text-decoration:underline}
  </style>
</head>
<body>
  <div class="card">
    <h1>Last Human Standing</h1>
    <h2>${name}</h2>
    <div class="rank">#${ck.rank}</div>
    <div class="status">${ck.survived ? "SURVIVED" : "ELIMINATED"}</div>
    <div class="day">Day ${ck.day}</div>
    <p><a href="${origin}">Play now →</a></p>
  </div>
</body>
</html>`);
    } catch {
      res.status(500).send("Error");
    }
  });

  return router;
}
