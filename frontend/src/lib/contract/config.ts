import { createPublicClient, defineChain, http, type Address, type Hash } from "viem";

export const monadTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 10143),
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address;
export const DEPLOY_TX_HASH = process.env.NEXT_PUBLIC_DEPLOY_TX_HASH as Hash | undefined;

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export function explorerTxUrl(hash: string): string {
  return `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${monadTestnet.blockExplorers.default.url}/address/${address}`;
}
