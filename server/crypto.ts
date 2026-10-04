import { createHash, createHmac, randomBytes } from "node:crypto";

export const sha256Hex = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

export const hmacSha256Hex = (key: string, message: string): string =>
  createHmac("sha256", key).update(message, "utf8").digest("hex");

export const randomSeedHex = (bytes = 32): string => randomBytes(bytes).toString("hex");
