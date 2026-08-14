import { Router } from "express";
import { getPublicOrigin } from "../lib/publicOrigin.js";

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function isEligibleVoter(user, cohort) {
  return Boolean(
    user?.paid &&
    user?.cohort === cohort &&
    (user?.world_id_verified || user?.humanity_nullifier),
  );
}

export default function farcasterRoutes({ supabaseAdmin, log, COHORT_CONFIG }) {
  const router = Router();

  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  const activeCohort = COHORT_CONFIG?.cohort ?? 1;

  async function loadEligibleVoter(address) {
    if (!supabaseAdmin || !/^0x[a-fA-F0-9]{40}$/.test(address || "")) return null;
    const { data } = await supabaseAdmin
      .from("users")
      .select("address,paid,cohort,world_id_verified,humanity_nullifier")
      .ilike("address", address)
      .maybeSingle();
    return isEligibleVoter(data, activeCohort) ? data : null;
  }

  async function castVerifiedFarcasterVote({ submissionId, voterAddress, vote }) {
    const { data, error } = await supabaseAdmin.rpc("cast_vote", {
      p_submission_id: submissionId,
      p_voter_address: voterAddress,
      p_vote: vote,
      p_weight: 1,
    });
    return { data, error };
  }

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
      if (!trustedData?.messageBytes || !NEYNAR_API_KEY) {
        return res.status(403).json({ error: "trusted_farcaster_identity_required" });
      }
      if (!supabaseAdmin) return res.status(501).json({ error: "supabase_not_configured" });

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
      if (!validated.valid) return res.status(400).json({ error: "invalid_action" });

      const voterAddress = validated.interactor?.verifications?.[0]?.address?.toLowerCase();
      const voter = await loadEligibleVoter(voterAddress);
      if (!voter) return res.status(403).json({ error: "eligible_verified_cohort_member_required" });

      const cast = validated.cast;
      if (!cast?.embeds?.length) return res.status(400).json({ error: "no_embeds" });

      let checkinId = null;
      for (const embed of cast.embeds) {
        const url = typeof embed === "string" ? embed : embed.url;
        const match = url?.match(/\/api\/share\/checkin\/(\d+)/);
        if (match) {
          checkinId = Number(match[1]);
          break;
        }
      }
      if (!checkinId) return res.status(400).json({ error: "no_checkin_embed" });

      const { data: checkin } = await supabaseAdmin
        .from("checkins")
        .select("address,day")
        .eq("id", checkinId)
        .maybeSingle();
      if (!checkin) return res.status(404).json({ error: "checkin_not_found" });
      if (voter.address.toLowerCase() === checkin.address.toLowerCase()) {
        return res.status(403).json({ error: "self_vote_not_allowed" });
      }

      const { data: submission } = await supabaseAdmin
        .from("submissions")
        .select("id")
        .eq("day", checkin.day)
        .ilike("address", checkin.address)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!submission) return res.status(404).json({ error: "submission_not_found" });

      const vote = ["real", "fake"].includes(untrustedData?.vote)
        ? untrustedData.vote
        : "real";
      const { data: castResult, error: castError } = await castVerifiedFarcasterVote({
        submissionId: submission.id,
        voterAddress: voter.address,
        vote,
      });
      if (castError) return res.status(400).json({ error: "vote_failed" });
      if (!castResult?.[0]?.inserted) {
        return res.status(409).json({ error: "already_voted" });
      }

      log("farcaster_vote", { address: voter.address, checkinId, submissionId: submission.id, vote });
      return res.json({ message: "Vote recorded", type: vote === "real" ? "human" : "sus" });
    } catch (e) {
      log("farcaster_action_error", { error: e instanceof Error ? e.message : "unknown" });
      return res.status(500).json({ error: "action_failed" });
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
        const isPrivate = process.env.SUPABASE_BUCKET_PRIVATE !== "false";
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
      if (!trustedData?.messageBytes || !NEYNAR_API_KEY) {
        return res.status(403).json({ error: "trusted_farcaster_identity_required" });
      }

      const buttonIndex = untrustedData?.buttonIndex;
      const vote = buttonIndex === 1 ? "real" : buttonIndex === 2 ? "fake" : null;
      if (!vote) return res.status(400).json({ error: "invalid_button" });

      const validateResp = await fetch(
        "https://api.neynar.com/v2/farcaster/action/validate",
        {
          method: "POST",
          headers: { "api_key": NEYNAR_API_KEY, "content-type": "application/json" },
          body: JSON.stringify({ action_bytes: trustedData.messageBytes }),
        },
      );
      if (!validateResp.ok) return res.status(400).json({ error: "validation_failed" });
      const validated = await validateResp.json();
      const voterAddress = validated.valid
        ? validated.interactor?.verifications?.[0]?.address?.toLowerCase()
        : null;
      const voter = await loadEligibleVoter(voterAddress);
      if (!voter) return res.status(403).json({ error: "eligible_verified_cohort_member_required" });

      const { data: submission } = await supabaseAdmin
        .from("submissions")
        .select("id,address")
        .eq("id", id)
        .maybeSingle();
      if (!submission) return res.status(404).json({ error: "submission_not_found" });
      if (submission.address.toLowerCase() === voter.address.toLowerCase()) {
        return res.status(403).json({ error: "self_vote_not_allowed" });
      }

      const { data: castResult, error: castError } = await castVerifiedFarcasterVote({
        submissionId: id,
        voterAddress: voter.address,
        vote,
      });
      if (castError || !castResult?.[0]?.inserted) {
        return res.status(409).json({ error: "already_voted" });
      }

      log("farcaster_frame_vote", { id, vote, voter: voter.address });
      const origin = getPublicOrigin(req) || "https://lasthumanstanding.thisyearnofear.com";
      return res.send(`<!DOCTYPE html><html><head><meta name="fc:frame" content="vNext"/><meta name="fc:frame:image" content="${origin}/api/og-image/checkin/${id}"/><meta name="fc:frame:button:1" content="✓ Vote recorded — see more"/><meta name="fc:frame:post_url" content="${origin}"/></head><body></body></html>`);
    } catch (e) {
      log("farcaster_frame_vote_error", { error: String(e) });
      return res.status(500).json({ error: "vote_failed" });
    }
  });

  return router;
}
