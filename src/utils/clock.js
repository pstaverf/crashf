/**
 * Часы, синхронизированные с игровым сервером.
 *
 * Весь таймлайн раунда (старт полёта, момент краша) приходит в СЕРВЕРНЫХ
 * миллисекундах. Локальные часы браузера могут отличаться на секунды, поэтому
 * множитель считаем не от `Date.now()`, а от `serverNow()`.
 *
 * Смещение обновляет пинг-замер: он и так ходит на /api/ping раз в секунду и
 * знает RTT, так что поправка «серверное время + половина RTT» достаётся бесплатно.
 */
let offset = 0; // serverNow - clientNow
let synced = false;

export function syncClock(serverTimeMs, rttMs) {
  const estimate = serverTimeMs + rttMs / 2 - Date.now();
  // Сглаживаем, чтобы единичный лаг не дёргал весь таймлайн.
  offset = synced ? offset * 0.7 + estimate * 0.3 : estimate;
  synced = true;
}

export function serverNow() {
  return Date.now() + offset;
}

export function isClockSynced() {
  return synced;
}
