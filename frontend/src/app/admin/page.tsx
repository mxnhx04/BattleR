"use client";

import { useState } from "react";
import Link from "next/link";
import { useOnChainMatch } from "@/hooks/useOnChainMatch";
import { useGameWallet } from "@/hooks/useGameWallet";
import { useIsOwner } from "@/hooks/useIsOwner";
import { resetMatch, startGame } from "@/lib/contract/actions";
import { formatMon } from "@/lib/format";
import { CONTRACT_ADDRESS, explorerAddressUrl } from "@/lib/contract/config";
import { GlowButton } from "@/components/GlowButton";
import { WalletBadge } from "@/components/WalletBadge";

export default function AdminPage() {
  const { address, walletClient } = useGameWallet();
  const isOwner = useIsOwner(address);
  const match = useOnChainMatch(address);
  const [pending, setPending] = useState<"start" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">Host Controls</h1>
        <div className="flex items-center gap-4">
          <WalletBadge />
          <Link
            href="/arena"
            className="text-xs tracking-[0.2em] uppercase text-brand-gray hover:text-white"
          >
            Open Arena
          </Link>
        </div>
      </div>

      {!isOwner && (
        <div className="mb-6 text-sm text-brand-gray border border-white/10 rounded-lg py-3 px-4 bg-white/[0.02]">
          Connect the wallet that deployed the contract to start or reset the match.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-2">
        <GlowButton
          color="orange"
          disabled={!isOwner || match.status !== "waiting" || match.players.length < 2 || pending === "start"}
          onClick={handleStart}
        >
          {pending === "start" ? "Starting…" : "Start Match"}
        </GlowButton>
        <GlowButton
          color="purple"
          disabled={!isOwner || match.status === "active" || pending === "reset"}
          onClick={handleReset}
        >
          {pending === "reset" ? "Resetting…" : "Reset Match"}
        </GlowButton>
      </div>
      {error && <div className="text-sm text-red-400 mb-6">{error}</div>}
      {!error && <div className="mb-6" />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-8">
        <Stat label="Status" value={match.status} />
        <Stat label="Players" value={match.players.length} />
        <Stat label="Prize Pool" value={formatMon(match.prizePoolMon)} />
        <Stat
          label="Total Tx"
          value={
            match.txCounts.attack +
            match.txCounts.shield +
            match.txCounts.heal +
            match.txCounts.power +
            match.txCounts.join
          }
        />
      </div>

      <a
        href={explorerAddressUrl(CONTRACT_ADDRESS)}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-brand-cyan underline break-all"
      >
        View contract on explorer: {CONTRACT_ADDRESS}
      </a>

      <div className="text-xs tracking-[0.2em] text-brand-gray uppercase mt-8 mb-2">
        Current State
      </div>
      <pre className="text-xs bg-white/[0.03] border border-white/10 rounded-lg p-4 overflow-x-auto">
        {JSON.stringify(match, null, 2)}
      </pre>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] py-3 text-center">
      <div className="font-display text-xl capitalize">{value}</div>
      <div className="text-brand-gray uppercase tracking-wide text-[0.65rem]">
        {label}
      </div>
    </div>
  );
}
