"use client";

import { useEffect, useState } from "react";
import { formatEther, type Address } from "viem";
import { publicClient } from "@/lib/contract/config";

export function useMonBalance(address: Address | undefined): number | undefined {
  const [balance, setBalance] = useState<number>();

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (!address) return;
      const wei = await publicClient.getBalance({ address }).catch(() => null);
      if (!cancelled && wei !== null) setBalance(Number(formatEther(wei)));
    }

    if (!address) {
      queueMicrotask(() => {
        if (!cancelled) setBalance(undefined);
      });
      return () => {
        cancelled = true;
      };
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address]);

  return balance;
}
