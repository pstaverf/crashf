import { useEffect, useState } from "react";

const GOOD_MS = 80;
const OK_MS = 180;
const INTERVAL_MS = 5000;

export function usePing() {
  const [ping, setPing] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function measure() {
      const started = performance.now();
      try {
        await fetch(`/?ping=${Date.now()}`, { method: "HEAD", cache: "no-store" });
      } catch {
        // fall through — we still report whatever time elapsed
      }
      const elapsed = Math.round(performance.now() - started);
      if (!cancelled) setPing(elapsed);
    }

    measure();
    const id = setInterval(measure, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const status = ping == null ? "unknown" : ping <= GOOD_MS ? "good" : ping <= OK_MS ? "ok" : "bad";

  return { ping, status };
}
