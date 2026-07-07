import { Router } from "express";
import { getPublicOrigin } from "../lib/publicOrigin.js";

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function farcasterRoutes({ supabaseAdmin, log }) {
  const router = Router();

  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

  router.get("/.well-known/farcaster-actions.json", (req, res) => {
    const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";
    res.json({
      actions: [
        {
          name: "Vote HUMAN/SUS",
          icon: "vote",
          description: "Vote HUMAN (real) or SUS (fake) on a Last Human Standing check-in",
          aboutUrl: origin,
          action: {
            type: "post",
            url: `${origin}/api/farcaster/action/vote`,
          },
        },
      ],
    });
  });

  router.post("/farcaster/action/vote", async (req, res) => {
    try {
      const { trustedData, untrustedData } = req.body;
      if (!trustedData?.messageBytes) {
        return res.status(400).json({ error: "missing_message_bytes" });
      }

      if (!NEYNAR_API_KEY) {
        return res.status(501).json({ error: "neynar_not_configured" });
      }

      const validateResp = await fetch(
        "https://api.neynar.com/v2/farcaster/action/validate",
        {
          method: "POST",
          headers: {
            "api_key": NEYNAR_API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({ action_bytes: trustedData.messageBytes }),
        },
      );

      if (!validateResp.ok) {
        log("farcaster_action_validate_failed", { status: validateResp.status });
        return res.status(400).json({ error: "validation_failed" });
      }

      const validated = await validateResp.json();

      if (!validated.valid) {
        return res.status(400).json({ error: "invalid_action" });
      }

      const interactor = validated.interactor;
      const cast = validated.cast;
      const fid = interactor?.fid;
      const voterAddress = interactor?.verifications?.[0]?.address;

      if (!cast?.embeds?.length) {
        return res.status(400).json({ error: "no_embeds" });
      }

      let checkinId = null;
      for (const embed of cast.embeds) {
        const url = typeof embed === "string" ? embed : embed.url;
        if (!url) continue;
        const match = url.match(/\/api\/share\/checkin\/(\d+)/);
        if (match) {
          checkinId = Number(match[1]);
          break;
        }
      }

      if (!checkinId) {
        return res.status(400).json({ error: "no_checkin_embed" });
      }

      let vote = untrustedData?.vote;
      if (!vote || !["real", "fake"].includes(vote)) {
        vote = String(req.query?.vote || req.body?.vote || "real");
        if (!["real", "fake"].includes(vote)) vote = "real";
      }

      if (supabaseAdmin) {
        const { data: checkin } = await supabaseAdmin
          .from("checkins")
          .select("id,address,day")
          .eq("id", checkinId)
          .maybeSingle();

        if (!checkin) {
          return res.status(404).json({ error: "checkin_not_found" });
        }

        const voterAddressLower = voterAddress?.toLowerCase();
        if (voterAddressLower === checkin.address.toLowerCase()) {
          return res.status(403).json({ message: "Cannot vote on your own check-in" });
        }

        const { data: existingVote } = await supabaseAdmin
          .from("votes")
          .select("id")
          .eq("voter_address", voterAddressLower)
          .eq("submission_id", checkinId)
          .maybeSingle();

        if (existingVote) {
          return res.status(200).json({ message: "Already voted" });
        }

        await supabaseAdmin.from("votes").insert({
          submission_id: checkinId,
          voter_address: voterAddressLower,
          vote,
          platform: "farcaster",
        });

        log("farcaster_vote", {
          fid,
          address: voterAddress,
          checkinId,
          vote,
          day: checkin.day,
        });
      }

      res.json({
        message: "Vote recorded",
        type: vote === "real" ? "human" : "sus",
      });
    } catch (e) {
      log("farcaster_action_error", { error: e instanceof Error ? e.message : "unknown" });
      res.status(500).json({ error: "action_failed" });
    }
  });

  router.get("/api/farcaster/vote-history/:fid", async (req, res) => {
    try {
      const fid = Number(req.params.fid);
      if (!supabaseAdmin || !fid) {
        return res.json({ ok: true, votes: [] });
      }

      if (!NEYNAR_API_KEY) {
        return res.json({ ok: true, votes: [] });
      }

      const userResp = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: { "api_key": NEYNAR_API_KEY },
        },
      );
      const userJson = await userResp.json();
      const verifications = userJson?.users?.[0]?.verifications || [];
      const address = verifications[0]?.address;

      if (!address) return res.json({ ok: true, votes: [] });

      const { data: votes } = await supabaseAdmin
        .from("votes")
        .select("submission_id,vote,created_at")
        .eq("voter_address", address.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(20);

      res.json({ ok: true, votes: votes || [] });
    } catch {
      res.status(500).json({ error: "vote_history_failed" });
    }
  });

  // === Farcaster Frame for in-feed voting ===
  // Shows a submission photo with HUMAN/SUS buttons. Anyone scrolling
  // Farcaster can vote without leaving their feed — pure distribution.
  // GET returns the frame HTML; POST handles the vote.
  router.get("/farcaster/frame/vote/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!supabaseAdmin || !id) return res.status(404).end();

      const { data: sub } = await supabaseAdmin
        .from("submissions")
        .select("id,address,username,day,caption,media_path,status")
        .eq("id", id)
        .maybeSingle();
      if (!sub) return res.status(404).send("Not found");

      const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";
      const name = sub.username || (sub.address ? `${sub.address.slice(0, 6)}…${sub.address.slice(-4)}` : "Player");

      // Get photo URL
      let photoUrl = null;
      if (sub.media_path) {
        const bucket = process.env.SUPABASE_BUCKET || "checkins";
        const isPrivate = process.env.SUPABASE_BUCKET_PRIVATE === "true";
        if (!isPrivate) {
          photoUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(sub.media_path).data.publicUrl;
        } else {
          const { data: signed } = await supabaseAdmin.storage
            .from(bucket).createSignedUrl(sub.media_path, 60 * 60);
          photoUrl = signed?.signedUrl ?? null;
        }
      }

      const imageUrl = photoUrl || `${origin}/api/og-image/checkin/${id}`;
      const postUrl = `${origin}/api/farcaster/frame/vote/${id}`;

      res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(name)} — Day ${sub.day} · Vote HUMAN or SUS</title>
  <meta name="fc:frame" content="vNext" />
  <meta name="fc:frame:image" content="${imageUrl}" />
  <meta name="fc:frame:button:1" content="🧍 HUMAN" />
  <meta name="fc:frame:button:2" content="🎭 SUS" />
  <meta name="fc:frame:post_url" content="${postUrl}" />
  <meta property="og:title" content="${escapeHtml(name)} — Day ${sub.day}" />
  <meta property="og:image" content="${imageUrl}" />
</head>
<body style="margin:0;background:#0D0D0D;color:#F0EDE8;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="text-align:center;padding:24px">
    <h1 style="color:#FF1A1A;font-size:14px;letter-spacing:4px">LAST HUMAN STANDING</h1>
    <p style="font-size:20px">${escapeHtml(name)} — Day ${sub.day}</p>
    ${photoUrl ? `<img src="${photoUrl}" alt="submission" style="max-width:400px;border-radius:16px;border:1px solid #2A2A2A;margin:16px 0"/>` : ""}
    <p style="color:#888;font-size:14px">Vote HUMAN or SUS — the crowd decides who survives.</p>
  </div>
</body>
</html>`);
    } catch {
      res.status(500).end();
    }
  });

  // Handle Frame button votes
  router.post("/farcaster/frame/vote/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { trustedData, untrustedData } = req.body;
      if (!supabaseAdmin || !id) return res.status(404).json({ error: "not_found" });

      // Determine vote from button index
      const buttonIndex = untrustedData?.buttonIndex;
      const vote = buttonIndex === 1 ? "real" : buttonIndex === 2 ? "fake" : null;
      if (!vote) return res.status(400).json({ error: "invalid_button" });

      // Try to validate via Neymar if available
      let voterAddress = null;
      if (trustedData?.messageBytes && NEYNAR_API_KEY) {
        try {
          const validateResp = await fetch(
            "https://api.neynar.com/v2/farcaster/action/validate",
            {
              method: "POST",
              headers: { "api_key": NEYNAR_API_KEY, "content-type": "application/json" },
              body: JSON.stringify({ action_bytes: trustedData.messageBytes }),
            },
          );
          if (validateResp.ok) {
            const validated = await validateResp.json();
            if (validated.valid) {
              voterAddress = validated.interactor?.verifications?.[0]?.address?.toLowerCase();
            }
          }
        } catch { /* validation optional for frame votes */ }
      }

      // Record vote (anonymous if no verification)
      const voterKey = voterAddress || `fc:${untrustedData?.fid || "anon"}`;
      const { data: existing } = await supabaseAdmin
        .from("votes")
        .select("id")
        .eq("voter_address", voterKey)
        .eq("submission_id", id)
        .maybeSingle();

      if (existing) {
        return res.send(`<!DOCTYPE html><html><head><meta name="fc:frame" content="vNext"/><meta name="fc:frame:image" content="${getPublicOrigin(req)}/api/og-image/checkin/${id}"/><meta name="fc:frame:button:1" content="✓ Already voted"/></head><body></body></html>`);
      }

      await supabaseAdmin.from("votes").insert({
        submission_id: id,
        voter_address: voterKey,
        vote,
        platform: "farcaster_frame",
      });

      log("farcaster_frame_vote", { id, vote, voter: voterKey });

      // Return a thank-you frame
      const origin = getPublicOrigin(req);
      res.send(`<!DOCTYPE html><html><head><meta name="fc:frame" content="vNext"/><meta name="fc:frame:image" content="${origin}/api/og-image/checkin/${id}"/><meta name="fc:frame:button:1" content="✓ Vote recorded — see more"/><meta name="fc:frame:post_url" content="${origin}"/></head><body></body></html>`);
    } catch (e) {
      log("farcaster_frame_vote_error", { error: String(e) });
      res.status(500).json({ error: "vote_failed" });
    }
  });

  return router;
}
