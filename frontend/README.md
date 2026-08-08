# Monad Battle Royale — Frontend

Phase 1 of the hackathon build: a fully interactive, visually complete
prototype of the game, driven by a **mocked** in-memory match engine
(`src/lib/matchStore.ts`) instead of the real smart contract. It exists to
validate the UX — targeting, cooldowns, elimination, spectator mode, the
live transaction counter — before wiring anything to Monad.

## Run it

```bash
npm install
npm run dev
```

- `/` — landing page
- `/game` — mobile player screen (join, attack/shield/heal/power, target picker)
- `/arena` — big-screen spectator dashboard (players, prize pool, tx counter, live feed)
- `/admin` — minimal host controls (start/reset match, raw state dump)

## What's mocked vs. real (for now)

Every action already goes through a "submit → pending → confirm → mutate
state → log event" pipeline shaped exactly like a real transaction, so the
UI won't need to change shape once it's wired to the contract — only where
the data comes from. `matchStore.ts` documents this at the top of the file.

Known limitation: match state currently lives in one browser tab's memory
(a module-level store), so `/arena` and `/game` don't share state across
tabs/devices yet. That's expected to be replaced by on-chain event
subscriptions in Phase 4, which makes the contract the real shared state
across every device at once.

## Next up

See the project plan: Solidity contract (`BattleRoyale.sol`) for join /
attack / shield / heal / power / winner settlement, tests, deploy to Monad
Testnet, then swap `matchStore.ts`'s mock actions for real `wagmi`/`viem`
calls and event subscriptions.
