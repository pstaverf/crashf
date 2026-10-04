import { useEffect, useRef, useState } from "react";
import { syncClock } from "../utils/clock.js";

/** Пороги из спецификации бейджа. */
const GOOD_MS = 100; // < 100 мс  — зелёный
const BAD_MS = 250; // > 250 мс  — красный
const INTERVAL_MS = 1000; // число обновляется раз в секунду
const TIMEOUT_MS = 3000; // дольше ждать бессмысленно — это уже «плохо»

/**
 * Реальный RTT до игрового сервера.
 *
 * Раньше здесь был HEAD-запрос на origin самой страницы — то есть замер
 * задержки до CDN со статикой, а не до сервера, который ведёт раунд.
 * Теперь ходим на /api/ping: минимальный JSON с серверным временем, который
 * заодно синхронизирует часы для расчёта множителя.
 */
export function usePing() {
  const [ping, setPing] = useState(null);
  const [status, setStatus] = useState("good"); // до первого замера — зелёная точка
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function measure() {
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const started = performance.now();

      try {
        const res = await fetch(`/api/ping?t=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const rtt = Math.round(performance.now() - started);
        const body = await res.json().catch(() => null);
        if (cancelled) return;

        if (body && typeof body.t === "number") syncClock(body.t, rtt);

        setPing(rtt);
        setStatus(rtt < GOOD_MS ? "good" : rtt <= BAD_MS ? "medium" : "bad");
      } catch {
        if (cancelled) return;
        // Таймаут или обрыв сети — это и есть «плохо», так и показываем.
        setPing(null);
        setStatus("bad");
      } finally {
        clearTimeout(abortTimer);
        if (!cancelled) timerRef.current = setTimeout(measure, INTERVAL_MS);
      }
    }

    measure();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { ping, status };
}
