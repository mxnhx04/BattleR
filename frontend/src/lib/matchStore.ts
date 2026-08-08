"use client";

// TEMPORARY MOCK ENGINE (Phase 1).
//
// This module simulates what BattleRoyale.sol will do once it's deployed:
// it is the single in-memory source of truth for match state, and every
// action goes through a "submit -> confirm -> mutate state -> log event"
// pipeline so the UI already behaves the way it will once real
// transactions replace these fake ones. When Phase 4 wires up the
// contract, everything in this file gets swapped for viem/wagmi calls and
// on-chain event subscriptions — the React components should not need to
// change shape, only where their data comes from.
//
// It lives in one browser tab's memory only. Opening /arena and /game in
// different tabs (or on different devices, as the real demo will) will
// NOT share state until Phase 4 makes the chain the shared backend.

import {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  ATTACK_FEE_MON,
  ENTRY_FEE_MON,
  HEAL_FEE_MON,
  MAX_BOTS,
  MAX_HEALS_PER_MATCH,
  MAX_HP,
  POWER_ATTACK_COOLDOWN_MS,
  POWER_ATTACK_DAMAGE,
  POWER_ATTACK_FEE_MON,
  SHIELD_FEE_MON,
} from "./economy";
import { fakeTxHash, shortAddress, shortTxHash } from "./format";
import type { ActivityKind, MatchState, Player, PlayerId } from "./types";

const BOT_NAMES = [
  "Alice",
  "Bob",
  "Charlie",
  "Dave",
  "Emma",
  "Frank",
  "Grace",
  "Hiro",
  "Ivy",
  "Jax",
  "Kira",
  "Leo",
];

function makePlayer(name: string, isYou = false): Player {
  return {
    id: isYou ? "you" : `bot-${name.toLowerCase()}`,
    name,
    address: shortAddress(name),
    hp: MAX_HP,
    maxHp: MAX_HP,
    shielded: false,
    alive: true,
    healsUsed: 0,
    isYou,
    attackReadyAt: 0,
    powerReadyAt: 0,
  };
}

function initialState(): MatchState {
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

let state: MatchState = initialState();
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): MatchState {
  return state;
}

function setState(next: MatchState) {
  state = next;
  emitChange();
}

function pushActivity(
  s: MatchState,
  kind: ActivityKind,
  message: string,
): MatchState {
  const event = {
    id: crypto.randomUUID(),
    kind,
    message,
    timestamp: Date.now(),
    txHash: fakeTxHash(),
  };
  return { ...s, activity: [event, ...s.activity].slice(0, 40) };
}

function withPlayer(
  s: MatchState,
  id: PlayerId,
  update: (p: Player) => Player,
): MatchState {
  return {
    ...s,
    players: s.players.map((p) => (p.id === id ? update(p) : p)),
  };
}

function findPlayer(s: MatchState, id: PlayerId): Player | undefined {
  return s.players.find((p) => p.id === id);
}

function checkForWinner(s: MatchState): MatchState {
  if (s.status !== "active") return s;
  const alive = s.players.filter((p) => p.alive);
  if (alive.length !== 1) return s;
  const winner = alive[0];
  stopAutoplay();
  let next: MatchState = {
    ...s,
    status: "finished",
    winnerId: winner.id,
    finishedAt: Date.now(),
  };
  next = pushActivity(
    next,
    "win",
    `🏆 ${winner.name} is the last wallet standing and wins ${next.prizePoolMon.toFixed(3)} MON!`,
  );
  return next;
}

// ---------------- Public actions ----------------
// Each one mirrors a contract function: it costs a fee, mutates shared
// state, and appends an event — exactly the shape an emitted Solidity
// event + state read will have.

export function joinMatch(name: string, isYou = false): PlayerId | null {
  if (state.status === "finished") return null;
  if (isYou && state.players.some((p) => p.isYou)) return "you";

  const player = makePlayer(name, isYou);
  let next: MatchState = {
    ...state,
    players: [...state.players, player],
    prizePoolMon: state.prizePoolMon + ENTRY_FEE_MON,
    txCounts: { ...state.txCounts, join: state.txCounts.join + 1 },
  };
  next = pushActivity(
    next,
    "join",
    `🎮 ${player.name} (${player.address}) joined the battle`,
  );
  setState(next);
  return player.id;
}

export function startMatch() {
  if (state.status !== "waiting" || state.players.length < 2) return;
  let next: MatchState = { ...state, status: "active", startedAt: Date.now() };
  next = pushActivity(next, "system", "⚔️ The match has started!");
  setState(next);
  ensureAutoplay();
}

export function attack(attackerId: PlayerId, targetId: PlayerId) {
  const attacker = findPlayer(state, attackerId);
  const target = findPlayer(state, targetId);
  if (
    state.status !== "active" ||
    !attacker?.alive ||
    !target?.alive ||
    attackerId === targetId ||
    Date.now() < attacker.attackReadyAt
  ) {
    return;
  }

  let next = withPlayer(state, attackerId, (p) => ({
    ...p,
    attackReadyAt: Date.now() + ATTACK_COOLDOWN_MS,
  }));
  next = {
    ...next,
    txCounts: { ...next.txCounts, attack: next.txCounts.attack + 1 },
  };

  if (target.shielded) {
    next = withPlayer(next, targetId, (p) => ({ ...p, shielded: false }));
    next = pushActivity(
      next,
      "attack",
      `⚔️ ${attacker.name} attacked ${target.name} — shield absorbed the hit`,
    );
  } else {
    const hp = Math.max(0, target.hp - ATTACK_DAMAGE);
    const alive = hp > 0;
    next = withPlayer(next, targetId, (p) => ({ ...p, hp, alive }));
    next = pushActivity(
      next,
      "attack",
      `⚔️ ${attacker.name} attacked ${target.name} — lost ${ATTACK_DAMAGE} HP`,
    );
    if (!alive) {
      next = pushActivity(next, "eliminate", `💀 ${target.name} has been eliminated!`);
    }
  }

  next = checkForWinner(next);
  setState(next);
}

