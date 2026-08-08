"use client";

import { useState } from "react";
import Link from "next/link";
import { useOnChainMatch } from "@/hooks/useOnChainMatch";
import { useGameWallet } from "@/hooks/useGameWallet";
import { useMonBalance } from "@/hooks/useMonBalance";
import { useNow } from "@/hooks/useNow";
import { attack, claimPrize, heal, joinGame, powerAttack, shield } from "@/lib/contract/actions";
import { ATTACK_FEE_MON, ENTRY_FEE_MON, HEAL_FEE_MON, MAX_HEALS_PER_MATCH, POWER_ATTACK_FEE_MON, SHIELD_FEE_MON } from "@/lib/economy";
import { formatMon, shortTxHash, truncateAddress } from "@/lib/format";
import { useSfx } from "@/hooks/useSfx";
import type { SfxKind } from "@/lib/sfx";
import { HpHearts } from "@/components/HpHearts";
import { GlowButton } from "@/components/GlowButton";
import { TargetSheet } from "@/components/TargetSheet";
import { ActivityFeed } from "@/components/ActivityFeed";
import {
  IconBolt,
  IconCheck,
  IconCrosshair,
  IconHeart,
  IconPlus,
  IconShield,
  IconSkull,
  IconSpeaker,
  IconTrophy,
} from "@/components/icons";

type PendingAction = "attack" | "shield" | "heal" | "power" | "join" | "claim" | null;

const FEES = {
  join: ENTRY_FEE_MON,
  attack: ATTACK_FEE_MON,
  shield: SHIELD_FEE_MON,
  heal: HEAL_FEE_MON,
  power: POWER_ATTACK_FEE_MON,
};

const ACTION_LABEL: Record<Exclude<PendingAction, null>, string> = {
  join: "Joined the battle",
  attack: "Attack confirmed",
  shield: "Shield confirmed",
  heal: "Heal confirmed",
  power: "Power attack confirmed",
  claim: "Prize claimed",
};

const ACTION_ICON: Record<Exclude<PendingAction, null>, React.ComponentType<{ className?: string }>> = {
  join: IconPlus,
  attack: IconCrosshair,
  shield: IconShield,
  heal: (props) => <IconHeart filled {...props} />,
  power: IconBolt,
  claim: IconTrophy,
};

const ACTION_SFX: Record<Exclude<PendingAction, null>, SfxKind> = {
  join: "join",
  attack: "attack",
  shield: "shield",
  heal: "heal",
  power: "power",
  claim: "win",
};

