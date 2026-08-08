"use client";

import { useCallback, useState } from "react";
import { playSfx, type SfxKind } from "@/lib/sfx";

const STORAGE_KEY = "battle-royale-sfx-muted";

function readStoredMuted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function useSfx() {
  const [muted, setMuted] = useState<boolean>(readStoredMuted);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const play = useCallback(
    (kind: SfxKind) => {
      if (!muted) playSfx(kind);
    },
    [muted],
  );

  return { play, muted, toggleMuted };
}
