# Ignition — Crash game

React + Vite. Dark launchpad UI, 5→1 countdown, rocket → explosion crossfade,
color-coded multiplier, betting + cash-out.

## Run it

```bash
npm install
npm run dev     # игровой сервер :8787 + Vite :5173 (с прокси /api)
```

Открыть напечатанный адрес (по умолчанию `http://localhost:5173`).

Продакшен:

```bash
npm run build
npm start       # один Node-процесс: отдаёт dist и /api на :8787
```

Отдельно по частям: `npm run server` и `npm run dev:client`.

## Where your animation files go

Drop your two animations into `public/animations/` using **these exact names**
(or edit the two `src="/animations/..."` paths in `src/components/LaunchStage.jsx`):

```
public/animations/rocket.lottie
public/animations/explosion.lottie
```

Обе анимации уже лежат в репозитории. Если файл пропадёт или не загрузится,
приложение покажет собственную CSS/SVG-ракету и взрыв — экран не ломается.

## Which file format to actually use

You have four exports of the same animation (`.json`, `.lottie`, `.png`, `.tgs`).
They're not four different things you need — pick one per animation:

- **`.lottie` — use this one.** It's the dotLottie container format: the
  animation plus its assets zipped into a single compact file. The player
  already wired up (`@lottiefiles/dotlottie-react`) reads it directly.
- **`.json` — solid fallback.** Plain Lottie JSON, the older/uncompressed
  format. The same player reads this too, so if a `.lottie` file ever behaves
  oddly, swap in the `.json` version with no code changes needed.
- **`.tgs` — skip it, don't add it to the site.** That's Telegram's own
  sticker container (a gzipped Lottie JSON with Telegram-specific limits).
  Browsers and web Lottie players don't read it, and you don't need it since
  you already have the same animation as `.json`/`.lottie`.
- **`.png` — not for playback.** It's a single static preview frame. Handy as
  a loading poster, a fallback image, or a share/OG thumbnail — not something
  you feed to the player.

So: take the `.lottie` (or `.json`) pair for the rocket and for the explosion,
rename them as above, and that's the whole integration.

## Multiplier colors (fixed ranges)

| Range | Color |
|---|---|
| x1.0 – 1.9 | black (carbon, with a soft light edge so it reads on the dark stage) |
| x2.0 – 3.0 | white |
| x3.1 – 10.0 | green |
| x10.1+ | red, with a continuous shake |

Logic lives in `rangeFor()` in `src/components/Multiplier.jsx`.

## Provably fair — считает сервер, проверяет браузер

Раунд больше не генерируется в браузере. Его ведёт `server/` — он же
единственный, кто знает точку краша до взрыва.

**Схема — цепочка хэшей (как в bustabit).** При первом запуске сервер
генерирует 10 000 сидов:

```
chain[0] = random 32 bytes
chain[i] = sha256(chain[i-1])
```

и играет их в обратном порядке. Отсюда главное свойство:

```
sha256(сид раунда N) === сид раунда N-1
```

Терминальный хэш цепочки публикуется до первого раунда (виден в модалке
«Честность»). Подменить результат задним числом нельзя: любой изменённый сид
разорвёт связь со всеми уже раскрытыми раундами и с опубликованным якорем.

**Множитель из сида** (`shared/fair.js`, один файл на сервер и клиент):

```
h = HMAC_SHA256(key = сид, msg = "ignition:crash:v1")
h % 50 == 0            → 1.00x        (мгновенный bust, это и есть house edge)
иначе h52 = первые 52 бита h
       crash = floor((100·2^52 − h52) / (2^52 − h52)) / 100,  но не выше 1000x
```

Замерено на 300 000 раундов: RTP 97.1–97.7% в зависимости от цели кэш-аута,
мгновенный bust 2.96%, потолок 1000x (полёт не длиннее 19.8 с).

**Что именно проверяемо.** Модалка «Честность» не показывает цифры от сервера,
а пересчитывает их в браузере через Web Crypto и сравнивает три вещи:

1. `sha256(раскрытый сид)` === хэш, опубликованный до раунда;
2. множитель, выведенный из сида по формуле выше === сыгранный;
3. `sha256(сид)` === сид предыдущего раунда (связь цепочки).

Вручную, из терминала:

```bash
echo -n "<раскрытый сид>" | openssl dgst -sha256     # == хэш, показанный до раунда
curl -X POST localhost:8787/api/verify \
  -H 'content-type: application/json' \
  -d '{"serverSeed":"<сид>"}'
```

### API

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/ping` | минимальный ответ с временем сервера — реальный RTT + синхронизация часов |
| GET | `/api/state` | снимок текущего раунда, истории и параметров честности |
| GET | `/api/stream` | SSE: `round:waiting` → `round:flying` → `round:crashed` (сид и множитель только здесь) |
| GET | `/api/fairness` | якорь цепочки, соль, история с раскрытыми сидами |
| POST | `/api/verify` | независимая перепроверка раунда серверным кодом |

### Чего ещё нет для реальных денег

Баланс и ставки пока живут в браузере (демо-экономика, 1000 ⭐ при загрузке) —
их нужно перенести на сервер вместе с аутентификацией, прежде чем принимать
настоящие платежи. Плюс лицензия юрисдикции, age-gate, лимиты и
ответственная игра.

## Индикатор пинга

`PingBadge` раз в секунду ходит на `/api/ping` и показывает реальный RTT до
игрового сервера (раньше это был HEAD-запрос к origin статики, то есть почти
всегда «зелёный» независимо от состояния игры). Пороги: `< 100 мс` — зелёная
пульсация 1.6 с, `100–250 мс` — жёлтая 1.6 с, `> 250 мс` или таймаут — красная
1.2 с. Шрифт Unbounded 11px, вес 800 для подписи и 900 для числа; разметка и
классы — `.arena-ping-badge` / `.arena-ping-dot` / `.arena-ping-text`.

## Structure

```
shared/fair.js               формула честности — импортируют И сервер, И клиент
server/
  index.js                   HTTP: /api/ping, /api/state, /api/stream, /api/verify
  engine.js                  таймлайн раунда, рассылка событий по SSE
  chain.js                   генерация и хранение цепочки хэшей
  crypto.js                  sha256 / hmac на node:crypto
src/
  hooks/useCrashRound.js     клиент серверного раунда (SSE + локальный баланс)
  hooks/usePing.js           реальный RTT до /api/ping + синхронизация часов
  utils/clock.js             серверные часы (множитель считается по ним)
  utils/fair.js              Web Crypto адаптеры + проверка раунда в браузере
  components/
    LaunchStage.jsx          сетка, отсчёт, ракета/взрыв
    LottieAsset.jsx          плеер .lottie/.json с мягким фолбэком
    FallbackRocket.jsx       CSS-ракета на случай отсутствия анимации
    FallbackExplosion.jsx    CSS-взрыв
    Multiplier.jsx           цветной множитель
    BetPanel.jsx             ставка, кэш-аут
    HistoryStrip.jsx         чипсы прошлых раундов
    FairnessPanel.jsx        модалка «Честность» с пересчётом в браузере
    PingBadge.jsx            индикатор сетевой задержки
```

Полный разбор кодовой базы и список оставшихся задач — в `ANALYSIS.md`.
