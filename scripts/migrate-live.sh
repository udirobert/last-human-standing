#!/usr/bin/env bash
#
# migrate-live.sh — Apply ONLY the new survival-arc + adaptive-cut +
# pilot-containment migrations (030, 031, 032) to the live Supabase DB.
# Avoids re-running all 29 legacy files that scripts/migrate.mjs would
# cycle through.
#
# Usage:
#   DATABASE_URL='postgresql://postgres.<ref>:<DB_PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres' bash scripts/migrate-live.sh
#
# Get DATABASE_URL from: Supabase dashboard → Project Settings → Database →
# Connection string → "Direct connection" (URI). The password is a secret and
# should not be committed.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL (Supabase Direct postgres connection string).}"

cd "$(dirname "$0")/.."

for f in \
  supabase/migrations/030_survival_arc_25.sql \
  supabase/migrations/031_adaptive_day1_cut.sql \
  supabase/migrations/032_pilot_containment.sql
do
  echo "→ $f"
  psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f "$f"
done

echo
echo "OK. Verify the new functions landed:"
echo "  SELECT * FROM public.survival_cap_for_day(1);   -- expect Day 1 = 25"
echo "  SELECT day, survival_cap FROM public.rounds ORDER BY day;"
echo "  SELECT length(prosrc) FROM pg_proc WHERE proname='advance_rounds';  -- should now be large (adaptive logic present)"
