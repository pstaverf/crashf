import { createChainStore } from "./chain.js";
import { hmacSha256Hex } from "./crypto.js";
import { SALT, MAX_MULTIPLIER, crashPointFromHmacHex, flightDurationMs } from "../shared/fair.js";

const COUNTDOWN_MS = 5000;
const CRASHED_HOLD_MS = 5000;
const HISTORY_SIZE = 20;

/**
 * Единственный источник правды об игре.
 *
 * Раунд один на всех подключённых игроков, таймлайн считает сервер, точка
 * краша фиксируется ДО старта и раскрывается только после взрыва. Клиент
 * получает её не раньше остальных — он физически не может «подсмотреть».
 */
export function createEngine() {
  const chain = createChainStore();
  const subscribers = new Set();

  let round = null;
  let history = [];
  let timer = null;
  let roundCounter = 0;

  const publicRound = () => {
    if (!round) return null;
    const base = {
      id: round.id,
      nonce: round.nonce,
      phase: round.phase,
      serverSeedHash: round.serverSeedHash,
      countdownEndsAt: round.countdownEndsAt,
      flyingStartedAt: round.flyingStartedAt ?? null
    };
    // Сид и множитель — только после краша. До него их в ответе нет вообще.
    if (round.phase === "crashed") {
      base.crashPoint = round.crashPoint;
      base.serverSeed = round.serverSeed;
      base.crashedAt = round.crashedAt;
      base.nextRoundAt = round.nextRoundAt;
    }
    return base;
  };

  const snapshot = () => ({
    type: "snapshot",
    now: Date.now(),
    round: publicRound(),
    history,
    fairness: {
      salt: SALT,
      maxMultiplier: MAX_MULTIPLIER,
      terminalCommit: chain.terminalCommit,
      totalRounds: chain.totalRounds,
      remaining: chain.remaining
    }
  });

  const broadcast = (event) => {
    const payload = JSON.stringify({ ...event, now: Date.now() });
    for (const send of subscribers) {
      try {
        send(payload);
      } catch {
        subscribers.delete(send);
      }
    }
  };

  const startWaiting = () => {
    let seed;
    try {
      seed = chain.next();
    } catch (err) {
      console.error("[engine]", err.message);
      broadcast({ type: "halted", reason: err.message });
      return;
    }

    const hmacHex = hmacSha256Hex(seed.seed, SALT);
    const crashPoint = crashPointFromHmacHex(hmacHex);
    const now = Date.now();

    roundCounter += 1;
    round = {
      id: `r${seed.index}`,
      nonce: seed.index,
      phase: "waiting",
      serverSeed: seed.seed,
      serverSeedHash: seed.hash,
      hmacHex,
      crashPoint,
      durationMs: flightDurationMs(crashPoint),
      countdownEndsAt: now + COUNTDOWN_MS,
      flyingStartedAt: null,
      crashedAt: null,
      nextRoundAt: null
    };

    broadcast({ type: "round:waiting", round: publicRound() });
    timer = setTimeout(startFlying, COUNTDOWN_MS);
  };

  const startFlying = () => {
    round.phase = "flying";
    round.flyingStartedAt = Date.now();
    broadcast({ type: "round:flying", round: publicRound() });
    timer = setTimeout(crash, Math.max(0, round.durationMs));
  };

  const crash = () => {
    round.phase = "crashed";
    round.crashedAt = Date.now();
    round.nextRoundAt = round.crashedAt + CRASHED_HOLD_MS;

    history = [
      {
        id: round.id,
        nonce: round.nonce,
        crashPoint: round.crashPoint,
        serverSeed: round.serverSeed,
        serverSeedHash: round.serverSeedHash,
        hmacHex: round.hmacHex,
        crashedAt: round.crashedAt
      },
      ...history
    ].slice(0, HISTORY_SIZE);

    broadcast({ type: "round:crashed", round: publicRound(), history });
    timer = setTimeout(startWaiting, CRASHED_HOLD_MS);
  };

  const start = () => {
    if (timer) clearTimeout(timer);
    startWaiting();
  };

  return {
    start,
    stop: () => timer && clearTimeout(timer),
    snapshot,
    getHistory: () => history,
    getRound: (id) => history.find((r) => r.id === id) || null,
    fairnessInfo: () => snapshot().fairness,
    subscribe(send) {
      subscribers.add(send);
      return () => subscribers.delete(send);
    }
  };
}
