# Future Roadmap — Last Human Standing

These features are planned for **after** the closed beta validates the core game loop.
Do not build these until we have data from 25+ real users playing through at least one full cohort.

---

## Phase 1: Post-Beta Polish (1-2 months after beta)

### Real-time updates
- Replace 15s polling with Server-Sent Events (SSE) for live vote counts, leaderboard changes, and round transitions
- `src/hooks/usePolling.js` can be retired once SSE is live

### Demo mode
- Let observers watch live rounds without paying
- Spectator-only feed with delayed submission reveals
- "Join next round" CTA for spectators

### UX improvements
- Vote quorum tooltips (explain dynamic thresholds)
- Trust tier badges on submission cards (verified vs provisional)
- Leaderboard elimination reasons (too slow vs flagged by community)
- Loading skeletons for async screens

### Bundle optimization
- Audit dependency tree (framer-motion, wagmi, viem are the heaviest)
- Tree-shake unused World ID code for Celo-only deployments
- Add CDN configuration for static assets (Vercel or Cloudflare)

---

## Phase 2: Growth Mechanics (3-6 months, after PMF signal)

### Monetization
- **Cosmetic marketplace**: avatar frames, submission borders, chat effects — purchasable with WLD/cUSD
- **Premium tier**: 5 WLD entry for bonus features (double infiltration attempts, custom badges)
- **Sponsored rounds**: brands sponsor daily themes (e.g., "AT A NIKE STORE") with boosted prize pools
- **"Humanity Plus" subscription**: monthly recurring for free entries + exclusive cosmetics

### Viral mechanics
- **Referral visualizations**: show invitation network trees
- **Streak rewards**: bonus cosmetics for consecutive daily check-ins
- **Shareable moments**: auto-generate highlight reels of best check-ins for social sharing

### Farcaster Snaps (post-launch, week 2+)
- Add a snap handler behind content negotiation on the share URL (HTML for browsers, snap JSON for the Farcaster client)
- Snap UI: `item` for check-in header, `bar_chart` for live vote tallies, `toggle_group` for HUMAN/SUS, `button` with `submit` to a new `/api/snap/vote` endpoint
- Gate behind a feature flag and a client-version check; re-evaluate when the beta spec graduates
- See [FARCASTER.md](./FARCASTER.md#future-farcaster-snaps-post-launch-week-2) for the full plan and rationale

### Retention
- **Achievement system**: badges for diverse locations, voting accuracy, infiltration mastery
- **Seasonal progression**: 3-month cycles with battle pass (free + premium tracks)
- **Guild/clan system**: team-based competition within cohorts
- **Spectator mode**: live watch parties with chat for non-participants

---

## Phase 3: Scale (6-12 months, only if growth warrants)

- Multi-cohort support (parallel games with separate prize pools)
- Tournament modes (weekly high-stakes events, 5-10 WLD entry)
- Regional variants (different themes by geography)
- Data insights product (anonymized, aggregated movement/voting patterns)
- Advanced anti-cheat (EXIF deduplication, velocity spoof detection)
- On-chain prize distribution automation (multi-sig or smart contract)

---

## Metrics to Track (post-beta)

| Category | Metric |
|----------|--------|
| Acquisition | Referral conversion rate, organic social shares |
| Engagement | DAU/WAU, submission completion rate, voting participation |
| Retention | Day 1/7/30 retention, return after elimination |
| Monetization | ARPU, conversion to premium, marketplace volume |

---

## Principles

1. **Validate before building** — every feature above needs user data justifying it
2. **Fairness first** — paying advantages must never break core game integrity
3. **Web3 native** — leverage blockchain transparency for trust, not just payments
4. **Community first** — monetize enhancement, not core gameplay
