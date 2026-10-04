import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine } from "./engine.js";
import { sha256Hex, hmacSha256Hex } from "./crypto.js";
import { verifyRound, crashPointFromSeed } from "../shared/fair.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const DIST = path.join(__dirname, "..", "dist");
const SERVE_STATIC = process.env.SERVE_STATIC !== "0" && fs.existsSync(DIST);

const engine = createEngine();
engine.start();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".lottie": "application/zip",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store"
  });
  res.end(payload);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
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
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const route = url.pathname;

  // ---------------------------------------------------------------- ping
  // Самый дешёвый возможный ответ: клиент замеряет RTT именно до игрового
  // сервера, а не до CDN со статикой. Тело — время сервера, чтобы заодно
  // синхронизировать часы и считать множитель по серверному таймлайну.
  if (route === "/api/ping") {
    const body = `{"t":${Date.now()}}`;
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": Buffer.byteLength(body),
      "cache-control": "no-store, no-cache, must-revalidate",
      "x-accel-buffering": "no"
    });
    res.end(req.method === "HEAD" ? undefined : body);
    return;
  }

  // --------------------------------------------------------------- state
  if (route === "/api/state") {
    json(res, 200, engine.snapshot());
    return;
  }

  // ------------------------------------------------------------ fairness
  if (route === "/api/fairness") {
    json(res, 200, { ...engine.fairnessInfo(), history: engine.getHistory() });
    return;
  }

  // -------------------------------------------------------------- stream
  // SSE: сервер сам гонит фазы раунда, клиент только отрисовывает.
  if (route === "/api/stream") {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    });

    const send = (payload) => res.write(`data: ${payload}\n\n`);
    send(JSON.stringify(engine.snapshot()));

    const unsubscribe = engine.subscribe(send);
    const keepAlive = setInterval(() => res.write(": keep-alive\n\n"), 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
    return;
  }

  // -------------------------------------------------------------- verify
  // Независимая перепроверка раунда серверным кодом. Клиент считает то же
  // самое у себя в браузере — если ответы разойдутся, UI это покажет.
  if (route === "/api/verify" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      json(res, 400, { error: err.message });
      return;
    }

    const { serverSeed, serverSeedHash, crashPoint, previousSeed } = body || {};
    if (typeof serverSeed !== "string" || !/^[0-9a-f]{64}$/i.test(serverSeed)) {
      json(res, 400, { error: "serverSeed должен быть 64 hex-символами" });
      return;
    }

    const known = engine.getHistory().find((r) => r.serverSeed === serverSeed) || null;
    const expectedHash = serverSeedHash ?? known?.serverSeedHash ?? sha256Hex(serverSeed);
    const expectedCrash = crashPoint ?? known?.crashPoint ?? (await crashPointFromSeed(serverSeed, hmacSha256Hex)).crashPoint;

    const report = await verifyRound(
      { serverSeed, serverSeedHash: expectedHash, crashPoint: expectedCrash },
      previousSeed ?? null,
      sha256Hex,
      hmacSha256Hex
    );

    json(res, 200, { ...report, knownRound: known ? { id: known.id, nonce: known.nonce } : null });
    return;
  }

  // ---------------------------------------------------------- статика
  if (!SERVE_STATIC) {
    json(res, 404, { error: "not found" });
    return;
  }

  const rel = route === "/" ? "index.html" : route.replace(/^\/+/, "");
  const file = path.join(DIST, rel);
  if (!file.startsWith(DIST)) {
    json(res, 403, { error: "forbidden" });
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      // SPA-фолбэк
      fs.readFile(path.join(DIST, "index.html"), (e2, html) => {
        if (e2) {
          json(res, 404, { error: "not found" });
          return;
        }
        res.writeHead(200, { "content-type": MIME[".html"] });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, {
      "content-type": MIME[path.extname(file)] || "application/octet-stream",
      "cache-control": rel === "index.html" ? "no-store" : "public, max-age=31536000, immutable"
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[server] http://${HOST}:${PORT}  (static: ${SERVE_STATIC ? "dist" : "off"})`);
});
