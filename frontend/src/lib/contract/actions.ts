import { BaseError, ContractFunctionRevertedError, parseEther, type Address, type Hash, type WalletClient } from "viem";
import { publicClient, CONTRACT_ADDRESS } from "./config";
import { battleRoyaleAbi } from "./abi";
import {
  ATTACK_FEE_MON,
  ENTRY_FEE_MON,
  HEAL_FEE_MON,
  POWER_ATTACK_FEE_MON,
  SHIELD_FEE_MON,
} from "@/lib/economy";

const ERROR_MESSAGES: Record<string, string> = {
  WrongStatus: "The match isn't in the right state for that action.",
  AlreadyJoined: "You've already joined this match.",
  WrongFee: "Wrong payment amount was sent for that action.",
  NotAlive: "You've been eliminated and can't act anymore.",
  TargetNotAlive: "That player isn't in the match, or is already eliminated.",
  CannotTargetSelf: "You can't target yourself.",
  OnCooldown: "That action is still on cooldown.",
  AlreadyShielded: "You already have a shield up.",
  AtMaxHp: "You're already at full HP.",
  HealLimitReached: "You've used all your heals for this match.",
  NotEnoughPlayers: "Need at least 2 players to start the match.",
  NotWinner: "Only the winner can claim the prize.",
  NothingToClaim: "There's nothing left to claim.",
  OwnableUnauthorizedAccount: "Only the host wallet can do that.",
};

function friendlyError(error: unknown): string {
  if (error instanceof BaseError) {
    const revertError = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      const name = revertError.data?.errorName ?? "";
      return ERROR_MESSAGES[name] ?? name ?? error.shortMessage ?? "Transaction failed";
    }
    return error.shortMessage || error.message;
  }
  return error instanceof Error ? error.message : "Transaction failed";
}

async function simulateAndWrite(params: {
  walletClient: WalletClient;
  account: Address;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}): Promise<Hash> {
  const { walletClient, account, functionName, args, value } = params;
  try {
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: battleRoyaleAbi,
      functionName,
      args,
      value,
      account,
    });
    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error) {
    throw new Error(friendlyError(error));
  }
}

export function joinGame(walletClient: WalletClient, account: Address) {
  return simulateAndWrite({
    walletClient,
    account,
    functionName: "joinGame",
    value: parseEther(String(ENTRY_FEE_MON)),
  });
}

export function attack(walletClient: WalletClient, account: Address, target: Address) {
  return simulateAndWrite({
    walletClient,
    account,
    functionName: "attack",
    args: [target],
    value: parseEther(String(ATTACK_FEE_MON)),
  });
}

export function powerAttack(walletClient: WalletClient, account: Address, target: Address) {
  return simulateAndWrite({
    walletClient,
    account,
    functionName: "powerAttack",
    args: [target],
    value: parseEther(String(POWER_ATTACK_FEE_MON)),
  });
}

export function shield(walletClient: WalletClient, account: Address) {
  return simulateAndWrite({
    walletClient,
    account,
    functionName: "shield",
    value: parseEther(String(SHIELD_FEE_MON)),
  });
}

export function heal(walletClient: WalletClient, account: Address) {
  return simulateAndWrite({
    walletClient,
    account,
    functionName: "heal",
    value: parseEther(String(HEAL_FEE_MON)),
  });
}

export function claimPrize(walletClient: WalletClient, account: Address) {
  return simulateAndWrite({ walletClient, account, functionName: "claimPrize" });
}

export function startGame(walletClient: WalletClient, account: Address) {
  return simulateAndWrite({ walletClient, account, functionName: "startGame" });
}

export function resetMatch(walletClient: WalletClient, account: Address) {
  return simulateAndWrite({ walletClient, account, functionName: "resetMatch" });
}
