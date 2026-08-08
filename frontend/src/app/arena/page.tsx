"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useOnChainMatch } from "@/hooks/useOnChainMatch";
import { useGameWallet } from "@/hooks/useGameWallet";
import { useIsOwner } from "@/hooks/useIsOwner";
import { useSfx } from "@/hooks/useSfx";
import type { SfxKind } from "@/lib/sfx";
import { resetMatch, startGame } from "@/lib/contract/actions";
import { formatMon } from "@/lib/format";
import { PlayerCard } from "@/components/PlayerCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { TxCounter } from "@/components/TxCounter";
import { GlowButton } from "@/components/GlowButton";
import { WalletBadge } from "@/components/WalletBadge";
import { IconPhone, IconSpeaker, IconTrophy } from "@/components/icons";

const ACTIVITY_SFX: Partial<Record<string, SfxKind>> = {
  join: "join",
  attack: "attack",
  power: "power",
  shield: "shield",
  heal: "heal",
  eliminate: "eliminate",
  win: "win",
};

export default function ArenaPage() {
  const { address, walletClient } = useGameWallet();
  const isOwner = useIsOwner(address);
  const match = useOnChainMatch(address);
  const { play } = useSfx();
  const [pending, setPending] = useState<"start" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const lastSeenEventId = useRef<string | null>(null);

  useEffect(() => {
    if (!soundEnabled) return;
    const latest = match.activity[0];
    if (!latest || latest.id === lastSeenEventId.current) return;
    const isFirstObservation = lastSeenEventId.current === null;
    lastSeenEventId.current = latest.id;
    // Don't fire a sound for the whole backlog the first time we see it —
    // only for events that arrive after sound was turned on.
    if (isFirstObservation) return;
    const sfx = ACTIVITY_SFX[latest.kind];
    if (sfx) play(sfx);
  }, [match.activity, soundEnabled, play]);

  const alive = match.players.filter((p) => p.alive).length;
  const total = match.players.length;
  const winner = match.players.find((p) => p.id === match.winnerId);

  async function handleStart() {
    if (!walletClient || !address) return;
    setError(null);
    setPending("start");
    try {
      await startGame(walletClient, address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start match");
    } finally {
      setPending(null);
    }
  }

  async function handleReset() {
    if (!walletClient || !address) return;
    setError(null);
    setPending("reset");
    try {
      await resetMatch(walletClient, address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset match");
    } finally {
      setPending(null);
    }
  }

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
          <span>Players {total}</span>
          <span>Attacks {match.txCounts.attack}</span>
          <span>Shields {match.txCounts.shield}</span>
          <span>Heals {match.txCounts.heal}</span>
          <span>Power {match.txCounts.power}</span>
          <span>Total Tx {totalTx}</span>
          <span>Duration {durationSec}s</span>
        </div>
        {isOwner && (
          <GlowButton
            color="blue"
            disabled={pending === "reset"}
            onClick={handleReset}
          >
            {pending === "reset" ? "Resetting…" : "New Match"}
          </GlowButton>
        )}
        {error && <div className="text-sm text-red-400 max-w-md">{error}</div>}
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 sm:px-8 py-8 max-w-[1400px] mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-8">
        <h1 className="font-logo text-3xl sm:text-4xl tracking-wide">
          <span className="text-brand-gold">MONAD</span>{" "}
          <span className="text-white">BATTLE ROYALE</span>
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="text-xs tracking-[0.2em] uppercase text-brand-gray hover:text-white flex items-center gap-1.5"
          >
            <IconSpeaker muted={!soundEnabled} className="w-4 h-4" />
            {soundEnabled ? "Sound On" : "Enable Sound"}
          </button>
          <WalletBadge />
          <Link
            href="/"
            className="text-xs tracking-[0.2em] uppercase text-brand-gray hover:text-white"
          >
            Exit
          </Link>
        </div>
      </div>

      {match.status === "waiting" && (
        <div className="flex flex-col items-center gap-2 mb-10 bg-white/[0.03] border border-white/10 rounded-xl p-8">
          <div className="flex items-center gap-2 font-heading font-bold text-2xl tracking-wide text-center">
            <IconPhone className="w-5 h-5" />
            Join on your phone at /game
          </div>
          <p className="text-sm text-brand-gray">
            Pay the entry fee to join — every action after that is a real Monad transaction.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-6 mb-10 bg-white/[0.03] border border-white/10 rounded-xl p-6">
        <div className="text-center lg:text-left">
          <div className="font-heading font-bold text-4xl">
            {alive} / {total}
          </div>
          <div className="text-xs tracking-[0.2em] text-brand-gray uppercase">
            Players Alive
          </div>
          <div className="font-heading font-bold text-2xl mt-4 text-brand-gold">
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
              {isOwner ? (
                <GlowButton
                  color="gold"
                  disabled={total < 2 || pending === "start"}
                  onClick={handleStart}
                >
                  {pending === "start" ? "Starting…" : "Start Match"}
                </GlowButton>
              ) : (
                <div className="text-xs text-brand-gray">
                  Connect the host wallet to start the match.
                </div>
              )}
            </>
          ) : (
            <div className="text-sm tracking-[0.2em] text-brand-gold uppercase font-heading font-bold text-xl">
              Match Active
            </div>
          )}
          {error && <div className="text-xs text-red-400 mt-2 max-w-xs ml-auto">{error}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {match.players.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
          {match.players.length === 0 && (
            <div className="col-span-full text-brand-gray text-sm py-12 text-center">
              Waiting for players to join…
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
