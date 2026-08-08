"use client";

import { useGameWallet } from "@/hooks/useGameWallet";
import { useMonBalance } from "@/hooks/useMonBalance";
import { truncateAddress } from "@/lib/format";
import { formatMon } from "@/lib/format";
import { GlowButton } from "./GlowButton";

export function WalletBadge() {
  const { ready, authenticated, address, login, logout } = useGameWallet();
  const balance = useMonBalance(address);

  if (!ready) {
    return <span className="text-xs text-brand-gray">Loading wallet…</span>;
  }

  if (!authenticated) {
    return (
      <GlowButton color="cyan" onClick={login} className="!text-sm !px-4 !py-2">
        Connect Wallet
      </GlowButton>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="text-right">
        <div className="font-mono text-brand-cyan">
          {address ? truncateAddress(address) : "…"}
        </div>
        <div className="text-brand-gray">
          {balance !== undefined ? formatMon(balance) : "…"}
        </div>
      </div>
      <button
        onClick={logout}
        className="text-brand-gray hover:text-white uppercase tracking-wide text-[0.65rem]"
      >
        Logout
      </button>
    </div>
  );
}
