"use client";

import Link from "next/link";
import { useMatch } from "@/hooks/useMatch";
import { resetMatch, startMatch } from "@/lib/matchStore";
import { formatMon } from "@/lib/format";
import { GlowButton } from "@/components/GlowButton";

export default function AdminPage() {
  const match = useMatch();

  return (
    <main className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-wide">Host Controls</h1>
        <Link
          href="/arena"
          className="text-xs tracking-[0.2em] uppercase text-brand-gray hover:text-white"
        >
          Open Arena
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <GlowButton
          color="orange"
          disabled={match.status !== "waiting" || match.players.length < 2}
          onClick={startMatch}
        >
          Start Match
        </GlowButton>
        <GlowButton color="purple" onClick={resetMatch}>
          Reset Match
        </GlowButton>
      </div>

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

      <div className="text-xs tracking-[0.2em] text-brand-gray uppercase mb-2">
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
