import { Router } from "express";
import { getPublicOrigin } from "../lib/publicOrigin.js";

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

  return router;
}
