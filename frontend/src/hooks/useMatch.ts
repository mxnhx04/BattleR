"use client";

import { useSyncExternalStore } from "react";
import { getState, subscribe } from "@/lib/matchStore";
import type { MatchState } from "@/lib/types";

export function useMatch(): MatchState {
  return useSyncExternalStore(subscribe, getState, getState);
}
