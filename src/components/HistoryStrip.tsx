import { memo } from "react";
import type { RoundChip } from "../hooks/useCrashRound.ts";
import "./HistoryStrip.css";

const rangeFor = (value: number): string => {
  if (value < 2) return "cold";
  if (value <= 3) return "warm";
  if (value <= 10) return "climb";
  return "danger";
};

function HistoryStrip({ history }: { history: RoundChip[] }) {
  if (history.length === 0) return <div className="history history--empty">Раунды появятся здесь</div>;

  return (
    <div className="history">
      {history.map((round) => (
        <span key={round.id} className={`history__chip history__chip--${rangeFor(round.value)}`}>
          x{round.value.toFixed(2)}
        </span>
      ))}
    </div>
  );
}

export default memo(HistoryStrip);
