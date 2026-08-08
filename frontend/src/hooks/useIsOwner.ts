"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { publicClient, CONTRACT_ADDRESS } from "@/lib/contract/config";
import { battleRoyaleAbi } from "@/lib/contract/abi";

export function useIsOwner(address: Address | undefined): boolean {
  const [owner, setOwner] = useState<Address>();

  useEffect(() => {
    publicClient
      .readContract({
        address: CONTRACT_ADDRESS,
        abi: battleRoyaleAbi,
        functionName: "owner",
      })
      .then((result) => setOwner(result as Address))
      .catch(() => setOwner(undefined));
  }, []);

  if (!address || !owner) return false;
  return address.toLowerCase() === owner.toLowerCase();
}
