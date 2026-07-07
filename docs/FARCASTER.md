# Farcaster Integration

Single source of truth for the Farcaster side of Last Human Standing. Keep this doc short and current; if a detail changes, edit it here once.

## What Farcaster is (today)

Farcaster is a **decentralized social protocol with a single canonical client** (the "Farcaster" app, fka Warpcast). The protocol is the network; the app is one UI on top. When docs say "host" or "client" they mean the app. The terms are interchangeable in the spec, but **"Warpcast" is the old brand name** — do not use it in code, copy, or comments.

Distribution on Farcaster happens through **Mini Apps** (formerly "Frames v2"). A Mini App is a web app the client embeds in-feed, identified by a signed manifest at `/.well-known/farcaster.json` on the developer's domain.

## What Farcaster is NOT (do not use these)

| Anti-pattern | Why | What to use instead |
|---|---|---|
| `warpcast.com/...` deeplinks | Old client brand, spec no longer ships those URLs | The Farcaster app's deep links (e.g. `farcaster://mini-apps/...`) or the SDK's `actions.*` |
| `fc:frame` meta tags as the **primary** embed | Legacy spec, superseded by `fc:miniapp` | `<meta name="fc:miniapp" content='{"version":"1",...}'>` per `miniapps.farcaster.xyz` |
| Cast Actions (`warpcast.com/~/add-cast-action`) | The ecosystem has moved to Mini Apps + `composeCast` | `sdk.actions.composeCast()` from `@farcaster/miniapp-sdk` |
| `composeCast` + a separate cast-action install | Two patterns for one job, double the surface | Compose-cast only; rely on the Mini App for in-app voting |
| The old "Frame v1" button schema (`fc:frame:button:1`) | Still parsed for back-compat, but `fc:miniapp` is the canonical embed | `fc:miniapp` with `button.action.type: "launch_frame"` |

Keep the legacy `fc:frame` tags in the share page only as a fallback for very old clients; do not write new code against them.

## Current state (shipped)

- **Signed Mini App manifest** at `https://lasthumanstanding.thisyearnofear.com/.well-known/farcaster.json` (account association, splash, icons, OG, tagline, category `games`).
- **SDK integration** in `src/components/CheckIn.jsx` via `sdk.actions.composeCast()` for the post-check-in share (survived and eliminated variants). Origin resolved client-side from `window.location.origin` — environment-agnostic.
- **Share page** at `/api/share/checkin/:id` (`server/routes/share.js`) emits the modern `fc:miniapp` embed with a `launch_frame` button pointing at the app, alongside legacy `fc:frame` tags for back-compat. Origin is dynamic via `server/lib/publicOrigin.js` (honors `PUBLIC_BASE_URL` env, then `x-forwarded-proto` + `host`).
- **Cast-action manifest** at `/.well-known/farcaster-actions.json` and the `POST /api/farcaster/action/vote` handler (`server/routes/farcaster.js`) are kept live as a no-cost fallback for any user who installs the action. Not promoted; not the primary path.
- **Detection** in `src/world/WorldProvider.jsx` distinguishes "in the Farcaster Mini App" from "browser" so the right UI surface is shown.

## Future: Farcaster Snaps (post-launch, week 2+)

Snaps (`docs.farcaster.xyz/snap`) are JSON-defined components embedded inline in a cast. They are the modern replacement for both Cast Actions and static OG embeds on shared casts — a snap can show live vote tallies, render a HUMAN/SUS toggle, and POST a signed vote back to the server, all without leaving the feed.

**Status: beta.** The spec page says it "may change significantly over the next few weeks or months." That is why we are **not** shipping snaps for the 18:00 UTC re-launch on 2026-07-14.

When the spec stabilizes, the plan is:

1. **Content negotiation on the share URL.** Add middleware on `/api/share/checkin/:id` that returns snap JSON when `Accept: application/vnd.farcaster.snap+json`, HTML otherwise. Same URL serves both — recommended pattern per the spec.
2. **Snap UI for a check-in cast.** `item` (player + rank), `bar_chart` (live real/fake vote tallies), `toggle_group` (HUMAN/SUS), `button` with `action: "submit"` POSTing to a new `/api/snap/vote` endpoint.
3. **Auth.** Snaps POST with JSON Farcaster Signatures (JFS). `submit` is the only action that hits the server. Use the per-snap key-value store for live tallies on reads.
4. **Rollout.** Land behind a feature flag; gate on a client-version check so it serves snaps only to clients known to support the spec version we target. Re-evaluate when the spec graduates from beta.

## Quick reference

- Mini App manifest spec: `https://miniapps.farcaster.xyz/docs/specification`
- Mini App publishing guide: `https://miniapps.farcaster.xyz/docs/guides/publishing`
- AI-agent checklist (use during debugging): `https://miniapps.farcaster.xyz/docs/guides/agents-checklist`
- Snap docs: `https://docs.farcaster.xyz/snap`
- Snap integrating guide (Express/Hono/Cloudflare): `https://docs.farcaster.xyz/snap/integrating`
- `@farcaster/miniapp-sdk` (client SDK, npm)
- Protocol docs: `https://docs.farcaster.xyz`

## Where the code lives

| File | Purpose |
|---|---|
| `public/.well-known/farcaster.json` | Signed Mini App manifest (accountAssociation, miniapp.*) |
| `public/.well-known/farcaster-actions.json` | Cast-action manifest (fallback only) |
| `server/routes/farcaster.js` | `/api/farcaster/action/vote` handler + action manifest route |
| `server/routes/share.js` | `/api/share/checkin/:id` share page (fc:miniapp + legacy fc:frame) |
| `server/lib/publicOrigin.js` | Dynamic origin resolver for share/embed URLs |
| `src/components/CheckIn.jsx` | `sdk.actions.composeCast()` calls for in-app share |
| `src/world/WorldProvider.jsx` | Detects "in Farcaster Mini App" vs browser |
