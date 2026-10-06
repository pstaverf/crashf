import { memo } from "react";
import { usePing } from "../hooks/usePing.ts";
import "./PingBadge.css";

function PingBadge() {
  const { ping, status } = usePing();

  return (
    <div className="arena-ping-badge" id="arena-ping-badge" title="Сетевая задержка">
      <span className={`arena-ping-dot ping-${status}`} id="arena-ping-dot" />
      <span className="arena-ping-text">
        ПИНГ: <strong id="arena-ping-val">{ping ?? "--"}</strong>мс
      </span>
    </div>
  );
}

export default memo(PingBadge);
