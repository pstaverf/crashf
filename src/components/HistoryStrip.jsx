import "./HistoryStrip.css";

function rangeFor(value) {
  if (value < 2.0) return "cold";
  if (value <= 3.0) return "warm";
  if (value <= 10.0) return "climb";
  return "danger";
}

export default function HistoryStrip({ history }) {
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
