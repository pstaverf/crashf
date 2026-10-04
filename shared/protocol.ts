export type Phase = "waiting" | "flying" | "crashed";
export type ClientPhase = Phase | "connecting" | "offline";

export interface PublicRound {
  id: string;
  nonce: number;
  phase: Phase;
  serverSeedHash: string;
  countdownEndsAt: number;
  flyingStartedAt: number | null;
  crashPoint?: number;
  serverSeed?: string;
  crashedAt?: number;
  nextRoundAt?: number;
}

export interface HistoryEntry {
  id: string;
  nonce: number;
  crashPoint: number;
  serverSeed: string;
  serverSeedHash: string;
  hmacHex: string;
  crashedAt: number;
}

export interface FairnessInfo {
  salt: string;
  maxMultiplier: number;
  terminalCommit: string;
  totalRounds: number;
  remaining: number;
}

export interface Snapshot {
  type: "snapshot";
  now: number;
  round: PublicRound | null;
  history: HistoryEntry[];
  fairness: FairnessInfo;
}

export type ServerEvent =
  | Snapshot
  | { type: "round:waiting" | "round:flying"; now: number; round: PublicRound }
  | { type: "round:crashed"; now: number; round: PublicRound; history: HistoryEntry[] }
  | { type: "halted"; now: number; reason: string };
