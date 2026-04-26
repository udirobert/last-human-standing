# Last Human Standing (World Mini App)

A mobile-first Mini App concept: **a daily survival game for verified humans**.

Players:
- authenticate via **World Wallet (SIWE via MiniKit)**
- pay a small **entry fee** into a prize pool (via **MiniKit Pay**)
- check in daily with proof (signed message via **MiniKit Sign Message**)
- trash talk / coordinate via **World Chat (MiniKit Chat)**

## Local development

```bash
npm i
npm run dev:all
```

In a normal browser, MiniKit commands will fall back and some actions will be simulated.
For the real flow, open the app **inside World App**.

## Configuration

Create a `.env` file (Vite style) and set:

```bash
VITE_PRIZE_POOL_ADDRESS=0xYourPrizePoolReceiverAddress

# Backend verification (optional but recommended for “serious app” points)
WORLD_APP_ID=app_xxxxx
WORLD_DEV_PORTAL_API_KEY=your_dev_portal_api_key

# Local demo convenience (ONLY for local dev)
DEV_BYPASS_VERIFICATION=true
```

## Hackathon submission

See `submission.md` for the write-up (problem, solution, World Stack usage, demo flow).
