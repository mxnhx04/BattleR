export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  address: string;
  hp: number;
  maxHp: number;
  shielded: boolean;
  alive: boolean;
  healsUsed: number;
  isYou: boolean;
  attackReadyAt: number;
  powerReadyAt: number;
}

export type MatchStatus = "waiting" | "active" | "finished";

export type ActivityKind =
  | "join"
  | "attack"
  | "shield"
  | "heal"
  | "power"
  | "eliminate"
  | "win"
  | "system";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  message: string;
  timestamp: number;
  txHash: string;
}

export interface TxCounts {
  attack: number;
  shield: number;
  heal: number;
  power: number;
  join: number;
}

export interface MatchState {
  status: MatchStatus;
  players: Player[];
  prizePoolMon: number;
  txCounts: TxCounts;
  activity: ActivityEvent[];
  winnerId: PlayerId | null;
  startedAt: number | null;
  finishedAt: number | null;
}
