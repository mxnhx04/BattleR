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
  it separately. This is a plain static file sitting at the repo root next
  to the real app, which is exactly why the Vercel **Root Directory**
  project setting below is required — without it, Vercel finds this file
  first and deploys it instead of the Next.js app.

## Running locally

```bash
cd frontend
npm install
cp .env.example .env.local   # already filled in with the current deployment's values
npm run dev
```

## Running a demo without real players

`chain/scripts/simulate.ts` plays a full match against the real deployed
contract using throwaway bot wallets — real join/attack/shield/heal/claim
transactions, no humans clicking. Useful for a quick live demo: point
`/arena` at the contract, then run the bots and watch it play out.

```bash
cd chain
cp .env.example .env   # DEPLOYER_PRIVATE_KEY must be the contract owner
npm install
npm run simulate
```

Tunable via env vars: `SIM_BOT_COUNT` (default 4), `SIM_TICK_MS` (default
900), `SIM_BOT_FUND_MON` (default 0.05 — MON sent to each bot wallet to
cover its entry fee, action fees, and gas). The owner wallet funds the
bots, so it needs roughly `SIM_BOT_COUNT × SIM_BOT_FUND_MON` MON available.

The match must be in `Waiting` status before running this — reset it from
`/admin` first if a previous match is still `Active` or has an unclaimed
prize sitting in it.

## Deploying to Vercel

This is a monorepo — the Next.js app lives in `frontend/`, not the repo
root. Vercel detects the Next.js version by reading `package.json` at
whatever it considers the project root, so **this one setting is
required**:

1. In the Vercel project → **Settings → General → Root Directory** → set
   it to `frontend`, then save.
2. Redeploy (Settings changes don't retrigger a build on their own —
   go to **Deployments** → **⋯** on the latest one → **Redeploy**).

A `vercel.json`/`buildCommand` override at the repo root does *not* fix
this on its own — Vercel still reads `package.json` from the Root
Directory to detect the Next.js version before any custom build command
runs, and there's no `package.json` at the repo root. Root Directory is
the only setting that actually changes where that detection happens.

See `frontend/README.md` for the environment variables Vercel needs.
