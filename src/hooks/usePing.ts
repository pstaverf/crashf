import { useEffect, useRef, useState } from "react";
import { syncClock } from "../utils/clock.ts";

const GOOD_MS = 100;
const BAD_MS = 250;
const INTERVAL_MS = 1000;
const TIMEOUT_MS = 3000;

export type PingStatus = "good" | "medium" | "bad";

export function usePing(): { ping: number | null; status: PingStatus } {
  const [ping, setPing] = useState<number | null>(null);
  const [status, setStatus] = useState<PingStatus>("good");
  const timer = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    const measure = async (): Promise<void> => {
      const controller = new AbortController();
      const abort = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
      const started = performance.now();

      try {
        const res = await fetch(`/api/ping?t=${Date.now()}`, { cache: "no-store", signal: controller.signal });
        const rtt = Math.round(performance.now() - started);
        const body = (await res.json()) as { t?: number };
        if (cancelled) return;

        if (typeof body.t === "number") syncClock(body.t, rtt);
        setPing(rtt);
        setStatus(rtt < GOOD_MS ? "good" : rtt <= BAD_MS ? "medium" : "bad");
      } catch {
        if (cancelled) return;
        setPing(null);
        setStatus("bad");
      } finally {
        window.clearTimeout(abort);
        if (!cancelled) timer.current = window.setTimeout(measure, INTERVAL_MS);
      }
    };

    void measure();

    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
    };
  }, []);

  return { ping, status };
}
