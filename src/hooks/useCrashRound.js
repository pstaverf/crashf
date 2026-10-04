import { useCallback, useEffect, useRef, useState } from "react";
import { serverNow } from "../utils/clock.js";
import { multiplierAt, MAX_MULTIPLIER } from "../../shared/fair.js";

/**
 * Клиент серверного раунда.
 *
 * Раньше этот хук САМ придумывал точку краша — то есть «честность» проверял
 * тот же код, который и жульничал бы. Теперь раунд целиком ведёт сервер
 * (`server/engine.js`), а хук только:
 *   1. слушает SSE /api/stream,
 *   2. рисует множитель по серверному таймлайну между событиями,
 *   3. ведёт локальный демо-баланс.
 *
 * Точка краша приходит клиенту ТОЛЬКО вместе с событием взрыва — подсмотреть
 * её в DevTools до этого момента физически нечего.
 */
export function useCrashRound({ startingBalance = 1000 } = {}) {
  const [phase, setPhase] = useState("connecting"); // connecting | waiting | flying | crashed | offline
  const [countdown, setCountdown] = useState(5);
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState(startingBalance);
  const [bet, setBet] = useState({ amount: 0, placed: false, cashedOutAt: null });
  const [lastResult, setLastResult] = useState(null);
  const [fair, setFair] = useState({
    hash: "",
    salt: "",
    terminalCommit: "",
    totalRounds: 0,
    remaining: 0,
    nonce: null
  });

  const roundRef = useRef(null);
  const betRef = useRef(bet);
  const rafRef = useRef(null);
  const phaseRef = useRef(phase);

  useEffect(() => {
    betRef.current = bet;
  }, [bet]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /** Ставка не сыграла — закрываем раунд проигрышем. */
  const settleLoss = useCallback((currentBet) => {
    if (currentBet.placed && currentBet.cashedOutAt == null) {
      setLastResult({ won: false, amount: currentBet.amount });
    }
  }, []);

  // ----------------------------------------------------------------- стрим
  useEffect(() => {
    let source;
    let reconnectTimer = null;
    let closed = false;

    const applyRound = (round, snapshotHistory) => {
      if (!round) return;
      roundRef.current = round;

      setFair((f) => ({ ...f, hash: round.serverSeedHash, nonce: round.nonce }));

      if (snapshotHistory) {
        setHistory(
          snapshotHistory.map((r) => ({
            id: r.id,
            value: r.crashPoint,
            nonce: r.nonce,
            seed: r.serverSeed,
            hash: r.serverSeedHash
          }))
        );
      }

      if (round.phase === "waiting") {
        setPhase("waiting");
        setMultiplier(1.0);
        setLastResult(null);
        setBet({ amount: 0, placed: false, cashedOutAt: null });
      } else if (round.phase === "flying") {
        setPhase("flying");
      } else if (round.phase === "crashed") {
        setPhase("crashed");
        setMultiplier(round.crashPoint);

        const currentBet = betRef.current;
        // Защита целостности: забрать выше точки краша нельзя, даже если
        // локальная анимация успела нарисовать больше из-за сетевой задержки.
        if (currentBet.placed && currentBet.cashedOutAt != null && currentBet.cashedOutAt > round.crashPoint) {
          setBalance((b) => b - currentBet.amount * currentBet.cashedOutAt);
          setBet((c) => ({ ...c, cashedOutAt: null }));
          setLastResult({ won: false, amount: currentBet.amount, voided: true });
        } else {
          settleLoss(currentBet);
        }
      }
    };

    const connect = () => {
      source = new EventSource("/api/stream");

      source.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.fairness) {
          setFair((f) => ({ ...f, ...msg.fairness }));
        }

        if (msg.type === "halted") {
          setPhase("offline");
          return;
        }

        applyRound(msg.round, msg.history || (msg.type === "snapshot" ? [] : null));
      };

      source.onerror = () => {
        if (closed) return;
        source.close();
        setPhase((p) => (p === "connecting" ? "offline" : p));
        reconnectTimer = setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (source) source.close();
    };
  }, [settleLoss]);

  // ------------------------------------------------- анимация множителя
  useEffect(() => {
    if (phase !== "flying") return undefined;

    const step = () => {
      const round = roundRef.current;
      if (round?.flyingStartedAt) {
        const elapsed = serverNow() - round.flyingStartedAt;
        setMultiplier(Math.min(multiplierAt(elapsed), MAX_MULTIPLIER));
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // --------------------------------------------------------- отсчёт 5→1
  useEffect(() => {
    if (phase !== "waiting") return undefined;

    const tick = () => {
      const round = roundRef.current;
      if (!round?.countdownEndsAt) return;
      setCountdown(Math.max(0, Math.ceil((round.countdownEndsAt - serverNow()) / 1000)));
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [phase]);

  // ------------------------------------------------------------- ставки
  const placeBet = useCallback(
    (amount) => {
      if (phase !== "waiting" || bet.placed || amount <= 0 || amount > balance) return false;
      setBalance((b) => b - amount);
      setBet({ amount, placed: true, cashedOutAt: null });
      return true;
    },
    [phase, bet.placed, balance]
  );

  const cashOut = useCallback(() => {
    if (phase !== "flying" || !bet.placed || bet.cashedOutAt != null) return;

    // Берём множитель на момент клика по серверным часам, а не последнее
    // отрисованное значение — так клик не теряет и не выигрывает лишний кадр.
    const round = roundRef.current;
    const at = round?.flyingStartedAt
      ? Math.min(multiplierAt(serverNow() - round.flyingStartedAt), MAX_MULTIPLIER)
      : multiplier;

    const payout = bet.amount * at;
    setBalance((b) => b + payout);
    setBet((c) => ({ ...c, cashedOutAt: at }));
    setLastResult({ won: true, amount: payout, profit: payout - bet.amount });
  }, [phase, bet, multiplier]);

  return {
    phase,
    countdown,
    multiplier,
    history,
    balance,
    bet,
    lastResult,
    fair,
    placeBet,
    cashOut,
    online: phase !== "offline" && phase !== "connecting"
  };
}