export function powerAttack(attackerId: PlayerId, targetId: PlayerId) {
  const attacker = findPlayer(state, attackerId);
  const target = findPlayer(state, targetId);
  if (
    state.status !== "active" ||
    !attacker?.alive ||
    !target?.alive ||
    attackerId === targetId ||
    Date.now() < attacker.powerReadyAt
  ) {
    return;
  }

  let next = withPlayer(state, attackerId, (p) => ({
    ...p,
    powerReadyAt: Date.now() + POWER_ATTACK_COOLDOWN_MS,
  }));
  next = {
    ...next,
    txCounts: { ...next.txCounts, power: next.txCounts.power + 1 },
  };

  if (target.shielded) {
    next = withPlayer(next, targetId, (p) => ({ ...p, shielded: false }));
    next = pushActivity(
      next,
      "power",
      `💥 ${attacker.name} power-attacked ${target.name} — shield absorbed the hit`,
    );
  } else {
    const hp = Math.max(0, target.hp - POWER_ATTACK_DAMAGE);
    const alive = hp > 0;
    next = withPlayer(next, targetId, (p) => ({ ...p, hp, alive }));
    next = pushActivity(
      next,
      "power",
      `💥 ${attacker.name} power-attacked ${target.name} — lost ${POWER_ATTACK_DAMAGE} HP`,
    );
    if (!alive) {
      next = pushActivity(next, "eliminate", `💀 ${target.name} has been eliminated!`);
    }
  }

  next = checkForWinner(next);
  setState(next);
}

export function shield(playerId: PlayerId) {
  const player = findPlayer(state, playerId);
  if (state.status !== "active" || !player?.alive || player.shielded) return;

  let next = withPlayer(state, playerId, (p) => ({ ...p, shielded: true }));
  next = {
    ...next,
    txCounts: { ...next.txCounts, shield: next.txCounts.shield + 1 },
  };
  next = pushActivity(next, "shield", `🛡️ ${player.name} activated shield`);
  setState(next);
}

export function heal(playerId: PlayerId) {
  const player = findPlayer(state, playerId);
  if (
    state.status !== "active" ||
    !player?.alive ||
    player.hp >= player.maxHp ||
    player.healsUsed >= MAX_HEALS_PER_MATCH
  ) {
    return;
  }

  let next = withPlayer(state, playerId, (p) => ({
    ...p,
    hp: Math.min(p.maxHp, p.hp + 1),
    healsUsed: p.healsUsed + 1,
  }));
  next = {
    ...next,
    txCounts: { ...next.txCounts, heal: next.txCounts.heal + 1 },
  };
  next = pushActivity(next, "heal", `❤️ ${player.name} healed +1 HP`);
  setState(next);
}

export function resetMatch() {
  stopAutoplay();
  setState(initialState());
}

export const FEES = {
  attack: ATTACK_FEE_MON,
  shield: SHIELD_FEE_MON,
  heal: HEAL_FEE_MON,
  power: POWER_ATTACK_FEE_MON,
  join: ENTRY_FEE_MON,
};

export { shortTxHash };

// ---------------- Bot autoplay ----------------
// Simulates the rest of the audience joining and fighting, so /arena feels
// alive and /game has real opponents to test against before real players
// (or the real contract) exist.

let autoplayHandle: ReturnType<typeof setInterval> | null = null;

export function ensureAutoplay() {
  if (autoplayHandle) return;
  autoplayHandle = setInterval(botTick, 1800);
}

export function stopAutoplay() {
  if (autoplayHandle) {
    clearInterval(autoplayHandle);
    autoplayHandle = null;
  }
}

function botTick() {
  if (state.status === "waiting") {
    const usedNames = new Set(state.players.map((p) => p.name));
    const pool = BOT_NAMES.filter((n) => !usedNames.has(n));
    if (pool.length > 0 && state.players.length < MAX_BOTS) {
      const name = pool[Math.floor(Math.random() * pool.length)];
      joinMatch(name);
    }
    return;
  }

  if (state.status !== "active") return;

  const bots = state.players.filter((p) => p.alive && !p.isYou);
  if (bots.length === 0) return;
  const actor = bots[Math.floor(Math.random() * bots.length)];

  const targets = state.players.filter((p) => p.alive && p.id !== actor.id);
  if (targets.length === 0) return;

  const roll = Math.random();
  if (roll < 0.5) {
    const target = targets[Math.floor(Math.random() * targets.length)];
    if (Date.now() >= actor.attackReadyAt) attack(actor.id, target.id);
  } else if (roll < 0.7) {
    if (!actor.shielded) shield(actor.id);
  } else if (roll < 0.88) {
    if (actor.hp < actor.maxHp && actor.healsUsed < MAX_HEALS_PER_MATCH) {
      heal(actor.id);
    }
  } else {
    const target = targets[Math.floor(Math.random() * targets.length)];
    if (Date.now() >= actor.powerReadyAt) powerAttack(actor.id, target.id);
  }
}
