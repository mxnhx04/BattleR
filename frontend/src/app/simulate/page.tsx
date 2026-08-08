"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSimulatedMatch } from "@/hooks/useSimulatedMatch";
import { useSfx } from "@/hooks/useSfx";
import type { SfxKind } from "@/lib/sfx";
import { formatMon } from "@/lib/format";
import { PlayerCard } from "@/components/PlayerCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TxCounter } from "@/components/TxCounter";
import { GlowButton } from "@/components/GlowButton";
import { IconSpeaker, IconTrophy } from "@/components/icons";

const ACTIVITY_SFX: Partial<Record<string, SfxKind>> = {
  join: "join",
  attack: "attack",
  power: "power",
  shield: "shield",
  heal: "heal",
  eliminate: "eliminate",
  win: "win",
};

export default function SimulatePage() {
  const [runId, setRunId] = useState(0);
  // key={runId} forces a full remount, so useSimulatedMatch always plays a
  // fresh match from its own mount instead of needing to reset mid-flight.
  return <SimulateRun key={runId} onReplay={() => setRunId((n) => n + 1)} />;
}

function SimulateRun({ onReplay }: { onReplay: () => void }) {
  const match = useSimulatedMatch();
  const { play, muted, toggleMuted } = useSfx();
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

  const alive = match.players.filter((p) => p.alive).length;
  const total = match.players.length;
  const winner = match.players.find((p) => p.id === match.winnerId);

  if (match.status === "finished" && winner) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 gap-6">
        <div className="flex items-center gap-2 text-sm tracking-[0.3em] text-brand-blue uppercase">
          <IconTrophy className="w-5 h-5" />
          Last Wallet Standing
        </div>
        <h1 className="font-heading font-bold text-6xl sm:text-8xl text-brand-gold">
          {winner.name}
        </h1>
        <div className="font-heading font-bold text-3xl text-white">
          Prize: {formatMon(match.prizePoolMon)}
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-4 text-sm text-brand-gray font-mono">
          <span>Attacks {match.txCounts.attack}</span>
          <span>Shields {match.txCounts.shield}</span>
          <span>Heals {match.txCounts.heal}</span>
          <span>Power {match.txCounts.power}</span>
        </div>
        <GlowButton color="gold" onClick={onReplay}>
          Run It Again
        </GlowButton>
        <Link href="/" className="text-xs tracking-[0.2em] uppercase text-brand-gray/70 hover:text-brand-gray">
          Back to menu
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 sm:px-8 py-8 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
        <h1 className="font-logo text-3xl sm:text-4xl tracking-wide">
          <span className="text-brand-gold">MONAD</span>{" "}
          <span className="text-white">BATTLE ROYALE</span>
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

      <div className="mb-8 text-center text-xs tracking-[0.2em] text-brand-gray/70 uppercase border border-white/10 rounded-lg py-2 px-4 bg-white/[0.02] inline-block">
        Demo mode — two bots playing locally, no wallet or blockchain involved
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-6 mb-10 bg-white/[0.03] border border-white/10 rounded-xl p-6">
        <div className="text-center lg:text-left">
          <div className="font-heading font-bold text-4xl">
            {alive} / {total || 2}
          </div>
          <div className="text-xs tracking-[0.2em] text-brand-gray uppercase">Players Alive</div>
          <div className="font-heading font-bold text-2xl mt-4 text-brand-gold">
            {formatMon(match.prizePoolMon)}
          </div>
          <div className="text-xs tracking-[0.2em] text-brand-gray uppercase">Prize Pool</div>
        </div>

        <TxCounter counts={match.txCounts} label="Actions This Match" />

        <div className="text-center lg:text-right">
          <div className="text-sm tracking-[0.2em] text-brand-gold uppercase font-heading font-bold text-xl">
            {match.status === "waiting" ? "Starting…" : "Match Active"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="grid grid-cols-2 gap-4">
          {match.players.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
          {match.players.length === 0 && (
            <div className="col-span-full text-brand-gray text-sm py-12 text-center">
              Bots are joining…
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-xs tracking-[0.2em] text-brand-gray uppercase mb-3">Live Activity</div>
          <ActivityFeed events={match.activity} limit={20} />
        </div>
      </div>
    </main>
  );
}
