// Scenario: second-visit cost. Loads Home cold, reloads warm, and reports what came from cache.
// Usage: node reload.mjs
import {openSession, sleep} from "./cdp.mjs";

const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:4173/";

const {send, on, close} = await openSession({mode: "desktop"});
await send("Network.clearBrowserCache");

let phase = "cold";
const entries = [];

on(message => {
  const params = message.params;
  if (!params) return;
  if (message.method === "Network.requestWillBeSent") {
    entries.push({phase, id: params.requestId, url: params.request.url, type: params.type, status: null, encoded: 0, fromCache: false, cacheControl: null});
    return;
  }
  const entry = entries.find(candidate => candidate.id === params.requestId);
  if (!entry) return;
  if (message.method === "Network.responseReceived") {
    entry.status = params.response.status;
    entry.fromCache = !!(params.response.fromDiskCache || params.response.fromMemoryCache);
    entry.cacheControl = params.response.headers["cache-control"] || params.response.headers["Cache-Control"] || null;
  } else if (message.method === "Network.loadingFinished") {
    entry.encoded = params.encodedDataLength;
  }
});

const summarize = target => {
  const rows = entries.filter(entry => entry.phase === target);
  const byOrigin = {};
  let bytes = 0;
  for (const row of rows) {
    let origin = "invalid";
    try { origin = new URL(row.url).origin; } catch {}
    byOrigin[origin.replace("https://", "")] = (byOrigin[origin.replace("https://", "")] || 0) + row.encoded;
    bytes += row.encoded;
  }
  const images = rows.filter(row => row.type === "Image");
  return {
    phase: target,
    requests: rows.length,
    bytes,
    bytesByOrigin: byOrigin,
    images: {
      total: images.length,
      fromCache: images.filter(row => row.fromCache).length,
      revalidatedBytes: images.filter(row => !row.fromCache).reduce((sum, row) => sum + row.encoded, 0),
    },
    nonImageRequests: rows
      .filter(row => row.type !== "Image")
      .map(row => ({type: row.type, status: row.status, fromCache: row.fromCache, kb: Math.round(row.encoded / 1024), cacheControl: row.cacheControl, path: row.url.replace(TARGET_URL.replace(/\/$/, ""), "")})),
    imageRows: images.map(row => ({url: row.url, kb: Math.round(row.encoded / 1024), fromCache: row.fromCache, cacheControl: row.cacheControl})),
  };
};

await send("Page.navigate", {url: TARGET_URL});
await sleep(14_000);
phase = "warm";
await send("Page.reload", {ignoreCache: false});
await sleep(14_000);

const cold = summarize("cold");
const warm = summarize("warm");
const coldUrls = new Map(cold.imageRows.map(row => [row.url, row]));
const overlap = warm.imageRows.filter(row => coldUrls.has(row.url));

console.log(JSON.stringify({
  url: TARGET_URL,
  cold: {...cold, imageRows: undefined},
  warm: {...warm, imageRows: undefined},
  overlap: {
    imageUrls: overlap.length,
    servedFromCache: overlap.filter(row => row.fromCache).length,
    redownloadedBytes: overlap.filter(row => !row.fromCache).reduce((sum, row) => sum + row.kb * 1024, 0),
  },
}, null, 1));

await close();
process.exit(0);
