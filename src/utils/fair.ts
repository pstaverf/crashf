import { verifyRound } from "../../shared/fair.ts";
import type { VerifyReport } from "../../shared/fair.ts";

export type BrowserVerifyReport = (VerifyReport & { unavailable?: false }) | { unavailable: true; ok: false };

export const cryptoAvailable = (): boolean => typeof crypto !== "undefined" && !!crypto.subtle;

const encoder = new TextEncoder();

const toHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i]!.toString(16).padStart(2, "0");
  return hex;
};

export const sha256Hex = async (text: string): Promise<string> =>
  toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));

export const hmacSha256Hex = async (key: string, message: string): Promise<string> => {
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message)));
};

export async function verifyRoundInBrowser(
  round: { serverSeed: string; serverSeedHash: string; crashPoint: number },
  previousSeed: string | null
): Promise<BrowserVerifyReport> {
  if (!cryptoAvailable()) return { unavailable: true, ok: false };
  try {
    return await verifyRound(round, previousSeed, sha256Hex, hmacSha256Hex);
  } catch {
    return { unavailable: true, ok: false };
  }
}
