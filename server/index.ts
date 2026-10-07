import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { SocketServer } from "../src/server/network/SocketServer.js";
import { SERVER_PORT } from "../src/shared/constants.js";

const PUBLIC_DIR = resolve(process.cwd(), "public");

const MIME: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function safePublicPath(urlPath: string): string | null {
  const cleaned = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const relative = cleaned === "/" ? "index.html" : cleaned.replace(/^\/+/, "");
  const full = normalize(join(PUBLIC_DIR, relative));
  if (!full.startsWith(PUBLIC_DIR)) {
    return null;
  }
  return full;
}

const httpServer = createServer((req, res) => {
  try {
    const path = safePublicPath(req.url ?? "/");
    if (!path || !existsSync(path) || !statSync(path).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const type = MIME[extname(path)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    createReadStream(path).pipe(res);
  } catch {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

const socketServer = new SocketServer(httpServer);

httpServer.listen(SERVER_PORT, () => {
  process.stdout.write(`Karting client + socket on http://127.0.0.1:${SERVER_PORT}\n`);
});

const shutdown = (): void => {
  socketServer.close();
  httpServer.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
