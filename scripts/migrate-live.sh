#!/usr/bin/env bash
#
# migrate-live.sh — Apply ONLY the pending migrations to the live Supabase
# DB. Avoids re-running the legacy files that scripts/migrate.mjs cycles
# through. Currently pending: 048 (checkins.flags — packet RCPT source).
# Add future pending migrations to the list below as they land on main.
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
  supabase/migrations/048_checkin_flags.sql
do
  echo "→ $f"
  psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 -f "$f"
done

echo
echo "OK. Verify it landed:"
echo "  SELECT column_name FROM information_schema.columns WHERE table_name='checkins' AND column_name='flags';"
