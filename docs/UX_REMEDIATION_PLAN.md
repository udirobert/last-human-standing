# UX Remediation Plan — prelaunch hardening

> Target: 9/10 on every axis of the UX review, in time for the **2026-06-14 14:00 UTC** launch.
> Constraints: existing Core Principles (enhancement-first, consolidation, DRY, modular, performant, organized).

## Audit findings (what exists today)

| Widget / behaviour | Lives in | Used by | Status |
|---|---|---|---|
| `Countdown` | `src/components/Countdown.jsx` | Onboarding step 0, GameHome prelaunch, Onboarding step 3 | OK, single source |
| `Cohort` progress bar | inline JSX in Onboarding step 0 + GameHome prelaunch | both | **duplicated** — extract to `<CohortProgress/>` |
| `DailyPrompt` | `src/components/DailyPrompt.jsx` | Onboarding step 0, Onboarding step 3 | OK as standalone |
| `ShareButtons` (𝕏, Warpcast, Copy) | inside `Onboarding.jsx` | Onboarding step 3 | **needs to move to GameHome** |
| Share button (navigator.share) | inline in `GameHome.jsx` | GameHome prelaunch | **delete** — inferior copy of ShareButtons |
| `WaitlistForm` (email capture) | inline in `GameHome.jsx` | GameHome prelaunch | **delete** — entryPaid gate means user is already reserved |
| `TopReferrersBoard` (Top 5) | inline in `GameHome.jsx` | GameHome prelaunch | OK, extract to `src/components/prelaunch/` |
| `Early` badge | `TrustBadge` `showEarlyBadge` prop | Onboarding step 3 | **not called from GameHome** — fix |
| `Mascot` | `src/components/Mascot.jsx` | multiple | OK, single source |
| Screen state (`screen`, `navTab`) | `useState` in `App.jsx` | App | **not persisted** — refresh loses your place |
| `usesDemoState` flag | RoundProvider | ModeBanner (already wired) | OK, ModeBanner already surfaces it |
| `isLoading` from RoundProvider | RoundProvider | ModeBanner (Syncing), RoundMetaBanner | OK |
| 5 lazy screens | `App.jsx` `<Suspense fallback={null}>` | App | **all null fallbacks — fix** |
| First-paint splash | `index.html` | — | **missing** |
| `VITE_FREE_ENTRY_MODE` reads | 3+ components inline | Onboarding, Onboarding step 2, BrowserWalletPay | **read in 3 places — extract `useEntryMode()`** |
| `Lottie`/`lottie-web` import in bundle | n/a (esm chunk is from a SelfVerify or viem dep) | SelfVerify.jsx | SelfVerify is imported by Onboarding step 2 — should be **dynamic-imported** so it doesn't ship in the main bundle |

## Target architecture

```
src/
  components/
    ui/                       # ← NEW: dumb primitives
      ScreenLoader.jsx        # Suspense fallback (skeleton rows)
      SplashScreen.jsx        # first-paint hero (referenced by index.html)
      NetworkPill.jsx         # online/offline indicator
      TapHint.jsx             # "tap to refresh" empty state CTA
    prelaunch/                # ← NEW: post-signup prelaunch widgets
      PrelaunchPanel.jsx      # composes the rest into one surface
      CountdownCard.jsx       # big countdown + cohort progress
      CohortProgress.jsx      # bar + "5 of 50" text
      SharePanel.jsx          # moves ShareButtons out of Onboarding
      TopReferrersBoard.jsx   # moves out of GameHome
      DailyPrompt.jsx         # moves out of components/
      EarlyBadge.jsx          # moves out of TrustBadge (now used standalone)
    ...
  hooks/
    useEntryMode.js           # ← NEW: single source of FREE_ENTRY_MODE
    useScreenState.js         # ← NEW: persistent screen + navTab
    useGameState.js           # ← NEW: wraps RoundProvider with retry/backoff
  lib/
    env.js                    # ← NEW: typed env readers
```

## The plan — 5 workstreams

### Workstream A — Loading states (4 → 9)

