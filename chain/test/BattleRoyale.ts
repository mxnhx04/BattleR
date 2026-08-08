import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { BattleRoyale, ReentrantAttacker } from "../typechain-types";

const ENTRY_FEE = ethers.parseEther("0.01");
const ATTACK_FEE = ethers.parseEther("0.001");
const SHIELD_FEE = ethers.parseEther("0.001");
const HEAL_FEE = ethers.parseEther("0.002");
const POWER_ATTACK_FEE = ethers.parseEther("0.003");

const ATTACK_COOLDOWN = 5;
const POWER_ATTACK_COOLDOWN = 15;

const Status = { Waiting: 0, Active: 1, Finished: 2 } as const;

async function deployFixture() {
  const [owner, alice, bob, carol, dave, erin] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("BattleRoyale");
  const game = (await Factory.deploy()) as unknown as BattleRoyale;
  await game.waitForDeployment();
  return { game, owner, alice, bob, carol, dave, erin };
}

async function join(game: BattleRoyale, signer: HardhatEthersSigner) {
  await game.connect(signer).joinGame({ value: ENTRY_FEE });
}

async function attackAfterCooldown(
  game: BattleRoyale,
  attacker: HardhatEthersSigner,
  target: HardhatEthersSigner,
) {
  await time.increase(ATTACK_COOLDOWN);
  return game.connect(attacker).attack(target.address, { value: ATTACK_FEE });
}

