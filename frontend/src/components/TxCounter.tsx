"use client";

import { useEffect, useState } from "react";
import type { TxCounts } from "@/lib/types";

export function TxCounter({ counts }: { counts: TxCounts }) {
  const total =
    counts.attack + counts.shield + counts.heal + counts.power + counts.join;

  const [snapshot, setSnapshot] = useState({ total, pop: false });

  if (snapshot.total !== total) {
    setSnapshot({ total, pop: true });
  }

  useEffect(() => {
    if (!snapshot.pop) return;
    const timeout = setTimeout(() => setSnapshot((s) => ({ ...s, pop: false })), 350);
    return () => clearTimeout(timeout);
  }, [snapshot.pop]);

  return (
    <div className="text-center">
      <div
        className={`font-display text-6xl md:text-8xl text-brand-cyan text-glow-cyan tabular-nums ${snapshot.pop ? "animate-pop" : ""}`}
      >
        {total}
      </div>
      <div className="text-xs md:text-sm tracking-[0.3em] text-brand-gray uppercase mt-1">
        Onchain Actions This Match
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3 text-xs text-brand-gray font-mono">
        <span>⚔️ Attacks {counts.attack}</span>
        <span>🛡️ Shields {counts.shield}</span>
        <span>❤️ Heals {counts.heal}</span>
        <span>💥 Power {counts.power}</span>
        <span>🎮 Joins {counts.join}</span>
      </div>
    </div>
  );
}
