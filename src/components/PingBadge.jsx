import { usePing } from "../hooks/usePing.js";
import "./PingBadge.css";

const EMOJI = { good: "🟢", ok: "🟡", bad: "🔴", unknown: "⚪" };

export default function PingBadge() {
  const { ping, status } = usePing();

  return (
    <div className="ping-badge">
      <span className={`ping-badge__dot ping-badge__dot--${status}`}>{EMOJI[status]}</span>
      <span className="ping-badge__text">PING: {ping == null ? "…" : `${ping}ms`}</span>
    </div>
  );
}
