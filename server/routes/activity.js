import { Router } from "express";

export default function activityRoutes({ supabaseAdmin, log }) {
  const router = Router();

  router.get("/activity", async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.json({ ok: true, events: [] });
      }

      const [checkinsRes, votesRes, elimsRes] = await Promise.all([
        supabaseAdmin
          .from("checkins")
          .select("id,address,username,day,rank,survived,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("votes")
          .select("id,submission_id,vote,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabaseAdmin
          .from("users")
          .select("address,username,eliminated_at_day,updated_at")
          .eq("eliminated", true)
          .order("updated_at", { ascending: false })
          .limit(10),
      ]);

      const events = [];

      for (const c of checkinsRes.data || []) {
        events.push({
          type: c.survived ? "checkin" : "late",
          id: `ck-${c.id}`,
          address: c.address,
          username: c.username,
          day: c.day,
          rank: c.rank,
          text: c.survived
            ? `Checked in — Rank #${c.rank} (Day ${c.day})`
            : `Arrived late — #${c.rank} of cap (Day ${c.day})`,
          ts: c.created_at,
        });
      }

      for (const v of votesRes.data || []) {
        const { data: sub } = await supabaseAdmin
          .from("submissions")
          .select("day")
          .eq("id", v.submission_id)
          .maybeSingle();
        events.push({
          type: "vote",
          id: `vt-${v.id}`,
          username: "A juror",
          day: sub?.day,
          text: `Voted ${v.vote === "real" ? "HUMAN" : "SUS"} on Day ${sub?.day || "—"}`,
          ts: v.created_at,
        });
      }

      for (const u of elimsRes.data || []) {
        events.push({
          type: "elimination",
          id: `el-${u.address}`,
          address: u.address,
          username: u.username,
          day: u.eliminated_at_day,
          text: `Eliminated on Day ${u.eliminated_at_day}`,
          ts: u.updated_at,
        });
      }

      events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      const top = events.slice(0, 30);

      // Optional sealed-today count for FieldPulse theater (survived check-ins).
      let sealedToday = null;
      const dayParam = req.query?.day != null ? Number(req.query.day) : null;
      if (Number.isFinite(dayParam) && dayParam >= 1) {
        const { count, error: countErr } = await supabaseAdmin
          .from("checkins")
          .select("id", { count: "exact", head: true })
          .eq("day", dayParam)
          .eq("survived", true);
        if (!countErr) sealedToday = count ?? 0;
      }

      res.json({ ok: true, events: top, sealedToday });
    } catch (e) {
      res.status(500).json({ error: "activity_failed", message: e instanceof Error ? e.message : "unknown" });
    }
  });

  return router;
}
