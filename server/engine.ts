import { createChainStore } from "./chain.ts";
import { hmacSha256Hex } from "./crypto.ts";
import { SALT, MAX_MULTIPLIER, crashPointFromHmacHex, flightDurationMs } from "../shared/fair.ts";
import type { FairnessInfo, HistoryEntry, PublicRound, Snapshot } from "../shared/protocol.ts";

const COUNTDOWN_MS = 5000;
const CRASHED_HOLD_MS = 5000;
const HISTORY_SIZE = 20;

type Send = (payload: string) => void;

interface InternalRound extends PublicRound {
  seed: string;
  hmacHex: string;
  crash: number;
  durationMs: number;
}

export interface Engine {
  start(): void;
  stop(): void;
  snapshotJson(): string;
  fairnessJson(): string;
  history(): HistoryEntry[];
  subscribe(send: Send): () => void;
}

export function createEngine(): Engine {
  const chain = createChainStore();
  const subscribers = new Set<Send>();

  let round: InternalRound | null = null;
  let history: HistoryEntry[] = [];
  let timer: NodeJS.Timeout | null = null;
  let snapshotCache: string | null = null;
  let fairnessCache: string | null = null;

  const fairness = (): FairnessInfo => ({
    salt: SALT,
    maxMultiplier: MAX_MULTIPLIER,
    terminalCommit: chain.terminalCommit,
    totalRounds: chain.totalRounds,
    remaining: chain.remaining
  });

  const publicRound = (): PublicRound | null => {
    if (!round) return null;
    const { id, nonce, phase, serverSeedHash, countdownEndsAt, flyingStartedAt } = round;
    const base: PublicRound = { id, nonce, phase, serverSeedHash, countdownEndsAt, flyingStartedAt };
    if (phase !== "crashed") return base;
    return { ...base, crashPoint: round.crash, serverSeed: round.seed, crashedAt: round.crashedAt, nextRoundAt: round.nextRoundAt };
  };

  const invalidate = (): void => {
    snapshotCache = null;
    fairnessCache = null;
  };

  const broadcast = (payload: string): void => {
    for (const send of subscribers) {
      try {
        send(payload);
      } catch {
        subscribers.delete(send);
      }
    }
  };

  const emit = (body: string): void => {
    invalidate();
    broadcast(`data: {"now":${Date.now()},${body}}\n\n`);
  };

  const startWaiting = (): void => {
    let next;
    try {
      next = chain.next();
    } catch (err) {
      emit(`"type":"halted","reason":${JSON.stringify((err as Error).message)}`);
      return;
    }

    const hmacHex = hmacSha256Hex(next.seed, SALT);
    const crash = crashPointFromHmacHex(hmacHex);

    round = {
      id: `r${next.index}`,
      nonce: next.index,
      phase: "waiting",
      serverSeedHash: next.hash,
      countdownEndsAt: Date.now() + COUNTDOWN_MS,
      flyingStartedAt: null,
      seed: next.seed,
      hmacHex,
      crash,
      durationMs: flightDurationMs(crash)
    };

    emit(`"type":"round:waiting","round":${JSON.stringify(publicRound())}`);
    timer = setTimeout(startFlying, COUNTDOWN_MS);
  };

  const startFlying = (): void => {
    if (!round) return;
    round.phase = "flying";
    round.flyingStartedAt = Date.now();
    emit(`"type":"round:flying","round":${JSON.stringify(publicRound())}`);
    timer = setTimeout(crash, round.durationMs > 0 ? round.durationMs : 0);
  };

  const crash = (): void => {
    if (!round) return;
    round.phase = "crashed";
    round.crashedAt = Date.now();
    round.nextRoundAt = round.crashedAt + CRASHED_HOLD_MS;

    history = [
      {
        id: round.id,
        nonce: round.nonce,
        crashPoint: round.crash,
        serverSeed: round.seed,
        serverSeedHash: round.serverSeedHash,
        hmacHex: round.hmacHex,
        crashedAt: round.crashedAt
      },
      ...history
    ].slice(0, HISTORY_SIZE);

    emit(`"type":"round:crashed","round":${JSON.stringify(publicRound())},"history":${JSON.stringify(history)}`);
    timer = setTimeout(startWaiting, CRASHED_HOLD_MS);
  };

  return {
    start(): void {
      if (timer) clearTimeout(timer);
      startWaiting();
    },
    stop(): void {
      if (timer) clearTimeout(timer);
    },
    snapshotJson(): string {
      if (snapshotCache === null) {
        const snapshot: Omit<Snapshot, "now"> = { type: "snapshot", round: publicRound(), history, fairness: fairness() };
        snapshotCache = JSON.stringify(snapshot).slice(1, -1);
      }
      return `{"now":${Date.now()},${snapshotCache}}`;
    },
    fairnessJson(): string {
      if (fairnessCache === null) fairnessCache = JSON.stringify({ ...fairness(), history });
      return fairnessCache;
    },
    history: () => history,
    subscribe(send: Send): () => void {
      subscribers.add(send);
      return () => {
        subscribers.delete(send);
      };
    }
  };
}
