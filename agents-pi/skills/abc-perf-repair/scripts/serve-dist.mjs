// Static server for a built dist/, mirroring the cache policy observed in production so the
// harness measures the same client behaviour. Brotli/gzip on text assets, SPA fallback to index.html.
// Usage: DIST=/path/to/dist PORT=4173 node serve-dist.mjs
// Defaults to ./dist relative to the current working directory.
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname, join, normalize, resolve} from "node:path";
import {brotliCompressSync, gzipSync} from "node:zlib";

const ROOT = process.env.DIST || resolve(process.cwd(), "dist");
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

// Observed on https://test-env.raspaygana.com.ve: hashed assets get 4 h, HTML gets 0.
const cachePolicy = path => {
  if (path === "/" || path.endsWith(".html")) return "public, max-age=0, must-revalidate";
  if (path.startsWith("/assets/")) return "public, max-age=14400, must-revalidate";
  if (path === "/sw.js" || path === "/manifest.webmanifest") return "public, max-age=0, must-revalidate";
  return "public, max-age=14400, must-revalidate";
};

const compresible = (type, extension) =>
  ["text", "javascript", "json", "xml", "svg"].some(fragment => type.includes(fragment)) || extension === ".map";

createServer(async (request, response) => {
  try {
    let path = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    if (path.endsWith("/")) path += "index.html";
    let file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) {
      response.writeHead(403).end("forbidden");
      return;
    }

    let body;
    try {
      body = await readFile(file);
    } catch {
      file = join(ROOT, "index.html");
      path = "/index.html";
      body = await readFile(file);
    }

    const extension = extname(file).toLowerCase();
    const type = MIME[extension] || "application/octet-stream";
    const acceptEncoding = String(request.headers["accept-encoding"] || "");
    const headers = {"content-type": type, "cache-control": cachePolicy(path), "x-content-type-options": "nosniff"};
    let payload = body;

    if (compresible(type, extension)) {
      if (acceptEncoding.includes("br")) {
        payload = brotliCompressSync(body);
        headers["content-encoding"] = "br";
        headers.vary = "Accept-Encoding";
      } else if (acceptEncoding.includes("gzip")) {
        payload = gzipSync(body);
        headers["content-encoding"] = "gzip";
        headers.vary = "Accept-Encoding";
      }
    }

    headers["content-length"] = payload.length;
    response.writeHead(200, headers).end(payload);
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`serving ${ROOT} on http://127.0.0.1:${PORT}`);
});
