"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeEventLog, formatEther, zeroAddress, type Address, type Log } from "viem";
import { publicClient, CONTRACT_ADDRESS, DEPLOY_TX_HASH } from "@/lib/contract/config";
import { battleRoyaleAbi } from "@/lib/contract/abi";
import { truncateAddress } from "@/lib/format";
import type { ActivityEvent, ActivityKind, MatchState, Player, TxCounts } from "@/lib/types";

const STATUS: MatchState["status"][] = ["waiting", "active", "finished"];
const POLL_INTERVAL_MS = 2500;

function emptyState(): MatchState {
  return {
    status: "waiting",
    players: [],
    prizePoolMon: 0,
    txCounts: { attack: 0, shield: 0, heal: 0, power: 0, join: 0 },
    activity: [],
    winnerId: null,
    startedAt: null,
    finishedAt: null,
  };
}

function describeEvent(eventName: string, args: Record<string, unknown>): {
  kind: ActivityKind;
  message: string;
} {
  switch (eventName) {
    case "PlayerJoined":
      return {
        kind: "join",
        message: `${truncateAddress(args.player as string)} joined the battle`,
      };
    case "GameStarted":
      return { kind: "system", message: "The match has started" };
    case "PlayerAttacked": {
      const isPower = args.isPowerAttack as boolean;
      const attacker = truncateAddress(args.attacker as string);
      const target = truncateAddress(args.target as string);
      const verb = isPower ? "power-attacked" : "attacked";
      if (args.blockedByShield) {
        return {
          kind: isPower ? "power" : "attack",
          message: `${attacker} ${verb} ${target} — shield absorbed the hit`,
        };
      }
      return {
        kind: isPower ? "power" : "attack",
        message: `${attacker} ${verb} ${target} — lost ${args.damage} HP`,
      };
    }
    case "PlayerShielded":
      return { kind: "shield", message: `${truncateAddress(args.player as string)} activated shield` };
    case "PlayerHealed":
      return { kind: "heal", message: `${truncateAddress(args.player as string)} healed +1 HP` };
    case "PlayerEliminated":
      return { kind: "eliminate", message: `${truncateAddress(args.player as string)} has been eliminated` };
    case "GameFinished":
      return {
        kind: "win",
        message: `${truncateAddress(args.winner as string)} is the last wallet standing`,
      };
    default:
      return { kind: "system", message: eventName };
  }
}

async function readPlayers(addresses: readonly Address[], youAddress?: Address): Promise<Player[]> {
  const raws = await Promise.all(
    addresses.map((addr) =>
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: battleRoyaleAbi,
        functionName: "players",
        args: [addr],
      }),
    ),
  );

  return addresses.map((addr, i) => {
    const [, alive, shielded, hp, healsUsed, attackReadyAt, powerReadyAt] = raws[i] as readonly [
      boolean,
      boolean,
      boolean,
      number,
      number,
      bigint,
      bigint,
    ];
    return {
      id: addr,
      name: truncateAddress(addr),
      address: truncateAddress(addr),
      hp,
      maxHp: 3,
      shielded,
      alive,
      healsUsed,
      isYou: youAddress ? addr.toLowerCase() === youAddress.toLowerCase() : false,
      attackReadyAt: Number(attackReadyAt) * 1000,
      powerReadyAt: Number(powerReadyAt) * 1000,
    };
  });
}

