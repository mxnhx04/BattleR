"use client";

import { useCallback, useState } from "react";
import { fakeTxHash, shortAddress } from "@/lib/format";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  ENTRY_FEE_MON,
  MAX_HEALS_PER_MATCH,
  MAX_HP,
  POWER_ATTACK_COOLDOWN_MS,
  POWER_ATTACK_DAMAGE,
} from "@/lib/economy";
import type { ActivityEvent, MatchState, Player } from "@/lib/types";

// No backend, no wallet, no chain calls — two players share this screen and
// tap buttons to fight each other directly, for demoing the app without
// real players, wallets, or gas. Cooldowns match the real contract's so the
// pacing feels like the genuine game.
const NAMES = ["Player One", "Player Two"] as const;

type DuelAction = "attack" | "power" | "shield" | "heal";
type PlayerIndex = 0 | 1;

function makePlayers(): Player[] {
  return NAMES.map((name, i) => {
    const address = shortAddress(`duel-${name}-${i}`);
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
}

function makeEvent(kind: ActivityEvent["kind"], message: string): ActivityEvent {
  return { id: fakeTxHash(), kind, message, timestamp: Date.now(), txHash: fakeTxHash() };
}

function initialState(): MatchState {
  const players = makePlayers();
  return {
    status: "active",
    players,
    prizePoolMon: ENTRY_FEE_MON * players.length,
    txCounts: { attack: 0, shield: 0, heal: 0, power: 0, join: players.length },
    activity: [
      makeEvent("system", "The match has started"),
      ...players
        .slice()
        .reverse()
        .map((p) => makeEvent("join", `${p.name} joined the battle`)),
    ],
    winnerId: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

export function useLocalDuel() {
  const [state, setState] = useState<MatchState>(initialState);

  const act = useCallback((actorIndex: PlayerIndex, action: DuelAction) => {
    setState((prev) => {
      if (prev.status !== "active") return prev;
      const opponentIndex: PlayerIndex = actorIndex === 0 ? 1 : 0;
      const actor = prev.players[actorIndex];
      const opponent = prev.players[opponentIndex];
      if (!actor?.alive || !opponent?.alive) return prev;

      const now = Date.now();
      const players = [...prev.players];
      const txCounts = { ...prev.txCounts };
      const events: ActivityEvent[] = [];
      let finished = false;
      let winnerId: string | null = null;

      if (action === "shield") {
        if (actor.shielded) return prev;
        players[actorIndex] = { ...actor, shielded: true };
        txCounts.shield += 1;
        events.push(makeEvent("shield", `${actor.name} activated shield`));
      } else if (action === "heal") {
        if (actor.hp >= MAX_HP || actor.healsUsed >= MAX_HEALS_PER_MATCH) return prev;
        players[actorIndex] = { ...actor, hp: actor.hp + 1, healsUsed: actor.healsUsed + 1 };
        txCounts.heal += 1;
        events.push(makeEvent("heal", `${actor.name} healed +1 HP`));
      } else {
        const isPower = action === "power";
        const readyAt = isPower ? actor.powerReadyAt : actor.attackReadyAt;
        if (now < readyAt) return prev;

        const damage = isPower ? POWER_ATTACK_DAMAGE : ATTACK_DAMAGE;
        const cooldownMs = isPower ? POWER_ATTACK_COOLDOWN_MS : ATTACK_COOLDOWN_MS;
        const verb = isPower ? "power-attacked" : "attacked";

        players[actorIndex] = isPower
          ? { ...actor, powerReadyAt: now + cooldownMs }
          : { ...actor, attackReadyAt: now + cooldownMs };
        txCounts[isPower ? "power" : "attack"] += 1;

        if (opponent.shielded) {
          players[opponentIndex] = { ...opponent, shielded: false };
          events.push(
            makeEvent(isPower ? "power" : "attack", `${actor.name} ${verb} ${opponent.name} — shield absorbed the hit`),
          );
        } else {
          const hpAfter = Math.max(0, opponent.hp - damage);
          const eliminated = hpAfter === 0;
          players[opponentIndex] = { ...opponent, hp: hpAfter, alive: !eliminated };
          events.push(
            makeEvent(isPower ? "power" : "attack", `${actor.name} ${verb} ${opponent.name} — lost ${damage} HP`),
          );
          if (eliminated) {
            events.push(makeEvent("eliminate", `${opponent.name} has been eliminated`));
            finished = true;
            winnerId = actor.id;
          }
        }
      }

      if (finished && winnerId) {
        const winner = players.find((p) => p.id === winnerId);
        if (winner) events.push(makeEvent("win", `${winner.name} is the last wallet standing`));
      }

      return {
        ...prev,
        players,
        txCounts,
        activity: [...events.reverse(), ...prev.activity].slice(0, 60),
        status: finished ? "finished" : prev.status,
        winnerId: finished ? winnerId : prev.winnerId,
        finishedAt: finished ? Date.now() : prev.finishedAt,
      };
    });
  }, []);

  const reset = useCallback(() => setState(initialState()), []);

  return {
    match: state,
    attack: (i: PlayerIndex) => act(i, "attack"),
    powerAttack: (i: PlayerIndex) => act(i, "power"),
    shield: (i: PlayerIndex) => act(i, "shield"),
    heal: (i: PlayerIndex) => act(i, "heal"),
    reset,
  };
}
