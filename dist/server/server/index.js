"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const SocketServer_js_1 = require("../src/server/network/SocketServer.js");
const constants_js_1 = require("../src/shared/constants.js");
const PUBLIC_DIR = (0, node_path_1.resolve)(process.cwd(), "public");
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
};
function safePublicPath(urlPath) {
    const cleaned = decodeURIComponent(urlPath.split("?")[0] ?? "/");
    const relative = cleaned === "/" ? "index.html" : cleaned.replace(/^\/+/, "");
    const full = (0, node_path_1.normalize)((0, node_path_1.join)(PUBLIC_DIR, relative));
    if (!full.startsWith(PUBLIC_DIR)) {
        return null;
    }
    return full;
}
const httpServer = (0, node_http_1.createServer)((req, res) => {
    try {
        const path = safePublicPath(req.url ?? "/");
        if (!path || !(0, node_fs_1.existsSync)(path) || !(0, node_fs_1.statSync)(path).isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not found");
            return;
        }
        const type = MIME[(0, node_path_1.extname)(path)] ?? "application/octet-stream";
        res.writeHead(200, { "Content-Type": type });
        (0, node_fs_1.createReadStream)(path).pipe(res);
    }
    catch {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Server error");
    }
});
const socketServer = new SocketServer_js_1.SocketServer(httpServer);
httpServer.listen(constants_js_1.SERVER_PORT, () => {
    process.stdout.write(`Karting client + socket on http://127.0.0.1:${constants_js_1.SERVER_PORT}\n`);
});
const shutdown = () => {
    socketServer.close();
    httpServer.close();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
//# sourceMappingURL=index.js.map