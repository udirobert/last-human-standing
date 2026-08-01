# Closed Beta Roadmap — Last Human Standing

**Target**: 25-person closed beta on Celo (cUSD/USDC entry)

---

## Pre-Launch Checklist

### Infrastructure
- [x] Deploy Celo prize pool wallet (personal EOA is fine for beta)
- [x] Set `VITE_CELO_PRIZE_POOL_ADDRESS` in production `.env`
- [ ] Set `COHORT_SIZE=25` in production `.env` — run `bash scripts/relaunch-prep.sh --update-env`
- [ ] Set `GAME_LAUNCH_AT` to beta start date — **2026-07-29T18:00:00Z**
- [x] Set `DAILY_SURVIVAL_CAP` — now automatic via `survival_cap_for_day()` (40→20→8→3→1)
- [x] Verify Supabase project is running and schema is applied
- [x] Verify storage bucket (`checkins`) exists
- [x] Set `ADMIN_TOKEN` to a strong random value
- [x] Generate and set VAPID keys for push notifications

### Celo Payment Flow
- [ ] Test cUSD payment on Celo Alfajores testnet first (`VITE_USE_CELO_TESTNET=true`)
- [ ] Verify `POST /api/pay/browser-celo-confirm` returns session cookie
- [ ] Verify authenticated endpoints work after Celo payment (`GET /api/me`)
- [ ] Test check-in flow after Celo payment
- [ ] Test voting flow after Celo payment

### Game Operations
- [x] Create Day 1 round via admin API before launch — **all 5 rounds pre-created** (migration 010)
- [x] Prepare 3-5 round themes in advance — Café, Park, Friend, Bookstore, Sunrise
- [ ] Test admin close-day flow
- [ ] Test auto-round scheduler (`advance_rounds` RPC)
- [x] Verify push notifications fire on round open/close
- [x] **Wildcard revival** — jury votes one eliminated player back on Day 4
- [x] **Streak bonuses** — 3-day streak = +1 jury ticket, 5-day = +3
- [x] **Automatic winner payout** — `ariaBroadcastPayoutTx()` on winner detection
- [x] **End-game tiebreaker** — `resolve_no_survivors()` if everyone eliminated

### User Experience
- [ ] Test onboarding flow end-to-end on mobile (MetaMask + Celo)
- [ ] Test "Explore demo" path for observers
- [ ] Verify feed loads submissions with photos
- [ ] Verify leaderboard shows correct standings
- [ ] Test error recovery (network drops, wallet failures)

---

## Beta Launch Steps

1. **T-3 days**: Set `GAME_LAUNCH_AT` (`2026-07-29T18:00:00Z`), apply migrations 023–024, run `relaunch-prep.sh --update-env`
2. **T-1 day**: Seed the prize pool with cUSD/WLD, run reset SQL, smoke-test
3. **T-0**: Share beta URL with 25 testers (Celo community + WLD team)
4. **Day 1 opens**: Auto-scheduler opens the round at `opens_at`; cap = 40 (soft first cut)
5. **Day 1 closes**: `advance_rounds()` calls `close_day()` — verdicts, DQ-and-replace, streak bonuses, eliminations
6. **Day 2–3**: Cap decays to 20, then 8. Themes escalate (Park, Friend)
7. **Day 4**: Cap = 3. After close, wildcard revival triggers — jury votes one player back
8. **Day 5**: Cap = 1. Last survivor wins. Automatic payout via `ariaBroadcastPayoutTx()`
9. **Post-game**: Winner ceremony with payout status + Celoscan link. Share result.

---

## Admin Commands Reference

```bash
# Create a round
curl -X POST https://YOUR_DOMAIN/api/admin/round \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "day": 1,
    "name": "AT A CAFE",
    "place_type": "cafe",
    "survival_cap": 12,
    "opens_at": "2026-06-06T14:00:00Z",
    "closes_at": "2026-06-06T18:00:00Z",
    "prompt": "Show us your cafe — anywhere in the world"
  }'

# Close a day
curl -X POST https://YOUR_DOMAIN/api/admin/close-day \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{"day": 1}'

# Check game state
curl https://YOUR_DOMAIN/api/game/state

# Manually trigger round advancement
curl -X POST https://YOUR_DOMAIN/api/admin/trigger-rounds \
  -H "x-admin-token: $ADMIN_TOKEN"
```

---

## Known Limitations (acceptable for beta)

- Polling at 15s intervals (no SSE/WebSocket yet) — fine for 25 users
- No on-chain prize distribution (manual transfer to winner)
- ~~Single cohort only (no multi-cohort support)~~ — resolved: `cohort_participations` table (migration 026) scopes per-cohort state
- Browser PoH is optional (World ID / Self Protocol not required for Celo beta)
- ~~No spectator mode~~ — resolved: `SpectatorPanel` explains audit/vote/chat role + jury ticket earning for non-players

---

## Post-Beta Priorities

After the beta validates the core loop, prioritize:
1. **Replace polling with SSE** for real-time vote/leaderboard updates
2. **On-chain prize distribution** (automate winner payout)
3. **Demo mode improvements** (let observers watch live rounds)
4. **Vote quorum tooltips** (explain dynamic thresholds to users)
5. **Bundle optimization** (audit dependencies, tree-shake unused code)
6. **Activate Turing-test arena** — ~~foundation shipped~~ fully shipped: x402 agent self-registration (`POST /api/agents/register`), submission pipeline (`POST /api/agents/submit`), end-game reveal UI (`AgentReveal.jsx`), per-voter jury stats (`GET /api/agents/jury-stats`). Flip `AGENTS_ENABLED=true` + `SILENT_VERIFICATION=true` when ready. Migration 026 required for multi-cohort scoping.

See [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md) for longer-term strategy.
