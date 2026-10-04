import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sha256Hex, randomSeedHex } from "./crypto.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = process.env.CHAIN_FILE || path.join(__dirname, ".chain.json");

/** Сколько раундов в одной цепочке. ~16 секунд на раунд → 10k ≈ 44 часа игры. */
const CHAIN_LENGTH = Number(process.env.CHAIN_LENGTH || 10000);

/**
 * Цепочка хэшей, сгенерированная ЗАРАНЕЕ и целиком.
 *
 *   chain[0] = random, chain[i] = sha256(chain[i-1])
 *
 * Играем с конца к началу, поэтому sha256(сид раунда N) === сид раунда N-1,
 * а терминальный хэш `terminalCommit` опубликован до самого первого раунда и
 * намертво фиксирует все 10 000 будущих результатов. Подменить хоть один сид,
 * не сломав уже раскрытые, математически невозможно.
 */
function buildChain(length) {
  const chain = new Array(length + 1);
  chain[0] = randomSeedHex(32);
  for (let i = 1; i <= length; i++) chain[i] = sha256Hex(chain[i - 1]);
  return chain;
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    if (Array.isArray(raw.chain) && raw.chain.length > 1 && Number.isInteger(raw.cursor)) return raw;
  } catch {
    // нет файла или он битый — сгенерируем новую цепочку ниже
  }
  return null;
}

function persist(state) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(state), "utf8");
  } catch (err) {
    console.warn("[chain] не смог сохранить цепочку на диск:", err.message);
  }
}

export function createChainStore() {
  let state = load();

  if (!state) {
    const chain = buildChain(CHAIN_LENGTH);
    // cursor указывает на индекс сида, который пойдёт в СЛЕДУЮЩИЙ раунд
    state = { chain, cursor: chain.length - 2, createdAt: Date.now() };
    persist(state);
    console.log(`[chain] новая цепочка на ${CHAIN_LENGTH} раундов, терминальный хэш ${chain[chain.length - 1].slice(0, 16)}…`);
  } else {
    console.log(`[chain] цепочка восстановлена, осталось раундов: ${state.cursor + 1}`);
  }

  return {
    /** Опубликованный до первого раунда якорь всей цепочки. */
    terminalCommit: state.chain[state.chain.length - 1],
    totalRounds: state.chain.length - 1,
    get remaining() {
      return state.cursor + 1;
    },
    /** Следующий сид. Из цепочки, а не из воздуха — и она кончается. */
    next() {
      if (state.cursor < 0) {
        // Цепочка исчерпана — продолжать молча нельзя, это сломало бы доказуемость.
        throw new Error("Цепочка раундов исчерпана. Нужна новая публикация терминального хэша.");
      }
      const seed = state.chain[state.cursor];
      state.cursor -= 1;
      persist(state);
      return { seed, hash: sha256Hex(seed), index: state.cursor + 1 };
    }
  };
}