**A1.** Splash first paint. Add a 1.5 kB inline `<style>` + `<div id="splash">` to `index.html` (mascot glyph + "Loading…" centred on the `ash` background). Remove on `DOMContentLoaded` from `main.jsx`. The native font flicker disappears and the worst 200-400 ms white flash is replaced with a branded frame.

**A2.** Single `<ScreenLoader />` in `src/components/ui/`. Three variants via a `kind` prop:
- `kind="list"` — 4 pulsing rows, 2.5-line height
- `kind="chat"` — 3 chat-bubble skeletons
- `kind="detail"` — 1 hero block + 3 text rows

**A3.** Replace all 5 `<Suspense fallback={null}>` in `App.jsx` with `<Suspense fallback={<ScreenLoader kind="…" />}>`:
- Feed → `list`
- Chat → `chat`
- Leaderboard → `list`
- PlayerHistory → `detail`
- AdminDashboard → `detail`

**A4.** Add loading + empty + error UIs to `Chat.jsx`. Use `usePolling('/api/chat/messages')` (DRY — the hook already exists and pauses on tab blur) and render `<ScreenLoader kind="chat" />` while loading, `<NetworkPill />` + retry button on error, and an empty-state with the message "Be the first to say something 👋" when the list is empty. Delete the local `useState(messages)` seed-mock path — `MOCK_SUBMISSIONS` is dev-only and we already gate on `import.meta.env.DEV`.

**A5.** GameHome's `navigator.share` button goes to the deleted-list (see D2). The countdown, cohort, and top-5 all already render a "loading" state via the existing skeletons in `Leaderboard.jsx`. Verify and reuse.

**Files touched:** `index.html`, `main.jsx`, `App.jsx`, `Chat.jsx`, `src/components/ui/ScreenLoader.jsx` (new), `src/components/ui/NetworkPill.jsx` (new).

### Workstream B — Performance & reliability (7 → 9)

**B1.** Dynamic-import SelfVerify. `Onboarding.jsx` step 2 currently statically imports `SelfVerify.jsx` which pulls in `@selfxyz/core` + `@selfxyz/qrcode` (this is the 889 kB ESM chunk we measured). Change to:
```js
const SelfVerify = lazy(() => import('./SelfVerify.jsx'));
```
Wrap the call site in `<Suspense fallback={<ScreenLoader kind="detail" />} />`. Verify the QR code is only rendered in the post-reserve verification step, not on the welcome screen.

**B2.** Wrap `RoundProvider`'s `load()` in a small retry/backoff — three attempts at 0, 2 s, 6 s, then surface the error to ModeBanner (already wired). Replace the silent `setInterval` with a polling loop that:
- skips a cycle if the previous one is still in flight
- backs off to 60 s after two consecutive failures
- resets to 15 s after a successful fetch

**B3.** Prefetch lazy chunks on tab hover. In `BottomNav.jsx`, add:
```js
const handleMouseEnter = (id) => {
  if (id === 'feed') import('./Feed.jsx');
  if (id === 'chat') import('./Chat.jsx');
  if (id === 'leaderboard') import('./Leaderboard.jsx');
};
```
On mobile this fires on first `touchstart` so by the time the user taps through, the chunk is hot.

