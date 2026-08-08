import * as fs from "fs";
import * as path from "path";
import { ethers, network } from "hardhat";
import type { HDNodeWallet } from "ethers";
import { BattleRoyale__factory } from "../typechain-types";

// Demo-only bot match: spins up throwaway funded wallets that play a full
// game against the real deployed contract (real transactions, real gas,
// real prize payout) without needing any human players. Point the Arena
// screen (/arena) at the same contract before running this to watch it
// play out live.
//
//   cd chain
//   npm run simulate
//
// Tunable via env: SIM_BOT_COUNT, SIM_TICK_MS, SIM_BOT_FUND_MON.

const BOT_COUNT = Number(process.env.SIM_BOT_COUNT ?? 4);
const TICK_MS = Number(process.env.SIM_TICK_MS ?? 900);
const BOT_FUND_MON = process.env.SIM_BOT_FUND_MON ?? "0.05";
const MAX_DURATION_MS = 10 * 60 * 1000;

const ENTRY_FEE = ethers.parseEther("0.01");
const ATTACK_FEE = ethers.parseEther("0.001");
const SHIELD_FEE = ethers.parseEther("0.001");
const HEAL_FEE = ethers.parseEther("0.002");
const POWER_ATTACK_FEE = ethers.parseEther("0.003");

const STATUS_NAMES = ["Waiting", "Active", "Finished"] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function randomInt(maxExclusive: number) {
  return Math.floor(Math.random() * maxExclusive);
}

type Action = "attack" | "power" | "shield" | "heal";

function pickAction(
  self: { alive: boolean; shielded: boolean; hp: bigint; healsUsed: bigint; attackReadyAt: bigint; powerReadyAt: bigint },
  now: number,
): Action | null {
  const options: Action[] = [];
  const weights: number[] = [];

  if (self.attackReadyAt <= now) {
    options.push("attack");
    weights.push(5);
  }
  if (self.powerReadyAt <= now) {
    options.push("power");
    weights.push(2);
  }
  if (!self.shielded) {
    options.push("shield");
    weights.push(1);
  }
  if (self.hp < 3n && self.healsUsed < 2n) {
    options.push("heal");
    weights.push(1);
  }
  if (options.length === 0) return null;

  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < options.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return options[i];
  }
  return options[options.length - 1];
}

