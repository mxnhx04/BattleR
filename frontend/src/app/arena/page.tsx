"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMatch } from "@/hooks/useMatch";
import { ensureAutoplay, resetMatch, startMatch } from "@/lib/matchStore";
import { formatMon } from "@/lib/format";
import { PlayerCard } from "@/components/PlayerCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TxCounter } from "@/components/TxCounter";
import { GlowButton } from "@/components/GlowButton";

export default function ArenaPage() {
  const match = useMatch();

  useEffect(() => {
    ensureAutoplay();
  }, []);

  const alive = match.players.filter((p) => p.alive).length;
  const total = match.players.length;
  const winner = match.players.find((p) => p.id === match.winnerId);

  if (match.status === "finished" && winner) {
    const durationSec =
      match.startedAt && match.finishedAt
        ? Math.round((match.finishedAt - match.startedAt) / 1000)
        : 0;
    const totalTx =
      match.txCounts.attack +
      match.txCounts.shield +
      match.txCounts.heal +
      match.txCounts.power +
      match.txCounts.join;

    return (
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 gap-6">
        <div className="text-sm tracking-[0.3em] text-brand-cyan uppercase">
          🏆 Last Wallet Standing
        </div>
        <h1 className="font-display text-7xl sm:text-9xl text-brand-orange text-glow-orange -skew-x-6">
          {winner.name}
        </h1>
        <div className="font-display text-3xl text-white">
          Prize: {formatMon(match.prizePoolMon)}
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-4 text-sm text-brand-gray font-mono">
          <span>Players {total}</span>
          <span>Attacks {match.txCounts.attack}</span>
          <span>Shields {match.txCounts.shield}</span>
          <span>Heals {match.txCounts.heal}</span>
          <span>Power {match.txCounts.power}</span>
          <span>Total Tx {totalTx}</span>
          <span>Duration {durationSec}s</span>
        </div>
        <GlowButton color="cyan" onClick={resetMatch}>
          New Match
        </GlowButton>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 sm:px-8 py-8 max-w-[1400px] mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl sm:text-4xl tracking-wide">
          🔥 <span className="text-brand-orange">MONAD</span> BATTLE ROYALE
        </h1>
        <Link
          href="/"
          className="text-xs tracking-[0.2em] uppercase text-brand-gray hover:text-white"
        >
          Exit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-6 mb-10 bg-white/[0.03] border border-white/10 rounded-xl p-6">
        <div className="text-center lg:text-left">
          <div className="font-display text-4xl">
            {alive} / {total}
          </div>
          <div className="text-xs tracking-[0.2em] text-brand-gray uppercase">
            Players Alive
          </div>
          <div className="font-display text-2xl mt-4 text-brand-cyan">
            {formatMon(match.prizePoolMon)}
          </div>
          <div className="text-xs tracking-[0.2em] text-brand-gray uppercase">
            Prize Pool
          </div>
        </div>

        <TxCounter counts={match.txCounts} />

        <div className="text-center lg:text-right">
          {match.status === "waiting" ? (
            <>
              <div className="text-sm text-brand-gray mb-3">
                Waiting for the host to start the match…
              </div>
              <GlowButton color="orange" disabled={total < 2} onClick={startMatch}>
                Start Match
              </GlowButton>
            </>
          ) : (
            <div className="text-sm tracking-[0.2em] text-brand-orange uppercase font-display text-xl">
              Match Active
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {match.players.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
          {match.players.length === 0 && (
            <div className="col-span-full text-brand-gray text-sm py-12 text-center">
              Waiting for players to scan in and join…
            </div>
          )}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
          <div className="text-xs tracking-[0.2em] text-brand-gray uppercase mb-3">
            Live Activity
          </div>
          <ActivityFeed events={match.activity} limit={20} />
        </div>
      </div>
    </main>
  );
}
