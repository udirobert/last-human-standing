# World App Store — get Last Human Standing discoverable

Prod is already live at https://lasthumanstanding.thisyearnofear.com with
`WORLD_APP_ID` / `VITE_MINI_APP_ID` set on the server. What’s left is **portal
metadata + review submission** so World App users can find it in Mini Apps.

## Why this matters

Deep links / direct URL work today. Store listing is what fills the empty
cohort before Day 1 (3 Aug 2026 18:00 UTC).

## Policy framing (important)

World’s guidelines discourage **chance-based** prize games (RNG winner).
Frame LHS as **skill / presence**:

- Daily theme photo check-in
- Crowd HUMAN/SUS audit
- Survival by showing up + surviving judgment — not a raffle

Avoid “lottery”, “raffle”, “spin”, “random winner” in store copy. Free-entry
lottery weighting can stay in-product; don’t lead with it in the store.

## Checklist

### 1. Developer Portal

1. Open https://developer.world.org → your team → Last Human Standing app
2. Confirm Mini App URL = `https://lasthumanstanding.thisyearnofear.com`
3. Confirm World ID / MiniKit permissions match what the app uses:
   - walletAuth, pay, chat, signMessage, notifications (as enabled)
4. Fill store metadata (use Manus copy when ready):
   - App name: **Last Human Standing** (no “official”)
   - Short + long description
   - Category: games / social (whichever portal offers that fits)
   - Support / contact email

### 2. Store images (from Manus task)

Upload when creatives finish: https://manus.im/app/9jBj7CQc4Lmxwq2F9VTCRv

| Image | Spec |
| --- | --- |
| Logo / icon | Square, non-white background (prefer 1024×1024) |
| Content card | 345×240 design @3x → **1035×720**; keep bottom **94px** free of important detail; minimal text in image |
| Showcase 1–4 | Phone frames of ritual / reserve / audit / survive |
| Meta / hero | Optional OG / banner |

Existing local starters: `public/favicon.png`, `public/og-image.png`,
`public/splash.png`, `public/screenshot1.png`, `public/screenshot2.png`.

### 3. Pre-submit smoke (in World App on phone)

1. Open the Mini App via portal preview / deep link
2. Wallet auth → Reserve path visible
3. World ID verify (if shown) completes
4. Pay path does not 500 (even if you don’t pay in review)
5. Feed loads; no blank screens
6. No World logo / “official” wording

### 4. Submit for review

In Developer Portal → **Submit for review**.

If rejected, World docs say contact **@MateoSauton** on Telegram.

## Faster path for this agent (optional)

World ships a Developer Portal MCP:

```text
https://developer.world.org/api/mcp
```

Create a team API key (`api_…`) under Developer Portal → API keys, then add it
to Cursor MCP config (do **not** commit the key). Once connected, this agent can:

- `get_team_context` / `get_app_config`
- `configure_mini_app` (copy, links, permissions)
- `upload_app_image` (logo, content_card, showcase_*)
- `submit_app_for_review` (only after your explicit OK)

## Until the store lists you

Promote the direct URL + World App open link from Manus social creatives:

`https://lasthumanstanding.thisyearnofear.com`

Reserve seats now — Day 1 opens 3 Aug 2026 18:00 UTC.

## Progress (2026-08-01)

| Step | Status |
| --- | --- |
| Portal API key (`WORLD_ID_API_KEY` = team `api_…`) | Working |
| App id | `app_748acaaab2c27a797788c3fdc4428c50` |
| Live verified listing | Already **verified** (prior metadata) |
| Draft metadata update | `meta_8100f988…` — skill-based copy, Reserve CTA, humans-only |
| Draft images | **Manus creatives uploaded** (logo, content card, 3 showcases, meta tag) |
| Local social pack | `docs/promo-assets/social/*.jpg` + full PNGs in `docs/promo-assets/png/` |
| Submit draft for review | **Awaiting your OK** — say the word to call `submit_app_for_review` |

Manus task: https://manus.im/app/9jBj7CQc4Lmxwq2F9VTCRv
