# NIGHT SHIFT — capture runbook (cover GIF + trailer)

I can't record from here, so this is the exact local procedure. Total:
~2h. Tools: OBS (or QuickTime) + ffmpeg. Record at 1280×800, game at full
frame — crop later, never upscale.

## Shots (maps to docs/ITCH_PAGE.md trailer list)

Record each as a separate take; slate with 2s of the title screen first
for sync. Mute mic; capture game audio only (the klaxon/thud cuts land
on the beat in edit).

1. **Day 1 docket** — slow cursor drift across the two HUMAN rows, rest
   on the riddle. 8s.
2. **Filing → verdict** — select correct card, file, let the staged reveal
   play untouched through the stamp + shake. 15s. (Do NOT skip — the hold
   is the shot.)
3. **Night stamping** — three stamps in rhythm, streak ×3 pop visible. 10s.
4. **Amendment** — enter the amended night, let the full banner play:
   klaxon, lamp flicker, chips struck one by one, ghost line. 12s. This
   is the trailer's center; get two takes.
5. **Finale** — slow scroll of the table, hover the timestamps column,
   select the winning rule, sign. 12s.
6. **Montage pool** — contested ×2 stamp, sub-3s clock, one STRIKE stamp,
   COLLATERAL or LAST HUMAN STANDING title. Grab whatever happens.

## Cover GIF (2–4s loop)

Best source: take 4, trimmed to banner-in → chips struck (loop point on
the flash frames — motion masks the cut). Or take 2's stamp landing.

```sh
# trim (example: seconds 3-6 of amendment.mp4)
ffmpeg -ss 3 -t 3 -i amendment.mp4 -vf "fps=12,scale=630:-1:flags=lanczos" cover-tmp.mp4
# two-pass palette for clean flat colors
ffmpeg -i cover-tmp.mp4 -vf "fps=12,scale=630:-1:flags=lanczos,palettegen" palette.png
ffmpeg -i cover-tmp.mp4 -i palette.png -lavfi \
  "fps=12,scale=630:-1:flags=lanczos[x];[x][1:v]paletteuse" cover.gif
```

Keep it under ~3MB (itch cover limit headroom). No strobing — our palette
is safe, but keep the flicker take OUT of the loop; use chips-only.

## Trailer assembly

- 50s, Tell-Show-Repeat cards from ITCH_PAGE.md (white mono text on the
  night background — matches the game, zero design work).
- Cut on the stamp thud and klaxon hits. Game audio only, no library
  music (keeps the CC-BY attribution to the one vendored track).
- End slate 4s: title · Game Off 2026 · play in your browser · itch URL.
- Export 1080p, upload to the itch page top + link in the jam submission.

## Upload checklist additions (page ops)

- Cover GIF uploaded + still cover as fallback thumbnail.
- Trailer embedded at top of description.
- Secret-URL page: itch dashboard → Edit game → Visibility → "Restricted:
  anyone with the link" — use for the PLAYTEST.md session, never public.
- Post-jam: flip visibility public, enable tip jar (Edit game →
  Pricing → "Pay what you want", minimum 0) — see PWYW ladder below.
