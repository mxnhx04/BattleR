"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { monadTestnet } from "@/lib/contract/config";

export interface GameWallet {
  ready: boolean;
  authenticated: boolean;
  address: Address | undefined;
  walletClient: WalletClient | undefined;
  login: () => void;
  logout: () => void;
}

export function useGameWallet(): GameWallet {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const [walletClient, setWalletClient] = useState<WalletClient>();

  const embeddedWallet = useMemo(
    () => wallets.find((w) => w.walletClientType === "privy"),
    [wallets],
  );

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (!embeddedWallet) {
        setWalletClient(undefined);
        return;
      }
      try {
        if (embeddedWallet.chainId !== `eip155:${monadTestnet.id}`) {
          await embeddedWallet.switchChain(monadTestnet.id);
        }
        const provider = await embeddedWallet.getEthereumProvider();
        if (cancelled) return;
        setWalletClient(
          createWalletClient({
            account: embeddedWallet.address as Address,
            chain: monadTestnet,
            transport: custom(provider),
          }),
        );
      } catch (error) {
        console.warn("Failed to connect embedded wallet:", error);
      }
    }

    connect();
    return () => {
      cancelled = true;
    };
  }, [embeddedWallet]);

  const wrappedLogin = useCallback(() => login(), [login]);
  const wrappedLogout = useCallback(() => logout(), [logout]);

  return {
    ready,
    authenticated,
    address: embeddedWallet?.address as Address | undefined,
    walletClient,
    login: wrappedLogin,
    logout: wrappedLogout,
  };
}
