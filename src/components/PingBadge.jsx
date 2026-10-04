import { usePing } from "../hooks/usePing.js";
import "./PingBadge.css";

/**
 * Индикатор сетевой задержки до игрового сервера.
 * Разметка и классы — по дизайн-спецификации (.arena-ping-badge).
 */
export default function PingBadge() {
  const { ping, status } = usePing();

  return (
    <div className="arena-ping-badge" id="arena-ping-badge" title="Сетевая задержка">
      <span className={`arena-ping-dot ping-${status}`} id="arena-ping-dot" />
      <span className="arena-ping-text">
        ПИНГ: <strong id="arena-ping-val">{ping == null ? "--" : ping}</strong>мс
      </span>
    </div>
  );
}
