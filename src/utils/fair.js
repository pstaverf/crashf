/** Hex-encode a SHA-256 digest of `text` using the Web Crypto API. */
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A random 16-byte hex seed, generated with a CSPRNG. */
export function randomSeed() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic float in [0, 1) derived from the first 52 bits of a hex hash. */
function hashToUnitFloat(hex) {
  const slice = hex.slice(0, 13);
  const value = parseInt(slice, 16);
  const max = Math.pow(16, 13);
  return value / max;
}

/**
 * Same long-tail crash formula as before, but seeded from the round's hash
 * instead of Math.random() — so the result can be reproduced and checked
 * once the seed is revealed after the round.
 */
export function crashPointFromHash(hex, houseEdge = 0.03) {
  const r = hashToUnitFloat(hex);
  if (r < houseEdge) return 1.0;
  const raw = (1 - houseEdge) / (1 - r);
  return Math.max(1, Math.round(raw * 100) / 100);
}
