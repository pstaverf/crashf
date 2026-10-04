# Ignition — Crash game

React + Vite. Dark launchpad UI, 5→1 countdown, rocket → explosion crossfade,
color-coded multiplier, betting + cash-out.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## Where your animation files go

Drop your two animations into `public/animations/` using **these exact names**
(or edit the two `src="/animations/..."` paths in `src/components/LaunchStage.jsx`):

```
public/animations/rocket.lottie
public/animations/explosion.lottie
```

Until you add them, the app shows a hand-built CSS/SVG rocket and explosion so
everything still works and looks intentional out of the box.

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

## The betting/crash math is a demo economy

`src/hooks/useCrashRound.js` generates each round's crash point with a simple
long-tail formula (`(1 - houseEdge) / (1 - random)`) and grows the multiplier
exponentially over ~6–7 seconds to reach 10x. It's a believable in-memory
simulation with a virtual balance — there's no server, no real payments, and
no provably-fair verification. If this is heading toward real-money play,
that logic needs to move server-side with an auditable RNG, and you'd need to
handle licensing for your jurisdiction before launch.

## Structure

```
src/
  hooks/useCrashRound.js     game state machine (countdown/flying/crashed, bets)
  components/
    LaunchStage.jsx          grid + countdown + rocket/explosion crossfade
    LottieAsset.jsx          .lottie/.json player with graceful fallback
    FallbackRocket.jsx       CSS placeholder rocket
    FallbackExplosion.jsx    CSS placeholder explosion
    Multiplier.jsx           colored multiplier readout
    BetPanel.jsx             bet input, place bet, cash out
    HistoryStrip.jsx         past-round chips
```
