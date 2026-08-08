# Monad Battle Royale

A real-time multiplayer elimination game where every action — join, attack,
shield, heal, power attack, claim — is a real transaction on Monad Testnet.

## Repo layout

- **`frontend/`** — the actual app (Next.js). Landing page, mobile player
  screen (`/game`), spectator dashboard (`/arena`), host controls (`/admin`).
  This is what gets deployed to Vercel.
- **`chain/`** — the Solidity contract (`BattleRoyale.sol`), its tests, and
  the deploy script. See `chain/deployments/monadTestnet.json` for the
  currently deployed contract address.
- **`index.html`** — a standalone brand style guide (fonts, colors, icons,
  voice/tone). Not part of the app; open it directly in a browser or publish
  it separately. `vercel.json` at the repo root is what keeps Vercel from
  deploying this file instead of the actual app — see below.

## Running locally

```bash
cd frontend
npm install
cp .env.example .env.local   # already filled in with the current deployment's values
npm run dev
```

## Deploying to Vercel

This is a monorepo — the Next.js app lives in `frontend/`, not the repo
root. The root-level `vercel.json` handles that automatically (points
Vercel's install/build/dev commands and output directory into `frontend/`),
so importing this repo into Vercel as-is should build the correct app
without any manual "Root Directory" project setting. See `frontend/README.md`
for the environment variables Vercel needs.
