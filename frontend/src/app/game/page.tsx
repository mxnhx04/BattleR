"use client";

import { useState } from "react";
import Link from "next/link";
import { useMatch } from "@/hooks/useMatch";
import { useNow } from "@/hooks/useNow";
import {
  attack,
  ensureAutoplay,
  FEES,
  getState,
  heal,
  joinMatch,
  powerAttack,
  shield,
} from "@/lib/matchStore";
import { formatMon, shortTxHash } from "@/lib/format";
import { MAX_HEALS_PER_MATCH } from "@/lib/economy";
import { HpHearts } from "@/components/HpHearts";
import { GlowButton } from "@/components/GlowButton";
import { TargetSheet } from "@/components/TargetSheet";
import { ActivityFeed } from "@/components/ActivityFeed";

type PendingAction = "attack" | "shield" | "heal" | "power" | "join" | null;

export default function GamePage() {
  const match = useMatch();
  const now = useNow();
  const [pending, setPending] = useState<PendingAction>(null);
  const [pickingTarget, setPickingTarget] = useState<"attack" | "power" | null>(
    null,
  );
  const [confirmToast, setConfirmToast] = useState<{
    message: string;
    tx: string;
  } | null>(null);

  const you = match.players.find((p) => p.isYou);

  function runAction(label: Exclude<PendingAction, null>, fn: () => void) {
    setPending(label);
    setTimeout(() => {
      fn();
      const fresh = getState();
      const latest = fresh.activity[0];
      if (latest) {
        setConfirmToast({ message: latest.message, tx: latest.txHash });
        setTimeout(() => setConfirmToast(null), 2600);
      }
      setPending(null);
    }, 700);
  }

  function handleJoin() {
    runAction("join", () => {
      joinMatch("You", true);
      ensureAutoplay();
    });
  }

  // ---------- Not joined yet ----------
  if (!you) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-6">
        <h1 className="font-display text-4xl tracking-wide">
          JOIN THE <span className="text-brand-orange text-glow-orange">BATTLE</span>
        </h1>
        <p className="text-brand-gray text-sm max-w-xs">
          Pay the entry fee to join the match. Every action after this is a
          real Monad transaction too.
        </p>
        <div className="flex gap-8 text-sm text-brand-gray font-mono">
          <span>Entry {formatMon(FEES.join)}</span>
          <span>Players {match.players.length}</span>
          <span>Pool {formatMon(match.prizePoolMon)}</span>
        </div>
        <GlowButton
          color="orange"
          disabled={pending === "join"}
          onClick={handleJoin}
        >
          {pending === "join" ? "Submitting transaction…" : "Join Battle"}
        </GlowButton>
        <Link
          href="/arena"
          className="text-xs tracking-[0.2em] uppercase text-brand-gray/70 hover:text-brand-gray"
        >
          Watch live instead
        </Link>
      </main>
    );
  }

  const opponents = match.players.filter((p) => p.alive && p.id !== you.id);
  const attackCooldown = Math.max(0, you.attackReadyAt - now) / 1000;
  const powerCooldown = Math.max(0, you.powerReadyAt - now) / 1000;
  const healsLeft = MAX_HEALS_PER_MATCH - you.healsUsed;
  const canAct = match.status === "active" && you.alive;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-display text-2xl tracking-wide">
            {you.name}{" "}
            {you.shielded && <span className="text-glow-cyan">🛡️</span>}
          </div>
          <div className="text-[0.65rem] text-brand-gray font-mono">
            {you.address}
          </div>
        </div>
        <HpHearts hp={you.hp} maxHp={you.maxHp} size="lg" />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-6 text-xs">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
          <div className="font-display text-lg text-brand-cyan">
            {formatMon(match.prizePoolMon)}
          </div>
          <div className="text-brand-gray uppercase tracking-wide">Prize Pool</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
          <div className="font-display text-lg">
            {match.players.filter((p) => p.alive).length}/{match.players.length}
          </div>
          <div className="text-brand-gray uppercase tracking-wide">Alive</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
          <div className="font-display text-lg capitalize">{match.status}</div>
          <div className="text-brand-gray uppercase tracking-wide">Match</div>
        </div>
      </div>

      {/* Status banners */}
      {match.status === "waiting" && (
        <div className="mb-6 text-center text-sm text-brand-gray border border-white/10 rounded-lg py-3 px-4 bg-white/[0.02]">
          Joined successfully. Waiting for the host to start the match…
        </div>
      )}

      {match.status === "active" && !you.alive && (
        <div className="mb-6 text-center text-sm border border-brand-purple/40 rounded-lg py-4 px-4 bg-brand-purple/10">
          <div className="text-2xl mb-1">💀</div>
          You have been eliminated — spectating.
          <Link href="/arena" className="block mt-2 text-brand-cyan underline">
            Watch the rest on the Arena screen
          </Link>
        </div>
      )}

      {match.status === "finished" && (
        <div className="mb-6 text-center text-sm border border-brand-orange/40 rounded-lg py-4 px-4 bg-brand-orange/10">
          {match.winnerId === you.id ? (
            <span className="font-display text-2xl text-brand-orange text-glow-orange">
              🏆 YOU WIN {formatMon(match.prizePoolMon)}!
            </span>
          ) : (
            <span>
              Match over —{" "}
              {match.players.find((p) => p.id === match.winnerId)?.name} won.
            </span>
          )}
          <Link href="/arena" className="block mt-2 text-brand-cyan underline">
            View final Arena results
          </Link>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <GlowButton
          color="orange"
          disabled={!canAct || attackCooldown > 0 || opponents.length === 0}
          className="w-full !text-lg"
          onClick={() => setPickingTarget("attack")}
        >
          {attackCooldown > 0 ? `Attack (${attackCooldown.toFixed(0)}s)` : "Attack"}
        </GlowButton>
        <GlowButton
          color="cyan"
          disabled={!canAct || you.shielded}
          className="w-full !text-lg"
          onClick={() => runAction("shield", () => shield(you.id))}
        >
          {pending === "shield" ? "Submitting…" : "Shield"}
        </GlowButton>
        <GlowButton
          color="orange"
          disabled={!canAct || you.hp >= you.maxHp || healsLeft <= 0}
          className="w-full !text-lg"
          onClick={() => runAction("heal", () => heal(you.id))}
        >
          {pending === "heal"
            ? "Submitting…"
            : `Heal (${Math.max(healsLeft, 0)} left)`}
        </GlowButton>
        <GlowButton
          color="purple"
          disabled={!canAct || powerCooldown > 0 || opponents.length === 0}
          className="w-full !text-lg"
          onClick={() => setPickingTarget("power")}
        >
          {powerCooldown > 0
            ? `Power (${powerCooldown.toFixed(0)}s)`
            : "Power Attack"}
        </GlowButton>
      </div>

      <div className="text-[0.65rem] text-brand-gray font-mono text-center mb-6">
        Attack {formatMon(FEES.attack)} · Shield {formatMon(FEES.shield)} · Heal{" "}
        {formatMon(FEES.heal)} · Power {formatMon(FEES.power)}
      </div>

      {/* Recent activity */}
      <div className="flex-1 min-h-0">
        <div className="text-xs tracking-[0.2em] text-brand-gray uppercase mb-2">
          Recent Activity
        </div>
        <ActivityFeed events={match.activity} limit={6} />
      </div>

      {/* Pending / confirmation overlays */}
      {pending && pending !== "join" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-brand-charcoal border border-brand-orange/40 rounded-full px-5 py-2 text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
          Submitting transaction…
        </div>
      )}
      {confirmToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-brand-charcoal border border-brand-cyan/40 rounded-full px-5 py-2 text-sm flex items-center gap-2 max-w-[90vw]">
          <span className="text-brand-cyan">✅</span>
          <span className="truncate">{confirmToast.message}</span>
          <span className="text-brand-gray font-mono text-xs">
            {shortTxHash(confirmToast.tx)}
          </span>
        </div>
      )}

      {pickingTarget && (
        <TargetSheet
          title={pickingTarget === "attack" ? "Choose a Target" : "Power Attack Target"}
          targets={opponents}
          onCancel={() => setPickingTarget(null)}
          onSelect={(targetId) => {
            const kind = pickingTarget;
            setPickingTarget(null);
            runAction(kind, () =>
              kind === "attack"
                ? attack(you.id, targetId)
                : powerAttack(you.id, targetId),
            );
          }}
        />
      )}
    </main>
  );
}
