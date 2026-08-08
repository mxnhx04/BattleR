// Deterministic pseudo-address so the same player name always renders the
// same "wallet". Replaced by a real connected address once wallet wiring
// lands in Phase 4.
export function shortAddress(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0");
  return `0x${hex.slice(0, 4)}…${hex.slice(4, 8)}`;
}

export function fakeTxHash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `0x${hex}`;
}

export function shortTxHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export function formatMon(amount: number): string {
  return `${amount.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")} MON`;
}
