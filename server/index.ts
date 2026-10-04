import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine } from "./engine.ts";
import { sha256Hex, hmacSha256Hex } from "./crypto.ts";
import { verifyRound, crashPointFromSeed } from "../shared/fair.ts";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const SERVE_STATIC = process.env.SERVE_STATIC !== "0" && existsSync(DIST);
const HEX64 = /^[0-9a-f]{64}$/i;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } as const;
const PING_HEADERS = { ...JSON_HEADERS, "x-accel-buffering": "no" } as const;
const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-store, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no"
} as const;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".lottie": "application/zip",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

const engine = createEngine();
engine.start();

const send = (res: ServerResponse, status: number, body: string, headers: http.OutgoingHttpHeaders = JSON_HEADERS): void => {
  res.writeHead(status, { ...headers, "content-length": Buffer.byteLength(body) });
  res.end(body);
};

const readBody = (req: IncomingMessage, limit = 65536): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        req.destroy();
        reject(new Error("payload too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });

interface Asset {
  body: Buffer;
  type: string;
  etag: string;
  mtimeMs: number;
}

const assets = new Map<string, Asset | null>();

const loadAsset = async (route: string): Promise<Asset | null> => {
  const cached = assets.get(route);
  if (cached !== undefined && route.startsWith("/assets/")) return cached;

  const file = path.join(DIST, route === "/" ? "index.html" : route.slice(1));
  if (!file.startsWith(DIST)) return null;

  let info;
  try {
    info = await stat(file);
  } catch {
    assets.set(route, null);
    return null;
  }

  if (cached && cached.mtimeMs === info.mtimeMs) return cached;

  const asset: Asset = {
    body: await readFile(file),
    type: MIME[path.extname(file)] ?? "application/octet-stream",
    etag: `W/"${info.size}-${info.mtimeMs}"`,
    mtimeMs: info.mtimeMs
  };

  assets.set(route, asset);
  return asset;
};

const handleVerify = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  let body: Record<string, unknown>;
  try {
    body = ((await readBody(req)) ?? {}) as Record<string, unknown>;
  } catch (err) {
    send(res, 400, JSON.stringify({ error: (err as Error).message }));
    return;
  }

  const serverSeed = body.serverSeed;
  if (typeof serverSeed !== "string" || !HEX64.test(serverSeed)) {
    send(res, 400, JSON.stringify({ error: "serverSeed должен быть 64 hex-символами" }));
    return;
  }

  const known = engine.history().find((entry) => entry.serverSeed === serverSeed) ?? null;
  const serverSeedHash = (body.serverSeedHash as string) ?? known?.serverSeedHash ?? sha256Hex(serverSeed);
  const crashPoint =
    (body.crashPoint as number) ?? known?.crashPoint ?? (await crashPointFromSeed(serverSeed, hmacSha256Hex)).crashPoint;

  const report = await verifyRound(
    { serverSeed, serverSeedHash, crashPoint },
    (body.previousSeed as string) ?? null,
    sha256Hex,
    hmacSha256Hex
  );

  send(res, 200, JSON.stringify({ ...report, knownRound: known && { id: known.id, nonce: known.nonce } }));
};

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  if (url.startsWith("/api/ping")) {
    send(res, 200, `{"t":${Date.now()}}`, PING_HEADERS);
    return;
  }

  const route = url.split("?", 1)[0]!;

  switch (route) {
    case "/api/state":
      send(res, 200, engine.snapshotJson());
      return;

    case "/api/fairness":
      send(res, 200, engine.fairnessJson());
      return;

    case "/api/stream": {
      res.writeHead(200, SSE_HEADERS);
      res.write(`data: ${engine.snapshotJson()}\n\n`);

      const write = (payload: string): void => {
        res.write(payload);
      };
      const unsubscribe = engine.subscribe(write);
      const keepAlive = setInterval(() => res.write(": ka\n\n"), 15000);

      req.on("close", () => {
        clearInterval(keepAlive);
        unsubscribe();
      });
      return;
    }

    case "/api/verify":
      if (req.method === "POST") {
        void handleVerify(req, res);
        return;
      }
      break;

    default:
      break;
  }

  if (!SERVE_STATIC) {
    send(res, 404, '{"error":"not found"}');
    return;
  }

  void loadAsset(route).then(async (asset) => {
    if (!asset && path.extname(route)) {
      send(res, 404, '{"error":"not found"}');
      return;
    }

    const file = asset ?? (await loadAsset("/"));
    if (!file) {
      send(res, 404, '{"error":"not found"}');
      return;
    }
    if (req.headers["if-none-match"] === file.etag) {
      res.writeHead(304).end();
      return;
    }
    res.writeHead(200, {
      "content-type": file.type,
      "content-length": file.body.length,
      etag: file.etag,
      "cache-control": asset && route !== "/" ? "public, max-age=31536000, immutable" : "no-store"
    });
    res.end(file.body);
  });
});

server.on("connection", (socket) => socket.setNoDelay(true));
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;

server.listen(PORT, HOST, () => {
  console.log(`[server] http://${HOST}:${PORT} (static: ${SERVE_STATIC ? "dist" : "off"})`);
});