export default function GamePage() {
  const { ready, authenticated, address, walletClient, login } = useGameWallet();
  const balance = useMonBalance(address);
  const match = useOnChainMatch(address);
  const now = useNow();
  const { play, muted, toggleMuted } = useSfx();
  const [pending, setPending] = useState<PendingAction>(null);
  const [pickingTarget, setPickingTarget] = useState<"attack" | "power" | null>(null);
  const [confirmToast, setConfirmToast] = useState<{ message: string; tx: string; icon: React.ComponentType<{ className?: string }> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(label: Exclude<PendingAction, null>, fn: () => Promise<string>) {
    if (!walletClient) return;
    setError(null);
    setPending(label);
    try {
      const hash = await fn();
      play(ACTION_SFX[label]);
      setConfirmToast({ message: ACTION_LABEL[label], tx: hash, icon: ACTION_ICON[label] });
      setTimeout(() => setConfirmToast(null), 3200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setPending(null);
    }
  }

  // ---------- Not logged in yet ----------
  if (!ready) {
    return (
      <main className="flex-1 flex items-center justify-center text-brand-gray text-sm">
        Loading…
      </main>
    );
  }

  if (!authenticated || !address) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-6">
        <h1 className="font-heading font-bold text-4xl tracking-wide">
          JOIN THE <span className="text-brand-gold">BATTLE</span>
        </h1>
        <p className="text-brand-gray text-sm max-w-xs">
          Log in to get a wallet — no extension or seed phrase needed. Every
          move after this is a real Monad transaction.
        </p>
        <GlowButton color="gold" onClick={login}>
          Log In
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

  const you = match.players.find((p) => p.isYou);

  // ---------- Logged in, not joined on-chain yet ----------
  if (!you) {
    const insufficientFunds = balance !== undefined && balance < FEES.join;
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center gap-6">
        <h1 className="font-heading font-bold text-4xl tracking-wide">
          JOIN THE <span className="text-brand-gold">BATTLE</span>
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

        {insufficientFunds && (
          <div className="max-w-xs text-sm border border-brand-gold/40 rounded-lg py-4 px-4 bg-brand-gold/10">
            Your wallet needs {formatMon(FEES.join)} to join. Send testnet MON to:
            <div className="font-mono text-xs text-brand-blue mt-2 break-all">
              {address}
            </div>
            <a
              href="https://faucet.monad.xyz"
              target="_blank"
              rel="noreferrer"
              className="block mt-2 text-brand-blue underline"
            >
              Open the Monad faucet
            </a>
          </div>
        )}

        <GlowButton
          color="gold"
          disabled={pending === "join" || !walletClient || insufficientFunds}
          onClick={() =>
            runAction("join", () => joinGame(walletClient!, address))
          }
        >
          {pending === "join" ? "Submitting transaction…" : "Join Battle"}
        </GlowButton>
        {error && <div className="text-sm text-red-400 max-w-xs">{error}</div>}
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
  const canAct = match.status === "active" && you.alive && !!walletClient && pending === null;

  return (
    <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
      {/* HUD */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-body font-semibold text-2xl tracking-wide flex items-center gap-2">
            {truncateAddress(you.id)}
            {you.shielded && <IconShield className="w-5 h-5 text-brand-blue" />}
          </div>
          <div className="text-[0.65rem] text-brand-gray font-mono">
            {balance !== undefined ? formatMon(balance) : "…"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <HpHearts hp={you.hp} maxHp={you.maxHp} size="lg" />
          <button
            onClick={toggleMuted}
            className="text-brand-gray hover:text-white"
            aria-label={muted ? "Unmute sound" : "Mute sound"}
          >
            <IconSpeaker muted={muted} className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-6 text-xs">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
          <div className="font-body font-bold text-lg text-brand-gold">
            {formatMon(match.prizePoolMon)}
          </div>
          <div className="text-brand-gray uppercase tracking-wide">Prize Pool</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
          <div className="font-body font-bold text-lg">
            {match.players.filter((p) => p.alive).length}/{match.players.length}
          </div>
          <div className="text-brand-gray uppercase tracking-wide">Alive</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] py-2">
          <div className="font-body font-bold text-lg capitalize">{match.status}</div>
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
        <div className="mb-6 text-center text-sm border border-white/10 rounded-lg py-4 px-4 bg-white/[0.03]">
          <IconSkull className="w-6 h-6 mx-auto mb-1 text-brand-gray" />
          You have been eliminated — spectating.
          <Link href="/arena" className="block mt-2 text-brand-blue underline">
            Watch the rest on the Arena screen
          </Link>
        </div>
      )}

      {match.status === "finished" && (
        <div className="mb-6 text-center text-sm border border-brand-gold/40 rounded-lg py-4 px-4 bg-brand-gold/10">
          {match.winnerId === you.id ? (
            <>
              <span className="font-heading font-bold text-2xl text-brand-gold flex items-center justify-center gap-2 mb-3">
                <IconTrophy className="w-6 h-6" />
                YOU WIN!
              </span>
              {match.prizePoolMon > 0 ? (
                <GlowButton
                  color="gold"
                  disabled={pending === "claim" || !walletClient}
                  onClick={() =>
                    runAction("claim", () => claimPrize(walletClient!, address))
                  }
                >
                  {pending === "claim"
                    ? "Claiming…"
                    : `Claim Prize (${formatMon(match.prizePoolMon)})`}
                </GlowButton>
              ) : (
                <span className="text-brand-blue inline-flex items-center gap-1.5">
                  <IconCheck className="w-4 h-4" />
                  Prize claimed!
                </span>
              )}
            </>
          ) : (
            <span>
              Match over —{" "}
              {match.players.find((p) => p.id === match.winnerId)?.name} won.
            </span>
          )}
          <Link href="/arena" className="block mt-2 text-brand-blue underline">
            View final Arena results
          </Link>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <GlowButton
          color="gold"
          disabled={!canAct || attackCooldown > 0 || opponents.length === 0}
          className="w-full !text-lg"
          onClick={() => setPickingTarget("attack")}
        >
          {attackCooldown > 0 ? `Attack (${attackCooldown.toFixed(0)}s)` : "Attack"}
        </GlowButton>
        <GlowButton
          color="blue"
          disabled={!canAct || you.shielded}
          className="w-full !text-lg"
          onClick={() => runAction("shield", () => shield(walletClient!, address))}
        >
          {pending === "shield" ? "Submitting…" : "Shield"}
        </GlowButton>
        <GlowButton
          color="blue"
          disabled={!canAct || you.hp >= you.maxHp || healsLeft <= 0}
          className="w-full !text-lg"
          onClick={() => runAction("heal", () => heal(walletClient!, address))}
        >
          {pending === "heal"
            ? "Submitting…"
            : `Heal (${Math.max(healsLeft, 0)} left)`}
        </GlowButton>
        <GlowButton
          color="gold"
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

      {/* Pending / confirmation / error overlays */}
      {pending && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-brand-charcoal border border-brand-gold/40 rounded-full px-5 py-2 text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-gold animate-pulse" />
          Submitting transaction…
        </div>
      )}
      {confirmToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-brand-charcoal border border-brand-blue/40 rounded-full px-5 py-2 text-sm flex items-center gap-2 max-w-[90vw]">
          <confirmToast.icon className="w-4 h-4 text-brand-blue shrink-0" />
          <span className="truncate">{confirmToast.message}</span>
          <span className="text-brand-gray font-mono text-xs">
            {shortTxHash(confirmToast.tx)}
          </span>
        </div>
      )}
      {error && !pending && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-brand-charcoal border border-red-500/40 rounded-full px-5 py-2 text-sm max-w-[90vw] text-red-400 text-center">
          {error}
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
                ? attack(walletClient!, address, targetId as `0x${string}`)
                : powerAttack(walletClient!, address, targetId as `0x${string}`),
            );
          }}
        />
      )}
    </main>
  );
}