export function useOnChainMatch(youAddress?: Address): MatchState {
  const [state, setState] = useState<MatchState>(emptyState);
  const lastBlockRef = useRef<bigint | null>(null);
  const activityRef = useRef<ActivityEvent[]>([]);
  const countsRef = useRef<TxCounts>({ attack: 0, shield: 0, heal: 0, power: 0, join: 0 });
  const initializedRef = useRef(false);

  const refreshSnapshot = useCallback(async () => {
    const [statusNum, prizePoolWei, winnerAddr, addresses] = await Promise.all([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: battleRoyaleAbi,
        functionName: "matchStatus",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: battleRoyaleAbi,
        functionName: "prizePool",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: battleRoyaleAbi,
        functionName: "winner",
      }),
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: battleRoyaleAbi,
        functionName: "getAllPlayers",
      }),
    ]);

    const players = await readPlayers(addresses as readonly Address[], youAddress);
    const winnerAddress = winnerAddr as Address;
    const status = STATUS[Number(statusNum)];

    setState((prev) => {
      // resetMatch() emits no event, so detect it structurally: status
      // dropped back to "waiting" with no players after having been
      // active/finished. Clear the running activity feed and tx counters —
      // otherwise they'd silently carry totals over from the prior match.
      const wasReset = prev.status !== "waiting" && status === "waiting" && players.length === 0;
      if (wasReset) {
        activityRef.current = [];
        countsRef.current = { attack: 0, shield: 0, heal: 0, power: 0, join: 0 };
      }

      return {
        ...prev,
        status,
        prizePoolMon: Number(formatEther(prizePoolWei as bigint)),
        winnerId: winnerAddress === zeroAddress ? null : winnerAddress,
        players,
        activity: wasReset ? [] : prev.activity,
        txCounts: wasReset ? { ...countsRef.current } : prev.txCounts,
        startedAt: wasReset ? null : prev.startedAt,
        finishedAt: wasReset ? null : prev.finishedAt,
      };
    });
  }, [youAddress]);

  const pollEvents = useCallback(async () => {
    // RPC calls here can fail transiently (rate limits, brief network
    // blips) — swallow and retry next tick rather than letting a rejection
    // surface as an unhandled error and interrupt the polling loop.
    try {
      const latest = await publicClient.getBlockNumber();
      if (lastBlockRef.current === null || lastBlockRef.current > latest) return;

      const fromBlock = lastBlockRef.current;
      const logs = await publicClient.getLogs({
        address: CONTRACT_ADDRESS,
        fromBlock,
        toBlock: latest,
      });
      lastBlockRef.current = latest + 1n;

      const newEvents: ActivityEvent[] = [];
      let newStartedAt: number | null = null;
      let newFinishedAt: number | null = null;

      for (const log of logs as Log[]) {
        let decoded;
        try {
          decoded = decodeEventLog({ abi: battleRoyaleAbi, data: log.data, topics: log.topics });
        } catch {
          continue;
        }
        if (!decoded.eventName) continue;
        const eventName = decoded.eventName;
        const args = decoded.args as unknown as Record<string, unknown>;
        const { kind, message } = describeEvent(eventName, args);

        if (eventName === "PlayerJoined") countsRef.current.join += 1;
        else if (eventName === "PlayerShielded") countsRef.current.shield += 1;
        else if (eventName === "PlayerHealed") countsRef.current.heal += 1;
        else if (eventName === "PlayerAttacked") {
          if (args.isPowerAttack) countsRef.current.power += 1;
          else countsRef.current.attack += 1;
        } else if (eventName === "GameStarted") {
          newStartedAt = Number(args.timestamp as bigint) * 1000;
        } else if (eventName === "GameFinished") {
          newFinishedAt = Date.now();
        }

        newEvents.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          kind,
          message,
          timestamp: Date.now(),
          txHash: log.transactionHash ?? "",
        });
      }

      if (newEvents.length > 0) {
        activityRef.current = [...newEvents.reverse(), ...activityRef.current].slice(0, 60);
        setState((prev) => ({
          ...prev,
          activity: activityRef.current,
          txCounts: { ...countsRef.current },
          startedAt: newStartedAt ?? prev.startedAt,
          finishedAt: newFinishedAt ?? prev.finishedAt,
        }));
      }
      // Always refresh the read-state snapshot, even with no new logs:
      // resetMatch() changes status/players without emitting an event.
      await refreshSnapshot();
    } catch (error) {
      console.warn("Match poll failed, will retry:", error);
    }
  }, [refreshSnapshot]);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    (async () => {
      if (!initializedRef.current) {
        initializedRef.current = true;
        let startBlock = 0n;
        if (DEPLOY_TX_HASH) {
          const receipt = await publicClient
            .getTransactionReceipt({ hash: DEPLOY_TX_HASH })
            .catch(() => null);
          if (receipt) startBlock = receipt.blockNumber;
        }
        lastBlockRef.current = startBlock;
      }
      if (cancelled) return;
      // pollEvents() also does an initial refreshSnapshot() internally, and
      // (unlike a bare refreshSnapshot() call here) already swallows
      // transient RPC failures instead of throwing.
      await pollEvents();
      if (cancelled) return;
      interval = setInterval(pollEvents, POLL_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [pollEvents]);

  return state;
}