describe("BattleRoyale", () => {
  describe("Deployment", () => {
    it("starts Waiting, with the deployer as owner and zeroed state", async () => {
      const { game, owner } = await loadFixture(deployFixture);
      expect(await game.matchStatus()).to.equal(Status.Waiting);
      expect(await game.owner()).to.equal(owner.address);
      expect(await game.prizePool()).to.equal(0n);
      expect(await game.aliveCount()).to.equal(0);
      expect(await game.winner()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("joinGame", () => {
    it("registers the player and adds the entry fee to the prize pool", async () => {
      const { game, alice } = await loadFixture(deployFixture);

      await expect(game.connect(alice).joinGame({ value: ENTRY_FEE }))
        .to.emit(game, "PlayerJoined")
        .withArgs(alice.address, ENTRY_FEE, 1n);

      const p = await game.players(alice.address);
      expect(p.joined).to.equal(true);
      expect(p.alive).to.equal(true);
      expect(p.shielded).to.equal(false);
      expect(p.hp).to.equal(3);
      expect(p.healsUsed).to.equal(0);
      expect(await game.prizePool()).to.equal(ENTRY_FEE);
      expect(await game.aliveCount()).to.equal(1);
      expect(await game.getPlayerCount()).to.equal(1);
      expect(await game.getAllPlayers()).to.deep.equal([alice.address]);
    });

    it("rejects a fee that isn't exactly ENTRY_FEE", async () => {
      const { game, alice } = await loadFixture(deployFixture);
      await expect(
        game.connect(alice).joinGame({ value: ethers.parseEther("0.02") }),
      ).to.be.revertedWithCustomError(game, "WrongFee");
      await expect(
        game.connect(alice).joinGame({ value: 0 }),
      ).to.be.revertedWithCustomError(game, "WrongFee");
    });

    it("rejects joining twice", async () => {
      const { game, alice } = await loadFixture(deployFixture);
      await join(game, alice);
      await expect(join(game, alice)).to.be.revertedWithCustomError(
        game,
        "AlreadyJoined",
      );
    });

    it("rejects joining once the match has started", async () => {
      const { game, owner, alice, bob, carol } = await loadFixture(deployFixture);
      await join(game, alice);
      await join(game, bob);
      await game.connect(owner).startGame();

      await expect(join(game, carol)).to.be.revertedWithCustomError(
        game,
        "WrongStatus",
      );
    });
  });

  describe("startGame", () => {
    it("rejects non-owner callers", async () => {
      const { game, alice, bob } = await loadFixture(deployFixture);
      await join(game, alice);
      await join(game, bob);
      await expect(game.connect(alice).startGame()).to.be.revertedWithCustomError(
        game,
        "OwnableUnauthorizedAccount",
      );
    });

    it("rejects starting with fewer than 2 players", async () => {
      const { game, owner, alice } = await loadFixture(deployFixture);
      await join(game, alice);
      await expect(game.connect(owner).startGame()).to.be.revertedWithCustomError(
        game,
        "NotEnoughPlayers",
      );
    });

    it("flips status to Active and emits GameStarted", async () => {
      const { game, owner, alice, bob } = await loadFixture(deployFixture);
      await join(game, alice);
      await join(game, bob);
      await expect(game.connect(owner).startGame()).to.emit(game, "GameStarted");
      expect(await game.matchStatus()).to.equal(Status.Active);
    });

    it("rejects starting twice", async () => {
      const { game, owner, alice, bob } = await loadFixture(deployFixture);
      await join(game, alice);
      await join(game, bob);
      await game.connect(owner).startGame();
      await expect(game.connect(owner).startGame()).to.be.revertedWithCustomError(
        game,
        "WrongStatus",
      );
    });
  });

  describe("attack", () => {
    async function activeMatch() {
      const fixture = await deployFixture();
      const { game, owner, alice, bob, carol } = fixture;
      await join(game, alice);
      await join(game, bob);
      await join(game, carol);
      await game.connect(owner).startGame();
      return fixture;
    }

    it("rejects play before the match is Active", async () => {
      const { game, alice, bob } = await loadFixture(deployFixture);
      await join(game, alice);
      await join(game, bob);
      await expect(
        game.connect(alice).attack(bob.address, { value: ATTACK_FEE }),
      ).to.be.revertedWithCustomError(game, "WrongStatus");
    });

    it("rejects the wrong fee", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      await expect(
        game.connect(alice).attack(bob.address, { value: ATTACK_FEE * 2n }),
      ).to.be.revertedWithCustomError(game, "WrongFee");
    });

    it("rejects attacking yourself", async () => {
      const { game, alice } = await loadFixture(activeMatch);
      await expect(
        game.connect(alice).attack(alice.address, { value: ATTACK_FEE }),
      ).to.be.revertedWithCustomError(game, "CannotTargetSelf");
    });

    it("rejects a target who never joined", async () => {
      const { game, alice, dave } = await loadFixture(activeMatch);
      await expect(
        game.connect(alice).attack(dave.address, { value: ATTACK_FEE }),
      ).to.be.revertedWithCustomError(game, "TargetNotAlive");
    });

    it("rejects play from an eliminated attacker", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      // Alice hits Bob down to 0 HP (3 hits, waiting out the cooldown each time)
      await game.connect(alice).attack(bob.address, { value: ATTACK_FEE });
      await attackAfterCooldown(game, alice, bob);
      await attackAfterCooldown(game, alice, bob);
      expect((await game.players(bob.address)).alive).to.equal(false);

      await expect(
        game.connect(bob).attack(alice.address, { value: ATTACK_FEE }),
      ).to.be.revertedWithCustomError(game, "NotAlive");
    });

    it("deducts 1 HP, adds the fee to the pool, and emits PlayerAttacked", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      const poolBefore = await game.prizePool();

      await expect(game.connect(alice).attack(bob.address, { value: ATTACK_FEE }))
        .to.emit(game, "PlayerAttacked")
        .withArgs(alice.address, bob.address, false, false, 1, 2);

      expect((await game.players(bob.address)).hp).to.equal(2);
      expect(await game.prizePool()).to.equal(poolBefore + ATTACK_FEE);
    });

    it("enforces the 5s cooldown between attacks from the same player", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      await game.connect(alice).attack(bob.address, { value: ATTACK_FEE });

      await expect(
        game.connect(alice).attack(bob.address, { value: ATTACK_FEE }),
      ).to.be.revertedWithCustomError(game, "OnCooldown");

      await time.increase(ATTACK_COOLDOWN);
      await expect(game.connect(alice).attack(bob.address, { value: ATTACK_FEE }))
        .to.not.be.reverted;
    });

    it("blocks the hit and consumes the shield instead of dealing damage", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      await game.connect(bob).shield({ value: SHIELD_FEE });

      await expect(game.connect(alice).attack(bob.address, { value: ATTACK_FEE }))
        .to.emit(game, "PlayerAttacked")
        .withArgs(alice.address, bob.address, false, true, 1, 3);

      const p = await game.players(bob.address);
      expect(p.hp).to.equal(3);
      expect(p.shielded).to.equal(false);

      // shield is gone, so the next hit lands for real
      await expect(attackAfterCooldown(game, alice, bob))
        .to.emit(game, "PlayerAttacked")
        .withArgs(alice.address, bob.address, false, false, 1, 2);
    });

    it("eliminates the target at 0 HP and decrements aliveCount", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      await game.connect(alice).attack(bob.address, { value: ATTACK_FEE });
      await attackAfterCooldown(game, alice, bob);

      await expect(attackAfterCooldown(game, alice, bob)).to.emit(
        game,
        "PlayerEliminated",
      ).withArgs(bob.address);

      const p = await game.players(bob.address);
      expect(p.hp).to.equal(0);
      expect(p.alive).to.equal(false);
      expect(await game.aliveCount()).to.equal(2); // alice + carol
    });
  });

  describe("shield", () => {
    async function activeMatch() {
      const fixture = await deployFixture();
      const { game, owner, alice, bob } = fixture;
      await join(game, alice);
      await join(game, bob);
      await game.connect(owner).startGame();
      return fixture;
    }

    it("rejects the wrong fee", async () => {
      const { game, alice } = await loadFixture(activeMatch);
      await expect(
        game.connect(alice).shield({ value: SHIELD_FEE * 2n }),
      ).to.be.revertedWithCustomError(game, "WrongFee");
    });

    it("sets shielded and emits PlayerShielded", async () => {
      const { game, alice } = await loadFixture(activeMatch);
      await expect(game.connect(alice).shield({ value: SHIELD_FEE }))
        .to.emit(game, "PlayerShielded")
        .withArgs(alice.address);
      expect((await game.players(alice.address)).shielded).to.equal(true);
    });

    it("rejects shielding twice in a row", async () => {
      const { game, alice } = await loadFixture(activeMatch);
      await game.connect(alice).shield({ value: SHIELD_FEE });
      await expect(
        game.connect(alice).shield({ value: SHIELD_FEE }),
      ).to.be.revertedWithCustomError(game, "AlreadyShielded");
    });
  });

  describe("heal", () => {
    async function activeMatch() {
      const fixture = await deployFixture();
      const { game, owner, alice, bob } = fixture;
      await join(game, alice);
      await join(game, bob);
      await game.connect(owner).startGame();
      return fixture;
    }

    it("rejects the wrong fee", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      await game.connect(bob).attack(alice.address, { value: ATTACK_FEE });
      await expect(
        game.connect(alice).heal({ value: HEAL_FEE * 2n }),
      ).to.be.revertedWithCustomError(game, "WrongFee");
    });

    it("rejects healing at full HP", async () => {
      const { game, alice } = await loadFixture(activeMatch);
      await expect(
        game.connect(alice).heal({ value: HEAL_FEE }),
      ).to.be.revertedWithCustomError(game, "AtMaxHp");
    });

    it("restores 1 HP and emits PlayerHealed", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      await game.connect(bob).attack(alice.address, { value: ATTACK_FEE }); // alice hp 3 -> 2

      await expect(game.connect(alice).heal({ value: HEAL_FEE }))
        .to.emit(game, "PlayerHealed")
        .withArgs(alice.address, 3);
      expect((await game.players(alice.address)).hp).to.equal(3);
    });

    it("enforces the max-2-heals-per-match limit even below max HP", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);

      // Cycle: damage alice, heal her back up — twice (uses up both heals).
      await game.connect(bob).attack(alice.address, { value: ATTACK_FEE });
      await game.connect(alice).heal({ value: HEAL_FEE });
      await attackAfterCooldown(game, bob, alice);
      await game.connect(alice).heal({ value: HEAL_FEE });
      expect((await game.players(alice.address)).healsUsed).to.equal(2);

      // Damage her again so she's below max HP, then the 3rd heal must still
      // fail on the heal-count limit, not the max-HP check.
      await attackAfterCooldown(game, bob, alice);
      expect((await game.players(alice.address)).hp).to.equal(2);
      await expect(
        game.connect(alice).heal({ value: HEAL_FEE }),
      ).to.be.revertedWithCustomError(game, "HealLimitReached");
    });
  });

  describe("powerAttack", () => {
    async function activeMatch() {
      const fixture = await deployFixture();
      const { game, owner, alice, bob } = fixture;
      await join(game, alice);
      await join(game, bob);
      await game.connect(owner).startGame();
      return fixture;
    }

    it("deals 2 HP of damage and has its own 15s cooldown", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);

      await expect(
        game.connect(alice).powerAttack(bob.address, { value: POWER_ATTACK_FEE }),
      )
        .to.emit(game, "PlayerAttacked")
        .withArgs(alice.address, bob.address, true, false, 2, 1);
      expect((await game.players(bob.address)).hp).to.equal(1);

      // A normal attack is on a separate cooldown track and still works.
      await expect(game.connect(alice).attack(bob.address, { value: ATTACK_FEE }))
        .to.emit(game, "PlayerEliminated")
        .withArgs(bob.address);

      // But another power attack right away is still on cooldown.
      const { game: game2, alice: a2, bob: b2 } = await loadFixture(activeMatch);
      await game2.connect(a2).powerAttack(b2.address, { value: POWER_ATTACK_FEE });
      await expect(
        game2.connect(a2).powerAttack(b2.address, { value: POWER_ATTACK_FEE }),
      ).to.be.revertedWithCustomError(game2, "OnCooldown");
      await time.increase(POWER_ATTACK_COOLDOWN);
      await expect(
        game2.connect(a2).powerAttack(b2.address, { value: POWER_ATTACK_FEE }),
      ).to.not.be.reverted;
    });

    it("is blocked by a shield just like a normal attack", async () => {
      const { game, alice, bob } = await loadFixture(activeMatch);
      await game.connect(bob).shield({ value: SHIELD_FEE });

      await expect(
        game.connect(alice).powerAttack(bob.address, { value: POWER_ATTACK_FEE }),
      )
        .to.emit(game, "PlayerAttacked")
        .withArgs(alice.address, bob.address, true, true, 2, 3);
      expect((await game.players(bob.address)).hp).to.equal(3);
    });
  });

  describe("winner detection and prize claim", () => {
    async function fourPlayerMatch() {
      const fixture = await deployFixture();
      const { game, owner, alice, bob, carol, dave } = fixture;
      for (const p of [alice, bob, carol, dave]) await join(game, p);
      await game.connect(owner).startGame();
      return fixture;
    }

    it("declares the last player alive as winner and finishes the match", async () => {
      const { game, alice, bob, carol, dave } = await loadFixture(fourPlayerMatch);
      const expectedPool = ENTRY_FEE * 4n;

      // Eliminate bob, carol, dave with alice's power attacks (2 dmg + 1 dmg).
      for (const victim of [bob, carol, dave]) {
        await game.connect(alice).powerAttack(victim.address, {
          value: POWER_ATTACK_FEE,
        });
        await time.increase(ATTACK_COOLDOWN);
        const tx = game.connect(alice).attack(victim.address, { value: ATTACK_FEE });
        await tx;
        await time.increase(POWER_ATTACK_COOLDOWN);
      }

      expect(await game.matchStatus()).to.equal(Status.Finished);
      expect(await game.winner()).to.equal(alice.address);
      expect(await game.aliveCount()).to.equal(1);
      expect(await game.prizePool()).to.equal(
        expectedPool + ATTACK_FEE * 3n + POWER_ATTACK_FEE * 3n,
      );
    });
  });

  describe("claimPrize", () => {
    async function finishedMatch() {
      const fixture = await deployFixture();
      const { game, owner, alice, bob } = fixture;
      await join(game, alice);
      await join(game, bob);
      await game.connect(owner).startGame();
      // alice eliminates bob: 3 hits with cooldowns
      await game.connect(alice).attack(bob.address, { value: ATTACK_FEE });
      await attackAfterCooldown(game, alice, bob);
      await attackAfterCooldown(game, alice, bob);
      return fixture;
    }

    it("rejects claims from anyone but the winner", async () => {
      const { game, bob } = await loadFixture(finishedMatch);
      await expect(game.connect(bob).claimPrize()).to.be.revertedWithCustomError(
        game,
        "NotWinner",
      );
    });

    it("pays the full prize pool to the winner and zeroes it out", async () => {
      const { game, alice } = await loadFixture(finishedMatch);
      const pool = await game.prizePool();
      expect(pool).to.equal(ENTRY_FEE * 2n + ATTACK_FEE * 3n);

      await expect(game.connect(alice).claimPrize()).to.changeEtherBalance(
        alice,
        pool,
      );
      expect(await game.prizePool()).to.equal(0n);
    });

    it("rejects a second claim", async () => {
      const { game, alice } = await loadFixture(finishedMatch);
      await game.connect(alice).claimPrize();
      await expect(game.connect(alice).claimPrize()).to.be.revertedWithCustomError(
        game,
        "NothingToClaim",
      );
    });

    it("cannot be reentered to drain the pool twice", async () => {
      const { game, owner, alice } = await loadFixture(deployFixture);

      const AttackerFactory = await ethers.getContractFactory("ReentrantAttacker");
      const attacker = (await AttackerFactory.deploy(
        await game.getAddress(),
      )) as unknown as ReentrantAttacker;
      await attacker.waitForDeployment();

      await attacker.connect(owner).doJoin(ENTRY_FEE, { value: ENTRY_FEE });
      await join(game, alice);
      await game.connect(owner).startGame();

      // Attacker contract eliminates alice to become the winner.
      await attacker.connect(owner).doAttack(alice.address, ATTACK_FEE, {
        value: ATTACK_FEE,
      });
      await time.increase(ATTACK_COOLDOWN);
      await attacker.connect(owner).doAttack(alice.address, ATTACK_FEE, {
        value: ATTACK_FEE,
      });
      await time.increase(ATTACK_COOLDOWN);
      await attacker.connect(owner).doAttack(alice.address, ATTACK_FEE, {
        value: ATTACK_FEE,
      });

      expect(await game.matchStatus()).to.equal(Status.Finished);
      expect(await game.winner()).to.equal(await attacker.getAddress());

      const pool = await game.prizePool();
      const contractBalanceBefore = await ethers.provider.getBalance(
        await game.getAddress(),
      );

      await attacker.connect(owner).doClaim();

      expect(await attacker.reentered()).to.equal(true);
      // Exactly one payout's worth left the game contract, proving the
      // reentrant second claimPrize() call inside receive() did not pay out.
      const contractBalanceAfter = await ethers.provider.getBalance(
        await game.getAddress(),
      );
      expect(contractBalanceBefore - contractBalanceAfter).to.equal(pool);
      expect(await game.prizePool()).to.equal(0n);
      expect(await ethers.provider.getBalance(await attacker.getAddress())).to.equal(
        pool,
      );
    });
  });

  describe("resetMatch", () => {
    it("rejects non-owner callers", async () => {
      const { game, alice } = await loadFixture(deployFixture);
      await expect(game.connect(alice).resetMatch()).to.be.revertedWithCustomError(
        game,
        "OwnableUnauthorizedAccount",
      );
    });

    it("rejects resetting mid-match", async () => {
      const { game, owner, alice, bob } = await loadFixture(deployFixture);
      await join(game, alice);
      await join(game, bob);
      await game.connect(owner).startGame();
      await expect(game.connect(owner).resetMatch()).to.be.revertedWithCustomError(
        game,
        "WrongStatus",
      );
    });

    it("rejects resetting a finished match with an unclaimed prize", async () => {
      const { game, owner, alice, bob } = await loadFixture(deployFixture);
      await join(game, alice);
      await join(game, bob);
      await game.connect(owner).startGame();
      await game.connect(alice).attack(bob.address, { value: ATTACK_FEE });
      await attackAfterCooldown(game, alice, bob);
      await attackAfterCooldown(game, alice, bob);

      expect(await game.matchStatus()).to.equal(Status.Finished);
      await expect(game.connect(owner).resetMatch()).to.be.revertedWithCustomError(
        game,
        "WrongStatus",
      );
    });

    it("clears state back to Waiting once from a clean Waiting state", async () => {
      const { game, owner, alice } = await loadFixture(deployFixture);
      await join(game, alice);
      await game.connect(owner).resetMatch();

      expect(await game.matchStatus()).to.equal(Status.Waiting);
      expect(await game.getPlayerCount()).to.equal(0);
      expect(await game.aliveCount()).to.equal(0);
      expect(await game.prizePool()).to.equal(0n);
      expect((await game.players(alice.address)).joined).to.equal(false);
    });
  });
});
