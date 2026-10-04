export const SALT = "ignition:crash:v1";
export const MAX_MULTIPLIER = 1000;
export const GROWTH_K = Math.log(10) / 6600;
export const HOUSE_EDGE_DIVISOR = 50n;

const HEX64 = /^[0-9a-f]{64}$/i;
const E52 = 2 ** 52;

export type Sha256 = (text: string) => string | Promise<string>;
export type HmacSha256 = (key: string, message: string) => string | Promise<string>;

export interface RoundProof {
  serverSeed: string;
  serverSeedHash: string;
  crashPoint: number;
}

export interface VerifyReport {
  commitOk: boolean;
  crashOk: boolean;
  chainOk: boolean | null;
  ok: boolean;
  recomputedHash: string;
  recomputedCrash: number;
  hmacHex: string;
}

export const flightDurationMs = (multiplier: number): number => Math.log(multiplier) / GROWTH_K;

export const multiplierAt = (elapsedMs: number): number => Math.exp(GROWTH_K * (elapsedMs > 0 ? elapsedMs : 0));

export function crashPointFromHmacHex(hmacHex: string): number {
  if (!HEX64.test(hmacHex)) throw new Error("crashPointFromHmacHex: ожидается 64 hex-символа");
  if (BigInt(`0x${hmacHex}`) % HOUSE_EDGE_DIVISOR === 0n) return 1;

  const h = Number.parseInt(hmacHex.slice(0, 13), 16);
  const raw = Math.floor((100 * E52 - h) / (E52 - h)) / 100;

  return Math.min(Math.max(1, raw), MAX_MULTIPLIER);
}

export async function crashPointFromSeed(
  serverSeed: string,
  hmac: HmacSha256
): Promise<{ hmacHex: string; crashPoint: number }> {
  const hmacHex = await hmac(serverSeed, SALT);
  return { hmacHex, crashPoint: crashPointFromHmacHex(hmacHex) };
}

export async function verifyRound(
  round: RoundProof,
  previousSeed: string | null,
  sha256: Sha256,
  hmac: HmacSha256
): Promise<VerifyReport> {
  const recomputedHash = await sha256(round.serverSeed);
  const { hmacHex, crashPoint } = await crashPointFromSeed(round.serverSeed, hmac);

  const commitOk = recomputedHash === round.serverSeedHash;
  const crashOk = Math.abs(crashPoint - round.crashPoint) < 1e-9;
  const chainOk = previousSeed ? recomputedHash === previousSeed : null;

  return {
    commitOk,
    crashOk,
    chainOk,
    ok: commitOk && crashOk && chainOk !== false,
    recomputedHash,
    recomputedCrash: crashPoint,
    hmacHex
  };
}
