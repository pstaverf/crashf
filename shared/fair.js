/**
 * Provably-fair core — ОДИН исходник правды.
 *
 * Этот файл импортируют оба мира:
 *   - сервер (`server/*`)  — чтобы сгенерировать раунд;
 *   - браузер (`src/*`)    — чтобы НЕЗАВИСИМО пересчитать его и сравнить.
 *
 * Поэтому здесь нет ни `node:crypto`, ни Web Crypto: функции принимают
 * абстрактный `hmacSha256Hex`/`sha256Hex`, который каждая сторона
 * подставляет свой. Если формула разъедется между клиентом и сервером —
 * проверка в UI тут же загорится красным, а не промолчит.
 *
 * Схема — цепочка хэшей (hash chain), как в bustabit:
 *
 *   chain[0] = random 32 bytes
 *   chain[i] = sha256(chain[i-1])
 *
 * Раунды играются В ОБРАТНОМ порядке: chain[N-1], chain[N-2], … chain[0].
 * Следствие, которое и даёт доказуемость:
 *
 *   sha256(сид текущего раунда) === сид предыдущего раунда
 *
 * Сервер публикует терминальный хэш цепочки ДО первого раунда. Он физически
 * не может подменить результат задним числом: любой изменённый сид разорвёт
 * связь со всеми уже раскрытыми раундами.
 *
 * Множитель раунда считается от сида и публичной соли:
 *
 *   hmac  = HMAC_SHA256(key = serverSeed, msg = SALT)
 *   bust  = если hmac делится на 50 нацело → 1.00x (это и есть house edge ≈3%)
 *   иначе  h = первые 52 бита hmac,  crash = floor((100·2^52 − h)/(2^52 − h))/100
 *   и финально — потолок MAX_MULTIPLIER.
 */

/** Публичная соль. Входит в формулу, известна заранее, менять её нельзя. */
export const SALT = "ignition:crash:v1";

/** Потолок множителя. Часть опубликованного алгоритма, а не правка постфактум. */
export const MAX_MULTIPLIER = 1000;

/** Скорость роста: ~10x за 6.6 секунды полёта. */
export const GROWTH_K = Math.log(10) / 6600;

/** 1 / HOUSE_EDGE_DIVISOR раундов лопаются мгновенно на 1.00x. Вместе с округлением формулы даёт house edge ≈ 3%. */
export const HOUSE_EDGE_DIVISOR = 50n;

/** Длина полёта в миллисекундах до указанного множителя. */
export function flightDurationMs(multiplier) {
  return Math.log(multiplier) / GROWTH_K;
}

/** Множитель на момент `elapsedMs` полёта (без учёта краша). */
export function multiplierAt(elapsedMs) {
  return Math.exp(GROWTH_K * Math.max(0, elapsedMs));
}

/**
 * Точка краша из HMAC-хэша раунда. Чистая функция: одинаковый hex → одинаковый
 * результат, где угодно.
 */
export function crashPointFromHmacHex(hmacHex) {
  if (!/^[0-9a-f]{64}$/i.test(hmacHex)) {
    throw new Error("crashPointFromHmacHex: ожидается 64 hex-символа");
  }

  // Мгновенный bust — ровно тот механизм, который даёт заведению преимущество.
  if (BigInt(`0x${hmacHex}`) % HOUSE_EDGE_DIVISOR === 0n) return 1.0;

  const h = Number.parseInt(hmacHex.slice(0, 13), 16); // 52 бита — точно в double
  const e = 2 ** 52;
  const raw = Math.floor((100 * e - h) / (e - h)) / 100;

  return Math.min(Math.max(1, raw), MAX_MULTIPLIER);
}

/**
 * Полный пересчёт раунда из раскрытого сида.
 * `hmacSha256Hex(key, message) => Promise<hex> | hex` подставляет вызывающая сторона.
 */
export async function crashPointFromSeed(serverSeed, hmacSha256Hex) {
  const hmacHex = await hmacSha256Hex(serverSeed, SALT);
  return { hmacHex, crashPoint: crashPointFromHmacHex(hmacHex) };
}

/**
 * Проверка одного раунда целиком. Возвращает развёрнутый отчёт, а не булево —
 * чтобы UI мог показать, что именно сошлось, а что нет.
 *
 * @param {object}   round            { serverSeed, serverSeedHash, crashPoint }
 * @param {string?}  previousSeed     сид предыдущего (более раннего) раунда
 * @param {function} sha256Hex        (text) => hex
 * @param {function} hmacSha256Hex    (key, msg) => hex
 */
export async function verifyRound(round, previousSeed, sha256Hex, hmacSha256Hex) {
  const { serverSeed, serverSeedHash, crashPoint } = round;

  const recomputedHash = await sha256Hex(serverSeed);
  const commitOk = recomputedHash === serverSeedHash;

  const { hmacHex, crashPoint: recomputedCrash } = await crashPointFromSeed(serverSeed, hmacSha256Hex);
  const crashOk = Math.abs(recomputedCrash - crashPoint) < 1e-9;

  // Связь с предыдущим раундом: sha256(текущий сид) === предыдущий сид.
  let chainOk = null;
  if (previousSeed) chainOk = (await sha256Hex(serverSeed)) === previousSeed;

  return {
    commitOk,
    crashOk,
    chainOk,
    ok: commitOk && crashOk && chainOk !== false,
    recomputedHash,
    recomputedCrash,
    hmacHex
  };
}
