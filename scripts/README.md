# scripts/

One-off ops, deploy, and spike runners. The app never imports from here at
request time (except `server/` helpers); vendors download into the repo and
record a manifest next to the files.

## Deploy / release

- `deploy.sh`, `deploy-rollback.sh`, `package-release.sh`, `preflight.sh`
- `compile-and-deploy-vote.js`, `compile-and-deploy-commit-reveal-vote.js`, `deploy-pioneer-pass.js`

## Migrations

- `migrate.mjs`, `migrate-live.sh`, `sql/`

## Pilot / e2e / exhibition

- `pilot-dry-run.mjs`, `pilot-dry-run.sh`, `pilot-gate0-check.sh`, `e2e-harness.mjs`
- `relaunch-prep.sh`, `seed-exhibition-agents.mjs`, `exhibition-agents.mjs`
- `agent-detection-metrics.mjs`, `generate-exhibition-photos.mjs`

## Spikes

- `semaphore-spike.mjs`, `semaphore-audit-spike.mjs`

## Media / vendors (vendor, never runtime dep)

- `vendor-meshy.mjs` — Meshy AI assets → `docs/promo-assets/meshy/`, `public/assets/meshy-days/`
- `vendor-patch.mjs` — patch.gg assets → `public/assets/patch/`, `game-off/audio/`
- `generate-bgm.mjs` — server-side BGM via ElevenLabs (`server/lib/bgm.js` consumes output)
