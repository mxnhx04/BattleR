"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useLocalDuel } from "@/hooks/useLocalDuel";
import { useNow } from "@/hooks/useNow";
import { useSfx } from "@/hooks/useSfx";
import type { SfxKind } from "@/lib/sfx";
import { MAX_HEALS_PER_MATCH } from "@/lib/economy";
import { formatMon } from "@/lib/format";
import type { Player } from "@/lib/types";
import { HpHearts } from "@/components/HpHearts";
import { PlayerCard } from "@/components/PlayerCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TxCounter } from "@/components/TxCounter";
import { GlowButton } from "@/components/GlowButton";
import { IconShield, IconSpeaker, IconTrophy } from "@/components/icons";

const ACTIVITY_SFX: Partial<Record<string, SfxKind>> = {
  attack: "attack",
  power: "power",
  shield: "shield",
  heal: "heal",
  eliminate: "eliminate",
  win: "win",
};

export default function SimulatePage() {
  const { match, attack, powerAttack, shield, heal, reset } = useLocalDuel();
  const { play, muted, toggleMuted } = useSfx();
  const now = useNow();
  const lastSeenEventId = useRef<string | null>(null);

  useEffect(() => {
    const latest = match.activity[0];
    if (!latest || latest.id === lastSeenEventId.current) return;
    const isFirstObservation = lastSeenEventId.current === null;
    lastSeenEventId.current = latest.id;
    if (isFirstObservation) return;
    const sfx = ACTIVITY_SFX[latest.kind];
    if (sfx) play(sfx);
  }, [match.activity, play]);

  const winner = match.players.find((p) => p.id === match.winnerId);

  if (match.status === "finished" && winner) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 gap-6">
        <div className="flex items-center gap-2 text-sm tracking-[0.3em] text-brand-blue uppercase">
          <IconTrophy className="w-5 h-5" />
          Last Wallet Standing
        </div>
        <h1 className="font-heading font-bold text-6xl sm:text-8xl text-brand-gold">{winner.name}</h1>
        <div className="font-heading font-bold text-3xl text-white">Prize: {formatMon(match.prizePoolMon)}</div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-4 text-sm text-brand-gray font-mono">
          <span>Attacks {match.txCounts.attack}</span>
          <span>Shields {match.txCounts.shield}</span>
          <span>Heals {match.txCounts.heal}</span>
          <span>Power {match.txCounts.power}</span>
        </div>
        <GlowButton color="gold" onClick={reset}>
          Play Again
        </GlowButton>
        <Link href="/" className="text-xs tracking-[0.2em] uppercase text-brand-gray/70 hover:text-brand-gray">
          Back to menu
        </Link>
      </main>
    );
  }

  const [p1, p2] = match.players;

  return (
    <main className="flex-1 px-4 sm:px-8 py-8 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
        <h1 className="font-logo text-3xl sm:text-4xl tracking-wide">
          <span className="text-brand-gold">MONAD</span> <span className="text-white">BATTLE ROYALE</span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            onClick={toggleMuted}
            className="text-xs tracking-[0.2em] uppercase text-brand-gray hover:text-white flex items-center gap-1.5"
          >
            <IconSpeaker muted={muted} className="w-4 h-4" />
            {muted ? "Enable Sound" : "Sound On"}
          </button>
          <Link href="/" className="text-xs tracking-[0.2em] uppercase text-brand-gray hover:text-white">
            Exit
          </Link>
        </div>
      </div>

      <div className="mb-6 text-center text-xs tracking-[0.2em] text-brand-gray/70 uppercase border border-white/10 rounded-lg py-2 px-4 bg-white/[0.02] inline-block">
        Demo mode — take turns tapping buttons for each side, no wallet or blockchain involved
      </div>

      <div className="text-center mb-8">
        <TxCounter counts={match.txCounts} label="Actions This Match" />
        <div className="font-heading font-bold text-xl mt-2 text-brand-gold">{formatMon(match.prizePoolMon)}</div>
        <div className="text-xs tracking-[0.2em] text-brand-gray uppercase">Prize Pool</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {p1 && (
          <DuelPanel
            player={p1}
            opponentAlive={p2?.alive ?? false}
            now={now}
            active={match.status === "active"}
            onAttack={() => attack(0)}
            onPower={() => powerAttack(0)}
            onShield={() => shield(0)}
            onHeal={() => heal(0)}
          />
        )}
        {p2 && (
          <DuelPanel
            player={p2}
            opponentAlive={p1?.alive ?? false}
            now={now}
            active={match.status === "active"}
            onAttack={() => attack(1)}
            onPower={() => powerAttack(1)}
            onShield={() => shield(1)}
            onHeal={() => heal(1)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="grid grid-cols-2 gap-4">
          <PlayerCard player={p1 ?? match.players[0]} />
          <PlayerCard player={p2 ?? match.players[1]} />
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-xs tracking-[0.2em] text-brand-gray uppercase mb-3">Live Activity</div>
          <ActivityFeed events={match.activity} limit={20} />
        </div>
      </div>
    </main>
  );
}

function DuelPanel({
  player,
  opponentAlive,
  now,
  active,
  onAttack,
  onPower,
  onShield,
  onHeal,
}: {
  player: Player;
  opponentAlive: boolean;
  now: number;
  active: boolean;
  onAttack: () => void;
  onPower: () => void;
  onShield: () => void;
  onHeal: () => void;
}) {
  const canAct = active && player.alive && opponentAlive;
  const attackCooldown = Math.max(0, player.attackReadyAt - now) / 1000;
  const powerCooldown = Math.max(0, player.powerReadyAt - now) / 1000;
  const healsLeft = MAX_HEALS_PER_MATCH - player.healsUsed;

  return (
    <div
      className={`rounded-xl border p-5 ${player.alive ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.01] opacity-60"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="font-body font-semibold text-xl tracking-wide flex items-center gap-2">
          {player.name}
          {player.shielded && <IconShield className="w-5 h-5 text-brand-blue" />}
        </div>
        <HpHearts hp={player.hp} maxHp={player.maxHp} size="md" />
      </div>

      {!player.alive ? (
        <div className="text-center text-sm text-brand-gray py-6">Eliminated</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <GlowButton
            color="gold"
            disabled={!canAct || attackCooldown > 0}
            className="w-full !text-base"
            onClick={onAttack}
          >
            {attackCooldown > 0 ? `Attack (${attackCooldown.toFixed(0)}s)` : "Attack"}
          </GlowButton>
          <GlowButton color="blue" disabled={!canAct || player.shielded} className="w-full !text-base" onClick={onShield}>
            Shield
          </GlowButton>
          <GlowButton
            color="blue"
            disabled={!canAct || player.hp >= player.maxHp || healsLeft <= 0}
            className="w-full !text-base"
            onClick={onHeal}
          >
            {`Heal (${Math.max(healsLeft, 0)} left)`}
          </GlowButton>
          <GlowButton
            color="gold"
            disabled={!canAct || powerCooldown > 0}
            className="w-full !text-base"
            onClick={onPower}
          >
            {powerCooldown > 0 ? `Power (${powerCooldown.toFixed(0)}s)` : "Power Attack"}
          </GlowButton>
        </div>
      )}
    </div>
  );
}
