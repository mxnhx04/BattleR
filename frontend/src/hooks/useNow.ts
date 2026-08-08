"use client";

import { useEffect, useState } from "react";

// Drives re-renders for cooldown countdowns, which live as timestamps in
// the match store rather than as their own reactive state.
export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
