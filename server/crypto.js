import { createHash, createHmac, randomBytes } from "node:crypto";

export function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hmacSha256Hex(key, message) {
  return createHmac("sha256", key).update(message, "utf8").digest("hex");
}

export function randomSeedHex(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}
