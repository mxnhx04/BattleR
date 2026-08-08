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

  // Any connected wallet works here — Privy's embedded wallet
  // (walletClientType "privy") for attendees who log in with email, or an
  // external wallet (MetaMask, etc., walletClientType e.g. "metamask")
  // for anyone bringing their own, like the contract owner connecting the
  // deployer wallet to reach host controls. Both implement the same
  // ConnectedWallet interface, so nothing else here needs to change.
  const activeWallet = useMemo(() => wallets[0], [wallets]);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      if (!activeWallet) {
        setWalletClient(undefined);
        return;
      }
      try {
        if (activeWallet.chainId !== `eip155:${monadTestnet.id}`) {
          await activeWallet.switchChain(monadTestnet.id);
        }
        const provider = await activeWallet.getEthereumProvider();
        if (cancelled) return;
        setWalletClient(
          createWalletClient({
            account: activeWallet.address as Address,
            chain: monadTestnet,
            transport: custom(provider),
          }),
        );
      } catch (error) {
        console.warn("Failed to connect wallet:", error);
      }
    }

    connect();
    return () => {
      cancelled = true;
    };
  }, [activeWallet]);

  const wrappedLogin = useCallback(() => login(), [login]);
  const wrappedLogout = useCallback(() => logout(), [logout]);

  return {
    ready,
    authenticated,
    address: activeWallet?.address as Address | undefined,
    walletClient,
    login: wrappedLogin,
    logout: wrappedLogout,
  };
}
