import { HpHearts } from "./HpHearts";
import type { Player } from "@/lib/types";

export function PlayerCard({ player }: { player: Player }) {
  return (
    <div
      className={`relative rounded-lg border p-4 transition-all ${
        player.alive
          ? "border-white/10 bg-white/[0.03]"
          : "border-white/5 bg-white/[0.01] grayscale opacity-50"
      } ${player.isYou ? "ring-2 ring-brand-cyan" : ""}`}
    >
      {!player.alive && (
        <span className="absolute top-2 right-2 text-xl">💀</span>
      )}
      {player.shielded && player.alive && (
        <span className="absolute top-2 right-2 text-xl text-glow-cyan">
          🛡️
        </span>
      )}
      <div className="font-display text-lg tracking-wide truncate">
        {player.name}
        {player.isYou && (
          <span className="ml-1 text-brand-cyan text-xs align-middle">
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
