"use client";

import { useEffect, useState } from "react";
import { HpHearts } from "./HpHearts";
import { IconShield, IconSkull } from "./icons";
import type { Player } from "@/lib/types";

type Flash = "damage" | "heal" | "shield" | null;

interface Snapshot {
  hp: number;
  shielded: boolean;
  alive: boolean;
  flash: Flash;
  justEliminated: boolean;
}

export function PlayerCard({ player }: { player: Player }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
    hp: player.hp,
    shielded: player.shielded,
    alive: player.alive,
    flash: null,
    justEliminated: false,
  });

  // React-sanctioned "adjust state when a prop changes" pattern: compare
  // during render and call setState synchronously (not from an effect) —
  // this re-renders immediately before paint instead of flashing stale UI.
  if (
    snapshot.hp !== player.hp ||
    snapshot.shielded !== player.shielded ||
    snapshot.alive !== player.alive
  ) {
    let flash: Flash = null;
    if (player.hp < snapshot.hp) flash = "damage";
    else if (player.hp > snapshot.hp) flash = "heal";
    else if (!snapshot.shielded && player.shielded) flash = "shield";

    setSnapshot({
      hp: player.hp,
      shielded: player.shielded,
      alive: player.alive,
      flash,
      justEliminated: snapshot.alive && !player.alive,
    });
  }

  useEffect(() => {
    if (!snapshot.flash && !snapshot.justEliminated) return;
    const timeout = setTimeout(
      () => setSnapshot((s) => ({ ...s, flash: null, justEliminated: false })),
      600,
    );
    return () => clearTimeout(timeout);
  }, [snapshot.flash, snapshot.justEliminated]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-4 transition-all duration-500 ${
        player.alive
          ? "border-white/10 bg-white/[0.03]"
          : "border-white/5 bg-white/[0.01] grayscale opacity-50"
      } ${player.isYou ? "ring-2 ring-brand-blue" : ""} ${
        snapshot.flash === "damage" ? "animate-shake" : ""
      } ${snapshot.justEliminated ? "animate-eliminate" : ""}`}
    >
      {snapshot.flash && (
        <div
          className={`absolute inset-0 pointer-events-none ${
            snapshot.flash === "damage"
              ? "animate-flash-damage"
              : snapshot.flash === "heal"
                ? "animate-flash-heal"
                : "animate-flash-shield"
          }`}
        />
      )}
      {!player.alive && (
        <IconSkull className="absolute top-2 right-2 w-5 h-5 text-brand-gray" />
      )}
      {player.shielded && player.alive && (
        <IconShield
          className={`absolute top-2 right-2 w-5 h-5 text-brand-blue ${snapshot.flash === "shield" ? "animate-pop" : ""}`}
        />
      )}
      <div className="font-body font-semibold text-lg tracking-wide truncate">
        {player.name}
        {player.isYou && (
          <span className="ml-1 text-brand-blue text-xs align-middle">
            (you)
          </span>
        )}
      </div>
      <div className="text-[0.68rem] text-brand-gray font-mono truncate mb-2">
        {player.address}
      </div>
      <HpHearts hp={player.hp} maxHp={player.maxHp} size="sm" />
    </div>
  );
}
