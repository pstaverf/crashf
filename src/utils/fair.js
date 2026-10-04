/**
 * Браузерная сторона проверки честности.
 *
 * Здесь НЕТ генерации раундов — её забрал сервер. Остались только примитивы,
 * которыми клиент НЕЗАВИСИМО пересчитывает уже сыгранный раунд из раскрытого
 * сида и сравнивает результат с тем, что показал сервер.
 *
 * Формула живёт в общем модуле shared/fair.js — ровно тот же файл импортирует
 * сервер. Разъехаться они не могут по построению.
 */
import { verifyRound as verifyRoundCore, SALT, MAX_MULTIPLIER } from "../../shared/fair.js";

export { SALT, MAX_MULTIPLIER };

/** Web Crypto доступен только в secure context (https или localhost). */
export function cryptoAvailable() {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(digest);
}

export async function hmacSha256Hex(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return toHex(signature);
}

/**
 * Перепроверить раунд прямо в браузере.
 * Возвращает `{ unavailable: true }`, если страница открыта не по HTTPS —
 * раньше в такой ситуации приложение просто молча умирало.
 */
export async function verifyRoundInBrowser(round, previousSeed) {
  if (!cryptoAvailable()) {
    return { unavailable: true, ok: false, reason: "Проверка требует HTTPS (Web Crypto недоступен)" };
  }
  try {
    return await verifyRoundCore(
      { serverSeed: round.serverSeed, serverSeedHash: round.serverSeedHash, crashPoint: round.crashPoint },
      previousSeed,
      sha256Hex,
      hmacSha256Hex
    );
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
