import { useCallback, useEffect, useRef, useState } from "react";
import { serverNow } from "../utils/clock.ts";
import { getMultiplier, setMultiplier } from "../state/multiplier.ts";
import { MAX_MULTIPLIER, multiplierAt } from "../../shared/fair.ts";
import type { ClientPhase, FairnessInfo, HistoryEntry, PublicRound, ServerEvent } from "../../shared/protocol.ts";

const RECONNECT_MS = 1500;

export interface RoundChip {
  id: string;
  value: number;
  nonce: number;
  seed: string;
  hash: string;
}

export interface Bet {
  amount: number;
  placed: boolean;
  cashedOutAt: number | null;
}

export interface LastResult {
  won: boolean;
  amount: number;
  voided?: boolean;
}

export interface Fairness extends Partial<FairnessInfo> {
  hash: string;
  nonce: number | null;
}

const toChips = (history: HistoryEntry[]): RoundChip[] =>
  history.map((entry) => ({
    id: entry.id,
    value: entry.crashPoint,
    nonce: entry.nonce,
    seed: entry.serverSeed,
    hash: entry.serverSeedHash
  }));

export function useCrashRound(startingBalance = 1000) {
  const [phase, setPhase] = useState<ClientPhase>("connecting");
  const [countdown, setCountdown] = useState(5);
  const [history, setHistory] = useState<RoundChip[]>([]);
  const [balance, setBalance] = useState(startingBalance);
  const [bet, setBet] = useState<Bet>({ amount: 0, placed: false, cashedOutAt: null });
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [fair, setFair] = useState<Fairness>({ hash: "", nonce: null });

  const round = useRef<PublicRound | null>(null);
  const betRef = useRef(bet);
  betRef.current = bet;

  const liveMultiplier = useCallback((): number => {
    const started = round.current?.flyingStartedAt;
    return started ? Math.min(multiplierAt(serverNow() - started), MAX_MULTIPLIER) : getMultiplier();
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;
    let reconnect: number | undefined;
    let closed = false;

    const settle = (crashPoint: number): void => {
      const active = betRef.current;
      if (!active.placed) return;

      if (active.cashedOutAt === null) {
        setLastResult({ won: false, amount: active.amount });
        return;
      }

      if (active.cashedOutAt > crashPoint) {
        setBalance((value) => value - active.amount * active.cashedOutAt!);
        setBet((value) => ({ ...value, cashedOutAt: null }));
        setLastResult({ won: false, amount: active.amount, voided: true });
      }
    };

    const apply = (next: PublicRound): void => {
      round.current = next;
      setFair((value) => ({ ...value, hash: next.serverSeedHash, nonce: next.nonce }));
      setPhase(next.phase);

      if (next.phase === "waiting") {
        setMultiplier(1);
        setLastResult(null);
        setBet({ amount: 0, placed: false, cashedOutAt: null });
      } else if (next.phase === "crashed" && next.crashPoint !== undefined) {
        setMultiplier(next.crashPoint);
        settle(next.crashPoint);
      }
    };

    const connect = (): void => {
      source = new EventSource("/api/stream");

      source.onmessage = (event: MessageEvent<string>) => {
        const message = JSON.parse(event.data) as ServerEvent;

        if (message.type === "halted") {
          setPhase("offline");
          return;
        }

        if (message.type === "snapshot") setFair((value) => ({ ...value, ...message.fairness }));
        if ("history" in message && message.history) setHistory(toChips(message.history));
        if (message.round) apply(message.round);
      };

      source.onerror = () => {
        if (closed) return;
        source?.close();
        setPhase((value) => (value === "connecting" ? "offline" : value));
        reconnect = window.setTimeout(connect, RECONNECT_MS);
      };
    };

    connect();

    return () => {
      closed = true;
      window.clearTimeout(reconnect);
      source?.close();
    };
  }, []);

  useEffect(() => {
    if (phase !== "flying") return;

    let frame = 0;
    const step = (): void => {
      setMultiplier(liveMultiplier());
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, liveMultiplier]);

  useEffect(() => {
    if (phase !== "waiting") return;

    const tick = (): void => {
      const endsAt = round.current?.countdownEndsAt;
      if (endsAt) setCountdown(Math.max(0, Math.ceil((endsAt - serverNow()) / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase]);

  const placeBet = useCallback(
    (amount: number): boolean => {
      if (phase !== "waiting" || bet.placed || amount <= 0 || amount > balance) return false;
      setBalance((value) => value - amount);
      setBet({ amount, placed: true, cashedOutAt: null });
      return true;
    },
    [phase, bet.placed, balance]
  );

  const cashOut = useCallback((): void => {
    if (phase !== "flying" || !bet.placed || bet.cashedOutAt !== null) return;

    const at = liveMultiplier();
    setBalance((value) => value + bet.amount * at);
    setBet((value) => ({ ...value, cashedOutAt: at }));
    setLastResult({ won: true, amount: bet.amount * at });
  }, [phase, bet, liveMultiplier]);

  return { phase, countdown, history, balance, bet, lastResult, fair, placeBet, cashOut };
}
