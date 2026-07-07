import { Router } from "express";

export default function referralRoutes({ supabaseAdmin }) {
  const router = Router();

  // NOTE: POST /api/waitlist lives in server/index.js (cohort_waitlist,
  // x_handle/email, always-200 to prevent enumeration). A legacy
  // email-only route here was shadowed by it and has been removed.

  // ---------- GET /api/referral-board ----------
  router.get("/referral-board", async (req, res) => {
    try {
      if (supabaseAdmin) {
        const [{ data: users }, { data: wl }] = await Promise.all([
          supabaseAdmin
            .from("users")
            .select("username, address, referral_code, referral_count")
            .gt("referral_count", 0)
            .order("referral_count", { ascending: false })
            .limit(50),
          supabaseAdmin
            .from("waitlist")
            .select("email, referral_code, referral_count")
            .gt("referral_count", 0)
            .order("referral_count", { ascending: false })
            .limit(50),
        ]);
        const board = [
          ...(users || []).map((u) => ({
            name: u.username || u.address?.slice(0, 8) || "anon",
            referralCode: u.referral_code,
            count: u.referral_count,
            source: "user",
          })),
          ...(wl || []).map((w) => ({
            name: w.email?.split("@")[0] || "anon",
            referralCode: w.referral_code,
            count: w.referral_count,
            source: "waitlist",
          })),
        ].sort((a, b) => b.count - a.count).slice(0, 20);
        return res.json({ ok: true, board });
      }
      return res.json({ ok: true, board: [] });
    } catch (e) {
      res.status(400).json({ error: "referral_board_error", message: e instanceof Error ? e.message : "unknown_error" });
    }
  });

  // ---------- GET /api/referral/:code ----------
  router.get("/referral/:code", async (req, res) => {
    try {
      const code = req.params.code;
      if (supabaseAdmin) {
        const { data: u } = await supabaseAdmin
          .from("users").select("referral_count").eq("referral_code", code).single();
        if (u) return res.json({ ok: true, count: u.referral_count });
        const { data: w } = await supabaseAdmin
          .from("waitlist").select("referral_count").eq("referral_code", code).single();
        if (w) return res.json({ ok: true, count: w.referral_count });
      }
      return res.json({ ok: true, count: 0 });
    } catch (e) {
      res.status(400).json({ error: "referral_lookup_error", message: e instanceof Error ? e.message : "unknown_error" });
    }
  });

  // ---------- GET /api/referral-rank/:code ----------
  // Returns the user's referral rank (e.g., "You're #3 top referrer")
  router.get("/referral-rank/:code", async (req, res) => {
    try {
      const code = req.params.code;
      if (!supabaseAdmin) return res.json({ ok: true, rank: null, totalReferrers: 0 });

      // Get the user's referral count
      const { data: user } = await supabaseAdmin
        .from("users").select("referral_count").eq("referral_code", code).single();
      const myCount = user?.referral_count ?? 0;

      if (myCount === 0) {
        return res.json({ ok: true, rank: null, totalReferrers: 0 });
      }

      // Count how many users have more referrals than this user
      const { count } = await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .gt("referral_count", myCount);

      // Also check waitlist
      const { count: wlCount } = await supabaseAdmin
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .gt("referral_count", myCount);

      const totalAbove = (count ?? 0) + (wlCount ?? 0);
      const rank = totalAbove + 1;

      // Total referrers (for context)
      const { count: totalUsers } = await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .gt("referral_count", 0);
      const { count: totalWl } = await supabaseAdmin
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .gt("referral_count", 0);
      const totalReferrers = (totalUsers ?? 0) + (totalWl ?? 0);

      return res.json({ ok: true, rank, totalReferrers, myCount });
    } catch (e) {
      res.status(400).json({ error: "referral_rank_error", message: e instanceof Error ? e.message : "unknown_error" });
    }
  });

  return router;
}