**B4.** Stop swallowing errors. Audit `.catch(() => {})` calls — there are 6 of them in `Feed.jsx`, `Chat.jsx`, `Leaderboard.jsx`, `DailyPrompt.jsx`. Where the error blocks a meaningful user flow, surface it via the `<NetworkPill />` primitive from A2 instead of a silent `void`. (DailyPrompt's catch is fine — localStorage is best-effort.)

**B5.** Verify the bundle. Run `npm run build` after B1 and confirm `esm-*.js` is now a route chunk (loaded only when the user reaches the Self step) and the main `index-*.js` is ≤ 200 kB. Cap the chunk-size warning at 400 kB in `vite.config.js`.

**Files touched:** `Onboarding.jsx`, `RoundProvider.jsx`, `BottomNav.jsx`, `Feed.jsx`, `Chat.jsx`, `Leaderboard.jsx`, `vite.config.js`.

### Workstream C — Engagement & virality (7 → 9)

**C1.** Move `SharePanel` into the prelaunch panel so it follows the user from Onboarding step 3 → GameHome → re-entry. (See D1.) Personal-rank chip stays the same, just relocated.

**C2.** Add "X of your friends joined" social proof. Use the existing `/api/cohort/roster` endpoint to count reserved slots with `referred_by` matching the current user's `referralCode`. Render: "3 of your invites are in the cohort — top referrers get a guaranteed slot when we open" when the count is ≥ 1. Zero backend changes.

**C3.** Make `DailyPrompt` honest. Right now the bars reflect only the user's own vote, but the copy says "Community pulse". Two acceptable fixes:
- **Preferred**: rephrase to "Your take" + a small "(local only — community totals land with the leaderboard at launch)" disclaimer.
- **Bigger lift**: ship `/api/pulse/vote` to aggregate across users. Skip for this prelaunch window — adds a write path we'd need to secure.

**C4.** Add a footer link to a public community surface. Discord is the lowest-friction (no moderation infra required for a link). If there's a Discord invite already, link it from GameHome prelaunch branch; if not, link the project's Farcaster channel.

**C5.** Onboarding step 0 already has FAQ, but it has no link to a deeper doc. Add a "Read the rules in full →" link that opens `docs/PRODUCTION_READY.md` (or the right one) in a new tab. One-line change.

**Files touched:** `Onboarding.jsx`, `GameHome.jsx`, `src/components/prelaunch/PrelaunchPanel.jsx`, `src/components/prelaunch/SharePanel.jsx`, `DailyPrompt.jsx` (copy only).

### Workstream D — Cogency / single source of truth (5 → 9)

**D1. Consolidate prelaunch into one surface.** This is the biggest single change.

Today there are three prelaunch surfaces: Onboarding step 0, Onboarding step 3, GameHome prelaunch. They overlap, and the user can be in any one of them.

Target:

- `Onboarding` step 0 — **visitor funnel** (How a day looks, FAQ, DailyPulse, "Reserve my slot →" CTA). No share/referral content because the visitor isn't signed in.
- `Onboarding` step 3 — **celebratory interstitial**: "You're in" + EarlyBadge + Countdown + ENTER LOBBY button. **Delete the duplicated SharePanel and DailyPrompt** from this step — they belong on GameHome.
- `GameHome` prelaunch branch — **persistent prelaunch home** for signed-in users. Hosts the `<PrelaunchPanel />` which composes: CountdownCard, CohortProgress, SharePanel (with personal rank), DailyPrompt, TopReferrersBoard, EarlyBadge.

Implementation:
1. New `src/components/prelaunch/PrelaunchPanel.jsx` — pure composition. Takes no props except optional `user`.
2. New `src/components/prelaunch/{CountdownCard, CohortProgress, SharePanel, TopReferrersBoard, EarlyBadge}.jsx` — extracted from the inline JSX in `GameHome.jsx` and `Onboarding.jsx`.
3. `GameHome.jsx` prelaunch branch becomes `<PrelaunchPanel />` + the prize/stats grid.
4. `Onboarding.jsx` step 3 becomes a thin celebratory card that calls `markOnboardingDone(); onEnter();` and inherits the EarlyBadge via the existing `TrustBadge` `showEarlyBadge` prop.

**D2. Delete dead code.**
- `GameHome.jsx` email waitlist form — entryPaid gate means user is already reserved, so it's unreachable.
- `GameHome.jsx` `navigator.share` button — inferior to SharePanel.
- `Onboarding.jsx` step 3 ShareButtons and DailyPrompt duplicates — moved to GameHome (D1).
- `MOCK_SUBMISSIONS` and `MOCK_*` paths in Feed.jsx/Chat.jsx — dev-only, kept behind `import.meta.env.DEV` and don't ship to prod. Leave but document.

**D3. Persist screen state.** New `useScreenState()` hook in `src/hooks/`:
```js
const [screen, setScreen] = useState(() => {
  try { return localStorage.getItem('lhs_screen') ?? 'onboarding'; }
  catch { return 'onboarding'; }
});
useEffect(() => {
  try { localStorage.setItem('lhs_screen', screen); } catch {}
}, [screen]);
```
Replace the `useState` in `App.jsx`. Same for `navTab`. Refresh = stay where you were.

**D4. Single source of FREE_ENTRY_MODE.** New `src/hooks/useEntryMode.js`:
```js
export function useEntryMode() {
  return useMemo(() => ({
    isFree: import.meta.env.VITE_FREE_ENTRY_MODE === 'true',
    feeWld: Number(import.meta.env.VITE_ENTRY_FEE_WLD ?? 5),
  }), []);
}
```
Replace 3 inline `import.meta.env.VITE_FREE_ENTRY_MODE === "true"` reads in Onboarding + Onboarding step 2 + BrowserWalletPay. The `EntryFeeChips` copy on Onboarding step 2 reads from this hook.

**D5. EarlyBadge follows the user.** Today `TrustBadge` accepts `showEarlyBadge` but only `Onboarding.jsx` step 3 passes it. Make `GameHome` pass it too (where TrustBadge is already rendered in the top bar). Result: the "Early" star chip shows on every post-signup screen, not just step 3.

**Files touched:** `Onboarding.jsx`, `GameHome.jsx`, `App.jsx`, `src/hooks/useScreenState.js` (new), `src/hooks/useEntryMode.js` (new), `src/components/prelaunch/*` (new), `src/components/ui/*` (new).

### Workstream E — Closed loop / no dead zones (5 → 9)

**E1.** First-paint splash (A1) closes the white flash.
**E2.** Suspense skeletons (A3) close the 5 lazy-chunk dead zones.
**E3.** Chat loading/empty/error (A4) closes the "no UI at all" gap.
**E4.** Verify `usesDemoState` is visible. Already rendered by `ModeBanner` — confirm the bar appears on `/api/game/state` failure with a manual refresh CTA. If not, add one.
**E5.** PWA install. Add a manual "Install app" link in the GameHome footer that calls `pwaPrompt.prompt()` if available, else links to a tiny `install.html` page that explains World App + browser-PWA paths.
**E6.** Sound toggle position. The fixed top-right toggle (`App.jsx`) overlaps the count badge on Onboarding step 0. Move it to a `BottomNav` trailing slot when in-game, and to a footer link when on Onboarding. This is a 10-line move.
**E7.** Friend-joined empty state. If `you.referralCount > 0` but none of those invites have reserved yet, render "Your invite is out there — share to your group chat" instead of a bare count. C2 covers the positive case.

**Files touched:** `App.jsx`, `BottomNav.jsx`, `ModeBanner.jsx`, `GameHome.jsx`, `Onboarding.jsx`, `src/components/ui/NetworkPill.jsx`, `public/install.html` (new).

## Implementation order (what depends on what)

```
A1 (splash) ──────────────────────────────────────── independent
A2 (ScreenLoader primitive) ──► A3 (suspense skeletons) ──► A4 (Chat UI)
B1 (Self dynamic import) ──► A3 needs the loader too
B2 (RoundProvider retry) ──► E4 (ModeBanner surfaces it)
B3 (prefetch on hover) ──► A3 done
B4 (stop swallowing errors) ──► A4
B5 (verify bundle) ──► after B1
C1 (move SharePanel) ──► D1 (prelaunch composition)
C2 (friend-joined) ──► D1
C3 (DailyPrompt honesty) ──► independent
C4 (Discord link) ──► independent
C5 (rules deep-link) ──► independent
D1 (consolidate prelaunch) ──► C1, C2 done
D2 (delete dead code) ──► D1 done
D3 (persist screen state) ──► A4 done (because Chat deep state on reload)
D4 (useEntryMode) ──► independent
D5 (EarlyBadge follows) ──► D1 done
E5 (PWA manual install) ──► independent
E6 (sound toggle position) ──► A1 done
E7 (friend-joined empty) ──► C2 done
```

Critical path: **A2 → A3 → A4 → D1 → C1 → C2 → B1 → B5 → E1 → E6 → ship**.

That's 11 sequential tasks; everything else is parallelisable.

## What "9/10" looks like — acceptance criteria

For each axis, define a measurable gate:

| Axis | Current | 9/10 gate |
|---|---|---|
| Loading | 4 | Splash on first paint; all 5 lazy screens have skeleton; Chat has loading/empty/error; no white flash ≥ 100 ms |
| Performance | 7 | Main bundle ≤ 200 kB gz; SelfVerify dynamic-loaded; no silent catch on user-blocking paths; `usesDemoState` is surfaced within 1s of failure |
| Engagement | 7 | SharePanel on every prelaunch surface; friend-joined social proof; DailyPrompt copy is honest; community link in footer |
| Cogency | 5 | One prelaunch surface (`PrelaunchPanel`); TrustBadge with EarlyBadge follows the user; `useEntryMode()` is the only `FREE_ENTRY_MODE` reader; screen state persists across refresh |
| Closed loop | 5 | Splash + skeletons + Chat UI + demo-state banner + manual PWA install + sound toggle repositioned |

Hard checks before launch:

```bash
npm run lint && npm run build && npm run test:run
# All green

# Bundle inspection
ls -la dist/assets/index-*.js dist/assets/esm-*.js
# index-*.js < 200 kB
# esm-*.js only loaded when /self step is hit

# Manual smoke (prelaunch)
# 1. Hard-refresh / — splash shows, no white flash
# 2. Tap "Vote" — skeleton for 100 ms, then Feed renders
# 3. Refresh while on /chat — Chat opens immediately, no "Loading…" stuck
# 4. Pull the network — GameHome shows amber "demo state" pill, refresh button works
# 5. Tap share buttons — X compose pre-filled, Warpcast compose pre-filled, copy works
# 6. Refresh while on step 3 — stay on step 3
# 7. Inspect SelfVerify — its chunks aren't in dist/assets/ until the verify step is reached
```

## Risk register

| Risk | Mitigation |
|---|---|
| `usePolling` is the polling hook — but `Chat` rolls its own `loadMessages` callback. Reusing the hook for Chat could regress tab-blur behaviour. | Add a quick unit test for Chat that asserts the request fires when the tab regains focus, mirroring Leaderboard. |
| Dynamic-importing SelfVerify may push the Self chunk to > 1 MB on its own. That's OK because it's route-scoped, but verify in B5. | If Self chunk is > 1.5 MB, the right move is to mark `@selfxyz/core` as a route chunk and rely on vite's chunker; revisit later. |
| Persisting `screen` in localStorage means a deep link can land the user in a non-Onboarding state even after logout. | On logout, clear `lhs_screen` from `WorldProvider.logout()` (we have to add a `logout` method if it doesn't exist — currently logout isn't a first-class method). |
| `useEntryMode` reads `import.meta.env` at module load — fine in Vite, but if anyone migrates to a different bundler this'll need a runtime config. | Out of scope for this plan; document in the new `lib/env.js`. |
| The "Early" badge displays on step 3 only because the existing call site has it; if we add a second call site in GameHome, we need to thread `reservedAt` through the WorldProvider. Already done in the prior commit. | Verify the prop is read; if not, fix in D5. |
| `npm run test:run` includes snapshot tests that might break when Chat re-uses the `usePolling` hook. | Run the test suite after A4. If snapshots fail, the right answer is to delete the snapshot and let the new shape win. |
| The bundle cap change in B5 could mask a real perf regression. | Comment in `vite.config.js` that the cap is for the Self chunk only, and re-measure after the Self step ships. |

## Out of scope (explicit non-goals for this plan)

- New backend endpoints (C3 aggregation, friend-joined notifications). Re-evaluate post-launch.
- Migrating polling → SSE/WebSockets. The existing 15s poll is good enough for a 50-player cohort.
- Auth refresh / SIWE nonce rotation hardening. The current `/api/nonce` flow is fine for the campaign.
- Service worker push-notification logic. Already wired; not the bottleneck.
- A "post-game" end state. Game is in prelaunch — that's not a thing yet.

## Estimated diff

- ~14 files touched, 3 net new files in `components/ui/`, 7 net new files in `components/prelaunch/`, 2 net new hooks
- ≈ 600 lines added, ≈ 250 lines deleted
- One PR / one commit: `ux: close the gaps (loading, perf, engagement, cogency, no dead zones)`
