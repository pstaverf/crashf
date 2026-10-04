import { readFileSync, writeFile } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomSeedHex, sha256Hex } from "./crypto.ts";

const STORE_PATH = process.env.CHAIN_FILE || path.join(path.dirname(fileURLToPath(import.meta.url)), ".chain.json");
const CHAIN_LENGTH = Number(process.env.CHAIN_LENGTH || 10000);

interface Persisted {
  root: string;
  length: number;
  cursor: number;
}

export interface ChainSeed {
  seed: string;
  hash: string;
  index: number;
}

export interface ChainStore {
  readonly terminalCommit: string;
  readonly totalRounds: number;
  readonly remaining: number;
  next(): ChainSeed;
}

const grow = (root: string, length: number): string[] => {
  const chain = new Array<string>(length + 1);
  chain[0] = root;
  for (let i = 1; i <= length; i++) chain[i] = sha256Hex(chain[i - 1]!);
  return chain;
};

const load = (): Persisted | null => {
  try {
    const raw = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Partial<Persisted>;
    if (typeof raw.root === "string" && typeof raw.length === "number" && typeof raw.cursor === "number") {
      return raw as Persisted;
    }
  } catch {}
  return null;
};

export function createChainStore(): ChainStore {
  const stored = load();
  const root = stored?.root ?? randomSeedHex(32);
  const length = stored?.length ?? CHAIN_LENGTH;
  const chain = grow(root, length);

  let cursor = stored?.cursor ?? length - 1;
  let pending = false;

  const persist = (): void => {
    if (pending) return;
    pending = true;
    setImmediate(() => {
      pending = false;
      writeFile(STORE_PATH, JSON.stringify({ root, length, cursor } satisfies Persisted), () => {});
    });
  };

  if (!stored) persist();
  console.log(`[chain] раундов в запасе: ${cursor + 1}/${length}, якорь ${chain[length]!.slice(0, 16)}…`);

  return {
    terminalCommit: chain[length]!,
    totalRounds: length,
    get remaining() {
      return cursor + 1;
    },
    next(): ChainSeed {
      if (cursor < 0) throw new Error("Цепочка раундов исчерпана — нужна новая публикация якоря");
      const seed = chain[cursor]!;
      const index = cursor;
      cursor -= 1;
      persist();
      return { seed, hash: chain[index + 1]!, index };
    }
  };
}
