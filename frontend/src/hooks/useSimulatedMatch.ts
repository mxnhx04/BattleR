"use client";

import { useEffect, useRef, useState } from "react";
import { fakeTxHash, shortAddress } from "@/lib/format";
import {
  ATTACK_DAMAGE,
  ENTRY_FEE_MON,
  MAX_HEALS_PER_MATCH,
  MAX_HP,
  POWER_ATTACK_DAMAGE,
} from "@/lib/economy";
import type { ActivityEvent, MatchState, Player, TxCounts } from "@/lib/types";

// No backend, no wallet, no chain calls — a fully client-side demo match
// between two bots for showing the app off without real players or gas.
// Cooldowns are compressed from the contract's real 5s/15s so a full match
// plays out in well under a minute.
const BOT_NAMES = ["Player One", "Player Two"] as const;
const ATTACK_COOLDOWN_MS = 1_500;
const POWER_ATTACK_COOLDOWN_MS = 4_000;
const TICK_MS = 700;
const JOIN_DELAY_MS = 500;
const START_DELAY_MS = 900;

type Action = "attack" | "power" | "shield" | "heal";

function pickAction(self: Player, now: number): Action | null {
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
  if (self.hp < MAX_HP && self.healsUsed < MAX_HEALS_PER_MATCH) {
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

/** Runs one full demo match on mount. Pass a changing `key` prop to the
 * component that calls this hook to replay — the hook always starts a
 * fresh match on mount rather than resetting mid-lifecycle. */
export function useSimulatedMatch(): MatchState {
  const [state, setState] = useState<MatchState>(emptyState);
  const playersRef = useRef<Player[]>([]);
  const activityRef = useRef<ActivityEvent[]>([]);
  const countsRef = useRef<TxCounts>({ attack: 0, shield: 0, heal: 0, power: 0, join: 0 });

  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let interval: ReturnType<typeof setInterval> | undefined;

    function later(fn: () => void, ms: number) {
      timeouts.push(
        setTimeout(() => {
          if (!cancelled) fn();
        }, ms),
      );
    }

    function emit(kind: ActivityEvent["kind"], message: string) {
      activityRef.current = [
        { id: fakeTxHash(), kind, message, timestamp: Date.now(), txHash: fakeTxHash() },
        ...activityRef.current,
      ].slice(0, 60);
    }

    const players: Player[] = BOT_NAMES.map((name, i) => {
      const address = shortAddress(`sim-${name}-${i}`);
      return {
        id: address,
        name,
        address,
        hp: MAX_HP,
        maxHp: MAX_HP,
        shielded: false,
        alive: true,
        healsUsed: 0,
        isYou: false,
        attackReadyAt: 0,
        powerReadyAt: 0,
      };
    });
    playersRef.current = players;

    players.forEach((player, i) => {
      later(
        () => {
          countsRef.current = { ...countsRef.current, join: countsRef.current.join + 1 };
          emit("join", `${player.name} joined the battle`);
          setState((prev) => ({
            ...prev,
            players: playersRef.current.slice(0, i + 1),
            prizePoolMon: prev.prizePoolMon + ENTRY_FEE_MON,
            txCounts: { ...countsRef.current },
            activity: activityRef.current,
          }));
        },
        JOIN_DELAY_MS * (i + 1),
      );
    });

    later(
      () => {
        const startedAt = Date.now();
        emit("system", "The match has started");
        setState((prev) => ({ ...prev, status: "active", startedAt, activity: activityRef.current }));

        interval = setInterval(() => {
          const [a, b] = playersRef.current;
          if (!a?.alive || !b?.alive) return;

          const now = Date.now();
          const attackerIndex = Math.random() < 0.5 ? 0 : 1;
          const defenderIndex = attackerIndex === 0 ? 1 : 0;
          const attacker = playersRef.current[attackerIndex];
          const defender = playersRef.current[defenderIndex];

          const action = pickAction(attacker, now);
          if (!action) return;

          let finished = false;
          let winnerId: string | null = null;

          if (action === "shield") {
            playersRef.current[attackerIndex] = { ...attacker, shielded: true };
            countsRef.current = { ...countsRef.current, shield: countsRef.current.shield + 1 };
            emit("shield", `${attacker.name} activated shield`);
          } else if (action === "heal") {
            playersRef.current[attackerIndex] = {
              ...attacker,
              hp: attacker.hp + 1,
              healsUsed: attacker.healsUsed + 1,
            };
            countsRef.current = { ...countsRef.current, heal: countsRef.current.heal + 1 };
            emit("heal", `${attacker.name} healed +1 HP`);
          } else {
            const isPower = action === "power";
            const damage = isPower ? POWER_ATTACK_DAMAGE : ATTACK_DAMAGE;
            const cooldownMs = isPower ? POWER_ATTACK_COOLDOWN_MS : ATTACK_COOLDOWN_MS;
            const readyAt = now + cooldownMs;
            const verb = isPower ? "power-attacked" : "attacked";

            playersRef.current[attackerIndex] = isPower
              ? { ...attacker, powerReadyAt: readyAt }
              : { ...attacker, attackReadyAt: readyAt };
            countsRef.current = isPower
              ? { ...countsRef.current, power: countsRef.current.power + 1 }
              : { ...countsRef.current, attack: countsRef.current.attack + 1 };

            if (defender.shielded) {
              playersRef.current[defenderIndex] = { ...defender, shielded: false };
              emit(isPower ? "power" : "attack", `${attacker.name} ${verb} ${defender.name} — shield absorbed the hit`);
            } else {
              const hpAfter = Math.max(0, defender.hp - damage);
              const eliminated = hpAfter === 0;
              playersRef.current[defenderIndex] = { ...defender, hp: hpAfter, alive: !eliminated };
              emit(isPower ? "power" : "attack", `${attacker.name} ${verb} ${defender.name} — lost ${damage} HP`);
              if (eliminated) {
                emit("eliminate", `${defender.name} has been eliminated`);
                finished = true;
                winnerId = attacker.id;
              }
            }
          }

          if (finished && winnerId) {
            const winner = playersRef.current.find((p) => p.id === winnerId);
            if (winner) emit("win", `${winner.name} is the last wallet standing`);
          }

          setState((prev) => ({
            ...prev,
            players: [...playersRef.current],
            txCounts: { ...countsRef.current },
            activity: activityRef.current,
            status: finished ? "finished" : prev.status,
            winnerId: finished ? winnerId : prev.winnerId,
            finishedAt: finished ? Date.now() : prev.finishedAt,
          }));

          if (finished && interval) clearInterval(interval);
        }, TICK_MS);
      },
      START_DELAY_MS + JOIN_DELAY_MS * players.length,
    );

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return state;
}
