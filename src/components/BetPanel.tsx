import { memo, useEffect, useRef, useState } from "react";
import { subscribeMultiplier } from "../state/multiplier.ts";
import type { ClientPhase } from "../../shared/protocol.ts";
import type { Bet, LastResult } from "../hooks/useCrashRound.ts";
import "./BetPanel.css";

const PRESETS = [50, 100, 250, 500];

interface BetPanelProps {
  phase: ClientPhase;
  balance: number;
  bet: Bet;
  lastResult: LastResult | null;
  onPlaceBet: (amount: number) => boolean;
  onCashOut: () => void;
}

function LivePayout({ amount }: { amount: number }) {
  const node = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      subscribeMultiplier((value) => {
        if (node.current) node.current.textContent = (amount * value).toFixed(0);
      }),
    [amount]
  );

  return <span ref={node} className="betpanel__payout" />;
}

function NeonSnake() {
  return (
    <svg className="betpanel__snake" aria-hidden="true" focusable="false">
      <rect className="betpanel__snake-line betpanel__snake-line--tail" pathLength={100} width="100%" height="100%" rx="17.5" />
      <rect className="betpanel__snake-line betpanel__snake-line--body" pathLength={100} width="100%" height="100%" rx="17.5" />
      <rect className="betpanel__snake-line betpanel__snake-line--head" pathLength={100} width="100%" height="100%" rx="17.5" />
    </svg>
  );
}

function BetPanel({ phase, balance, bet, lastResult, onPlaceBet, onCashOut }: BetPanelProps) {
  const [amount, setAmount] = useState(100);

  const canBet = phase === "waiting" && !bet.placed;
  const canCashOut = phase === "flying" && bet.placed && bet.cashedOutAt === null;
  const invalid = amount <= 0 || amount > balance;
  const mood = canCashOut ? "live" : canBet ? "idle" : "calm";

  return (
    <div className={`betpanel betpanel--${mood}`}>
      <NeonSnake />

      <div className="betpanel__content">
        {canBet && (
          <>
            <div className="betpanel__row">
              <label className="betpanel__field">
                <span className="betpanel__field-label">Ставка</span>
                <span className={`betpanel__input-wrap${invalid ? " betpanel__input-wrap--invalid" : ""}`}>
                  <input
                    className="betpanel__input"
                    type="number"
                    min="1"
                    max={balance}
                    value={amount}
                    onChange={(event) => setAmount(Math.max(0, Number(event.target.value)))}
                  />
                  <span className="betpanel__unit">⭐</span>
                </span>
              </label>
              <button className="betpanel__cta" disabled={invalid} onClick={() => onPlaceBet(amount)}>
                Сделать ставку
              </button>
            </div>

            <div className="betpanel__presets">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  className={`betpanel__preset${amount === preset ? " betpanel__preset--active" : ""}`}
                  disabled={preset > balance}
                  onClick={() => setAmount(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === "waiting" && bet.placed && (
          <div className="betpanel__status betpanel__status--pending">
            Ставка <b>{bet.amount}</b> принята — старт через мгновение
          </div>
        )}

        {canCashOut && (
          <button className="betpanel__cta betpanel__cta--live" onClick={onCashOut}>
            <span className="betpanel__cta-label">Забрать</span>
            <LivePayout amount={bet.amount} />
          </button>
        )}

        {bet.placed && bet.cashedOutAt !== null && phase !== "waiting" && (
          <div className="betpanel__status betpanel__status--win">
            Забрано на x{bet.cashedOutAt.toFixed(2)} · +{(bet.amount * (bet.cashedOutAt - 1)).toFixed(0)}
          </div>
        )}

        {phase === "crashed" && lastResult?.won === false && (
          <div className="betpanel__status betpanel__status--loss">
            {lastResult.voided ? "Кэш-аут не прошёл: раунд уже лопнул" : "Ставка сгорела"}
          </div>
        )}

        {phase !== "waiting" && !bet.placed && (
          <div className="betpanel__status betpanel__status--muted">
            {phase === "connecting" || phase === "offline" ? "Ждём игровой сервер…" : "Ставки откроются в начале следующего раунда"}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(BetPanel);
