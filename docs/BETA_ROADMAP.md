# Closed Beta Roadmap — Last Human Standing

**Target**: 25-person closed beta on Celo (cUSD/USDC entry)

---

## Pre-Launch Checklist

### Infrastructure
- [ ] Deploy Celo prize pool wallet (personal EOA is fine for beta)
- [ ] Set `VITE_CELO_PRIZE_POOL_ADDRESS` in production `.env`
- [ ] Set `COHORT_SIZE=25` in production `.env`
- [ ] Set `GAME_LAUNCH_AT` to beta start date (3-5 days out)
- [ ] Set `DAILY_SURVIVAL_CAP=12` for Day 1 (shrinks: 12 → 6 → 3 → 1)
- [ ] Verify Supabase project is running and schema is applied
- [ ] Verify storage bucket (`checkins`) exists
- [ ] Set `ADMIN_TOKEN` to a strong random value
- [ ] Generate and set VAPID keys for push notifications (optional but recommended)

### Celo Payment Flow
- [ ] Test cUSD payment on Celo Alfajores testnet first (`VITE_USE_CELO_TESTNET=true`)
- [ ] Verify `POST /api/pay/browser-celo-confirm` returns session cookie
- [ ] Verify authenticated endpoints work after Celo payment (`GET /api/me`)
- [ ] Test check-in flow after Celo payment
- [ ] Test voting flow after Celo payment

### Game Operations
- [ ] Create Day 1 round via admin API before launch
- [ ] Prepare 3-5 round themes in advance (AT A CAFE, AT A PARK, etc.)
- [ ] Test admin close-day flow
- [ ] Test auto-round scheduler (`advance_rounds` RPC)
- [ ] Verify push notifications fire on round open/close

### User Experience
- [ ] Test onboarding flow end-to-end on mobile (MetaMask + Celo)
- [ ] Test "Explore demo" path for observers
- [ ] Verify feed loads submissions with photos
- [ ] Verify leaderboard shows correct standings
- [ ] Test error recovery (network drops, wallet failures)

---

## Beta Launch Steps

1. **T-3 days**: Set `GAME_LAUNCH_AT`, create Day 1 round (status: `scheduled`)
2. **T-0**: Share beta URL with 25 testers (Celo community + WLD team)
3. **Day 1 opens**: Admin sets round status to `open` (or auto-scheduler handles it)
4. **Day 1 closes**: Run `POST /api/admin/close-day` with `{"day": 1}`
5. **Day 2+**: Create next round, shrink survival cap, repeat
6. **Final day**: Last survivor wins the prize pool

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
- Single cohort only (no multi-cohort support)
- Browser PoH is optional (World ID / Self Protocol not required for Celo beta)
- No spectator mode (observers can use demo mode)

---

## Post-Beta Priorities

After the beta validates the core loop, prioritize:
1. **Replace polling with SSE** for real-time vote/leaderboard updates
2. **On-chain prize distribution** (automate winner payout)
3. **Demo mode improvements** (let observers watch live rounds)
4. **Vote quorum tooltips** (explain dynamic thresholds to users)
5. **Bundle optimization** (audit dependencies, tree-shake unused code)

See [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md) for longer-term strategy.