async function main() {
  const [owner] = await ethers.getSigners();
  if (!owner) {
    throw new Error(
      "No owner signer loaded. Set DEPLOYER_PRIVATE_KEY in chain/.env — it must be the wallet that deployed BattleRoyale.",
    );
  }

  const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`No deployment found for network "${network.name}" at ${deploymentFile}. Deploy the contract first.`);
  }
  const { address } = JSON.parse(fs.readFileSync(deploymentFile, "utf8")) as { address: string };

  const game = BattleRoyale__factory.connect(address, owner);

  console.log(`Network:  ${network.name}`);
  console.log(`Contract: ${address}`);
  console.log(`Owner:    ${owner.address}`);
  console.log(`Bots:     ${BOT_COUNT}`);

  const currentOwner: string = await game.owner();
  if (currentOwner.toLowerCase() !== owner.address.toLowerCase()) {
    throw new Error(
      `DEPLOYER_PRIVATE_KEY (${owner.address}) is not the contract owner (${currentOwner}). ` +
        "startGame/resetMatch are onlyOwner — use the wallet that deployed the contract.",
    );
  }

  const status = Number(await game.matchStatus());
  if (status === 1) {
    throw new Error("Match is already Active. Wait for it to finish, or reset it from /admin, then rerun.");
  }
  if (status === 2) {
    const prizePool: bigint = await game.prizePool();
    if (prizePool > 0n) {
      throw new Error(
        "Previous match finished with an unclaimed prize sitting in the contract. " +
          "The winner must claim it (see the wallet file the last run printed) before a reset is allowed.",
      );
    }
    console.log("\nPrevious match finished and already claimed — resetting for a fresh demo match...");
    const resetTx = await game.resetMatch();
    await resetTx.wait();
  }

  // ---- 1. Generate + fund throwaway bot wallets ----
  const bots: HDNodeWallet[] = Array.from({ length: BOT_COUNT }, () =>
    ethers.Wallet.createRandom().connect(ethers.provider),
  );

  const walletsOutDir = path.join(__dirname, "..", "sim-runs");
  fs.mkdirSync(walletsOutDir, { recursive: true });
  const walletsOutFile = path.join(walletsOutDir, `${Date.now()}.json`);
  fs.writeFileSync(
    walletsOutFile,
    JSON.stringify(
      bots.map((bot) => ({ address: bot.address, privateKey: bot.privateKey })),
      null,
      2,
    ),
  );
  console.log(`\nBot wallets saved to ${path.relative(process.cwd(), walletsOutFile)} (only needed if a run gets interrupted).`);

  const fundAmount = ethers.parseEther(BOT_FUND_MON);
  const ownerBalance: bigint = await ethers.provider.getBalance(owner.address);
  const totalNeeded = fundAmount * BigInt(BOT_COUNT);
  if (ownerBalance < totalNeeded) {
    throw new Error(
      `Owner balance (${ethers.formatEther(ownerBalance)} MON) is below the ${ethers.formatEther(totalNeeded)} MON needed to fund ${BOT_COUNT} bots at ${BOT_FUND_MON} MON each. Fund the owner wallet or lower SIM_BOT_FUND_MON.`,
    );
  }

  console.log(`\nFunding ${BOT_COUNT} bot wallets with ${BOT_FUND_MON} MON each...`);
  for (const bot of bots) {
    const tx = await owner.sendTransaction({ to: bot.address, value: fundAmount });
    await tx.wait();
    console.log(`  funded ${short(bot.address)}`);
  }

  // ---- 2. Bots join ----
  console.log(`\nBots joining...`);
  for (const bot of bots) {
    const tx = await game.connect(bot).joinGame({ value: ENTRY_FEE });
    await tx.wait();
    console.log(`  ${short(bot.address)} joined`);
  }

  // ---- 3. Start the match ----
  const startTx = await game.startGame();
  await startTx.wait();
  console.log(`\nMatch started — open /arena in a browser now if you haven't already.\n`);

  // ---- 4. Battle loop ----
  const startedAt = Date.now();
  while (true) {
    if (Date.now() - startedAt > MAX_DURATION_MS) {
      throw new Error("Simulation exceeded its 10 minute safety limit — aborting. Check /admin for match state.");
    }

    const liveStatus = Number(await game.matchStatus());
    if (liveStatus !== 1) break;

    const now = Math.floor(Date.now() / 1000);
    const states = await Promise.all(bots.map((bot) => game.players(bot.address)));

    await Promise.all(
      bots.map(async (bot, i) => {
        const self = states[i];
        if (!self.alive) return;

        const action = pickAction(self, now);
        if (!action) return;

        const connected = game.connect(bot);
        try {
          if (action === "shield") {
            const tx = await connected.shield({ value: SHIELD_FEE });
            await tx.wait();
            console.log(`  ${short(bot.address)} raised a shield`);
            return;
          }
          if (action === "heal") {
            const tx = await connected.heal({ value: HEAL_FEE });
            await tx.wait();
            console.log(`  ${short(bot.address)} healed`);
            return;
          }

          const alivePool = bots.filter((other, j) => j !== i && states[j].alive);
          if (alivePool.length === 0) return;
          const target = alivePool[randomInt(alivePool.length)];

          if (action === "power") {
            const tx = await connected.powerAttack(target.address, { value: POWER_ATTACK_FEE });
            await tx.wait();
            console.log(`  ${short(bot.address)} power-attacked ${short(target.address)}`);
          } else {
            const tx = await connected.attack(target.address, { value: ATTACK_FEE });
            await tx.wait();
            console.log(`  ${short(bot.address)} attacked ${short(target.address)}`);
          }
        } catch (error) {
          // Expected occasionally — two bots can target the same player in
          // the same tick and race a cooldown/liveness check on-chain.
          console.log(`  ${short(bot.address)} action reverted, skipping this tick`);
        }
      }),
    );

    await sleep(TICK_MS);
  }

  // ---- 5. Winner claims ----
  const winnerAddress: string = await game.winner();
  const winnerBot = bots.find((bot) => bot.address.toLowerCase() === winnerAddress.toLowerCase());
  const prizePool: bigint = await game.prizePool();

  console.log(`\nMatch finished. Winner: ${winnerAddress}`);

  if (winnerBot && prizePool > 0n) {
    const claimTx = await game.connect(winnerBot).claimPrize();
    const receipt = await claimTx.wait();
    console.log(`Winner claimed ${ethers.formatEther(prizePool)} MON (tx: ${receipt?.hash}).`);
  }

  console.log(`\nDone. Bot wallets are in ${path.relative(process.cwd(), walletsOutFile)} if you want to inspect them further.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
