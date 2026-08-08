# Monad Battle Royale — Frontend

Phase 4 of the hackathon build: the frontend is wired to the real
`BattleRoyale.sol` contract deployed on Monad Testnet
(`chain/deployments/monadTestnet.json`). The contract is the single
source of truth for match state — this app reads and writes it, it
doesn't maintain its own game state anymore.

## Run it

```bash
npm install
cp .env.example .env.local   # already filled in for the current deployment
npm run dev
```

- `/` — landing page
- `/game` — mobile player screen: Privy login, join, attack/shield/heal/power, target picker
- `/arena` — big-screen spectator dashboard (players, prize pool, tx counter, live feed)
- `/admin` — host controls (start/reset match — owner wallet only)

## How it's wired

- **Wallets**: [Privy](https://privy.io) embedded wallets (`src/providers/PrivyProviders.tsx`,
  `src/hooks/useGameWallet.ts`). Email/social login creates a wallet
  automatically — no extension, no seed phrase. Needs
  `NEXT_PUBLIC_PRIVY_APP_ID` in `.env.local`.
- **Reads/writes**: `src/lib/contract/` — `config.ts` defines Monad
  Testnet as a viem chain and a `publicClient`; `actions.ts` wraps every
  contract function (`joinGame`, `attack`, `shield`, `heal`,
  `powerAttack`, `claimPrize`, `startGame`, `resetMatch`) as a
  simulate-then-write call, decoding the contract's custom Solidity
  errors into readable messages.
- **Live state**: `src/hooks/useOnChainMatch.ts` polls contract reads
  and event logs (backfilling from the deployment block) into the same
  `MatchState` shape the old mock engine used, so the UI components
  (`PlayerCard`, `ActivityFeed`, `TxCounter`, etc.) didn't need to
  change. The activity feed and the per-action tx counters are derived
  from emitted events, since the contract itself only tracks totals it
  actually needs (`prizePool`, `aliveCount`), not a breakdown by action
  type.

## Funding a wallet

A fresh embedded wallet has 0 MON. `/game` shows a "fund your wallet"
prompt with the copyable address once you're logged in but can't yet
afford the entry fee — send it testnet MON from the Monad faucet.

## Known limitations

- This was built and verified from a sandboxed environment that could not
  reach either the Monad RPC or Privy's API (an org-level network policy,
  not a Monad-specific issue). Build, lint, typecheck, and graceful
  degradation (no crashes, sensible empty states) are verified; the live
  wallet-login → join → attack → win flow still needs to be run somewhere
  with normal internet access before the real demo.
- `resetMatch()` emits no contract event, so the frontend detects a reset
  structurally (status drops back to `waiting` with zero players) rather
  than from a log — this works but is a bit implicit; worth knowing if
  you're debugging odd state right after a reset.
