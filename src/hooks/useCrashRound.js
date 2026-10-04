import { useCallback, useEffect, useRef, useState } from "react";
import { crashPointFromHash, randomSeed, sha256Hex } from "../utils/fair.js";

const COUNTDOWN_START = 5;
const COUNTDOWN_TICK_MS = 1000;
const CRASHED_HOLD_MS = 5000;
const GROWTH_K = Math.log(10) / 6600; // ~10x around 6.6s of flight

export function useCrashRound({ startingBalance = 1000 } = {}) {
  const [phase, setPhase] = useState("waiting"); // waiting | flying | crashed
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState(startingBalance);
  const [bet, setBet] = useState({ amount: 0, placed: false, cashedOutAt: null });
  const [lastResult, setLastResult] = useState(null); // { won, amount }
  const [fair, setFair] = useState({ hash: "", seed: null });

  const crashPointRef = useRef(1.0);
  const flightStartRef = useRef(0);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const betRef = useRef(bet);
  const fairRef = useRef({ hash: "", seed: "" });

  useEffect(() => {
    betRef.current = bet;
  }, [bet]);

  const clearTimers = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const beginWaiting = useCallback(async () => {
    setPhase("waiting");
    setCountdown(COUNTDOWN_START);
    setMultiplier(1.0);
    setLastResult(null);

    // Commit: publish this round's hash before it starts. The seed behind
    // it (and therefore the crash point) is only revealed after the crash.
    const seed = randomSeed();
    const hash = await sha256Hex(seed);
    fairRef.current = { hash, seed };
    crashPointRef.current = crashPointFromHash(hash);
    setFair({ hash, seed: null });

    let n = COUNTDOWN_START;
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        setCountdown(0);
        beginFlying();
        return;
      }
      setCountdown(n);
      timeoutRef.current = setTimeout(tick, COUNTDOWN_TICK_MS);
    };
    timeoutRef.current = setTimeout(tick, COUNTDOWN_TICK_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginFlying = () => {
    setPhase("flying");
    flightStartRef.current = performance.now();

    const step = (now) => {
      const elapsed = now - flightStartRef.current;
      const m = Math.exp(GROWTH_K * elapsed);
      if (m >= crashPointRef.current) {
        setMultiplier(crashPointRef.current);
        crashNow();
        return;
      }
      setMultiplier(m);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const crashNow = () => {
    setPhase("crashed");
    const finalValue = crashPointRef.current;
    const { hash, seed } = fairRef.current;
    setFair({ hash, seed }); // reveal
    setHistory((h) => [{ value: finalValue, id: `${Date.now()}`, hash, seed }, ...h].slice(0, 10));

    const currentBet = betRef.current;
    if (currentBet.placed && currentBet.cashedOutAt == null) {
      setLastResult({ won: false, amount: currentBet.amount });
    }

    timeoutRef.current = setTimeout(() => {
      setBet({ amount: 0, placed: false, cashedOutAt: null });
      beginWaiting();
    }, CRASHED_HOLD_MS);
  };

  useEffect(() => {
    beginWaiting();
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeBet = (amount) => {
    if (phase !== "waiting" || bet.placed || amount <= 0 || amount > balance) return false;
    setBalance((b) => b - amount);
    setBet({ amount, placed: true, cashedOutAt: null });
    return true;
  };

  const cashOut = () => {
    if (phase !== "flying" || !bet.placed || bet.cashedOutAt != null) return;
    const payout = bet.amount * multiplier;
    setBalance((b) => b + payout);
    setBet((c) => ({ ...c, cashedOutAt: multiplier }));
    setLastResult({ won: true, amount: payout });
  };

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
    cashOut
  };
}
