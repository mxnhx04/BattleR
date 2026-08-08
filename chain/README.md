# Monad Battle Royale — Contract

Phase 2 of the hackathon build: `BattleRoyale.sol`, the authoritative,
on-chain source of truth for match state. The frontend's mock engine
(`frontend/src/lib/matchStore.ts`) was deliberately shaped to match this
contract's functions and events, so wiring the real thing up in Phase 4
should mostly be a matter of swapping mock calls for `wagmi`/`viem` calls.

## What's in here

- `contracts/BattleRoyale.sol` — the game contract: `joinGame`, `startGame`,
  `attack`, `shield`, `heal`, `powerAttack`, `claimPrize`, `resetMatch`
- `contracts/test/ReentrantAttacker.sol` — a test-only contract used to
  exercise the `claimPrize` reentrancy guard; not part of the deployed game
- `test/BattleRoyale.ts` — 36 tests covering the security checklist below
- `hardhat.config.ts` — network config; **Monad Testnet RPC/chainId are
  still placeholders**, to be filled in during Phase 3 from the official
  Monad docs, not guessed

## Run it

```bash
npm install
npm test          # 36 tests
npm run compile
```

## Design decisions worth knowing

- **Economics mirror the frontend exactly** (`ENTRY_FEE`, `ATTACK_FEE`,
  etc. in the contract match `frontend/src/lib/economy.ts`). Fees are
  charged with strict equality (`msg.value != FEE` reverts) — no partial
  payments or refund logic to reason about.
- **Winner detection doesn't scan every player on every action.** An
  `aliveCount` counter is decremented on each elimination; only when it
  hits exactly 1 does the contract do a one-time loop over `playerAddresses`
  to identify who's left. That loop runs once per match, not once per
  transaction.
- **Prizes are claimed, not pushed.** `claimPrize()` is a separate,
  `nonReentrant` call the winner makes themselves (checks-effects-
  interactions: `prizePool` is zeroed before the external transfer). This
  keeps the attack/powerAttack calls that can end a match free of any
  outbound transfer, which is where reentrancy risk would otherwise live.
- **Custom errors**, not string reverts — cheaper and, once you know the
  names (`WrongFee`, `OnCooldown`, `NotAlive`, ...), just as readable.
- **`resetMatch()`** is a host-only convenience beyond the strict spec,
  added so the same deployed contract can run multiple test/demo matches
  without redeploying. It's blocked mid-match and blocked while a finished
  match still owes MON to an unclaimed winner, so it can never strand funds.

## Security checklist (from the project brief)

- [x] Dead players cannot act (`NotAlive` on every action)
- [x] Players cannot attack themselves (`CannotTargetSelf`)
- [x] Payment amounts are checked exactly (`WrongFee`)
- [x] Healing is capped at max HP and at 2 heals/match, independently
- [x] Shield blocks exactly one hit, then is consumed
- [x] Winner detection is correct and gas-bounded
- [x] Prize-pool accounting: entry + action fees in, exactly one payout out
- [x] Reentrancy: `claimPrize` is CEI + `nonReentrant`, tested against an
      actual reentrant attacker contract
- [x] Access control: `startGame`/`resetMatch` are owner-only
      (OpenZeppelin `Ownable`)

## A note on this sandbox

Hardhat normally downloads the Solidity compiler from
`binaries.soliditylang.org` on first compile. That host isn't reachable
from this sandboxed session's network policy, so compilation here runs
through Hardhat's own solc-js fallback, seeded from the `solc` npm package
(fetched via the already-permitted npm registry) instead. This is purely a
local cache setup on this machine (`~/.cache/hardhat-nodejs`) — it isn't
part of the repo, and it won't affect anyone else running `npm install &&
npx hardhat compile` with normal internet access.
