import { useState } from "react";
import "./BetPanel.css";

const PRESETS = [50, 100, 250, 500];

export default function BetPanel({ phase, balance, bet, multiplier, lastResult, onPlaceBet, onCashOut }) {
  const [amount, setAmount] = useState(100);

  const canBet = phase === "waiting" && !bet.placed;
  const canCashOut = phase === "flying" && bet.placed && bet.cashedOutAt == null;
  const livePayout = bet.amount * multiplier;

  return (
    <div className="betpanel">
      {canBet && (
        <>
          <div className="betpanel__row">
            <div className="betpanel__field">
              <span className="betpanel__field-label">Ставка</span>
              <input
                className="betpanel__input"
                type="number"
                min="1"
                max={balance}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              />
            </div>
            <button
              className="betpanel__cta"
              disabled={amount <= 0 || amount > balance}
              onClick={() => onPlaceBet(amount)}
            >
              Сделать ставку
            </button>
          </div>
          <div className="betpanel__presets">
            {PRESETS.map((p) => (
              <button key={p} className="betpanel__preset" onClick={() => setAmount(p)}>
                {p}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === "waiting" && bet.placed && (
        <div className="betpanel__status betpanel__status--pending">
          Ставка {bet.amount} принята — старт через мгновение
        </div>
      )}

      {canCashOut && (
        <button className="betpanel__cta betpanel__cta--live" onClick={onCashOut}>
          Забрать · {livePayout.toFixed(0)}
        </button>
      )}

      {bet.placed && bet.cashedOutAt != null && phase !== "waiting" && (
        <div className="betpanel__status betpanel__status--win">
          Забрано на x{bet.cashedOutAt.toFixed(2)} · +{(bet.amount * bet.cashedOutAt).toFixed(0)}
        </div>
      )}

      {phase === "crashed" && lastResult && lastResult.won === false && (
        <div className="betpanel__status betpanel__status--loss">Ставка сгорела</div>
      )}

      {phase !== "waiting" && !bet.placed && (
        <div className="betpanel__status betpanel__status--muted">Ставки откроются в начале следующего раунда</div>
      )}
    </div>
  );
}
