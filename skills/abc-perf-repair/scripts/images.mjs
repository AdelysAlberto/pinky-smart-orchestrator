// Scenario: which images the Home fetches, what they cost and how much is fetched off-screen.
// Usage: node images.mjs <desktop|mobile>
import {DEVICES, openSession, sleep} from "./cdp.mjs";

const MODE = process.argv[2] || "desktop";
const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:4173/";
const device = DEVICES[MODE];

const {send, on, evaluate, close} = await openSession({mode: MODE});
const imageRequests = new Map();

on(message => {
  const params = message.params;
  if (!params) return;
  if (message.method === "Network.requestWillBeSent" && params.type === "Image") {
    imageRequests.set(params.requestId, {url: params.request.url, encoded: 0, status: null, mime: null, cacheControl: null});
    return;
  }
  if (!imageRequests.has(params.requestId)) return;
  const entry = imageRequests.get(params.requestId);
  if (message.method === "Network.responseReceived") {
    entry.status = params.response.status;
    entry.mime = params.response.mimeType;
    entry.cacheControl = params.response.headers["cache-control"] || params.response.headers["Cache-Control"] || null;
  } else if (message.method === "Network.loadingFinished") {
    entry.encoded = params.encodedDataLength;
  }
});

await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    window.__vitals = {lcp: null, cls: 0, paints: []};
    try {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        window.__vitals.lcp = entries[entries.length - 1];
      }).observe({type: "largest-contentful-paint", buffered: true});
    } catch (error) {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
      }).observe({type: "layout-shift", buffered: true});
    } catch (error) {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__vitals.paints.push({name: entry.name, start: Math.round(entry.startTime)});
      }).observe({type: "paint", buffered: true});
    } catch (error) {}
  `,
});

await send("Network.clearBrowserCache");
await send("Page.navigate", {url: TARGET_URL});
await sleep(13_000);

const domImages = await evaluate(`(() => {
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  return [...document.images].map(image => {
    const rect = image.getBoundingClientRect();
    return {
      src: (image.currentSrc || image.src || "").slice(0, 400),
      loading: image.loading || null,
      hasSrcset: !!image.srcset,
      naturalW: image.naturalWidth,
      naturalH: image.naturalHeight,
      cssW: Math.round(rect.width),
      cssH: Math.round(rect.height),
      top: Math.round(rect.top + window.scrollY),
      inViewport: rect.bottom > 0 && rect.top < viewportHeight && rect.right > 0 && rect.left < viewportWidth,
    };
  });
})()`);

const vitals = await evaluate(`(() => {
  const lcp = window.__vitals.lcp;
  return {
    lcp: lcp ? {
      value: Math.round(lcp.startTime),
      size: lcp.size,
      element: (lcp.element && (lcp.element.tagName + " " + (lcp.element.currentSrc || lcp.element.src || ""))).slice(0, 200),
    } : null,
    cls: +window.__vitals.cls.toFixed(4),
    fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0),
    paints: window.__vitals.paints,
  };
})()`);

const byUrl = new Map();
for (const entry of imageRequests.values()) {
  const previous = byUrl.get(entry.url);
  if (!previous || previous.encoded < entry.encoded) byUrl.set(entry.url, entry);
}

const rows = domImages.map(image => {
  const network = byUrl.get(image.src);
  return {...image, bytes: network?.encoded ?? 0, belowFold: image.top >= device.height};
});

const totalBytes = [...byUrl.values()].reduce((sum, entry) => sum + entry.encoded, 0);

// A URL counts as below the fold only when every DOM instance of it sits below the viewport.
const urlBelowFold = new Map();
for (const row of rows) {
  if (!row.src || row.src.startsWith("data:")) continue;
  const previous = urlBelowFold.get(row.src);
  urlBelowFold.set(row.src, previous === undefined ? row.belowFold : previous && row.belowFold);
}
const offscreenUrls = [...urlBelowFold.entries()]
  .filter(([url, below]) => below && byUrl.has(url))
  .map(([url]) => url);
const offscreenBytes = offscreenUrls.reduce((sum, url) => sum + (byUrl.get(url)?.encoded || 0), 0);

const pixelArea = rows
  .filter(row => row.cssW > 0 && row.naturalW > 0)
  .reduce((accumulator, row) => {
    accumulator.needed += row.cssW * device.deviceScaleFactor * (row.cssH * device.deviceScaleFactor);
    accumulator.supplied += row.naturalW * row.naturalH;
    return accumulator;
  }, {needed: 0, supplied: 0});

console.log(JSON.stringify({
  mode: MODE,
  viewport: {width: device.width, height: device.height, dpr: device.deviceScaleFactor},
  vitals,
  images: {
    networkRequests: byUrl.size,
    totalBytes,
    domCount: rows.length,
    loadedInViewport: rows.filter(row => row.bytes > 0 && row.inViewport).length,
    loadedBelowFold: offscreenUrls.length,
    bytesBelowFold: offscreenBytes,
    bytesBelowFoldPct: totalBytes ? +((offscreenBytes / totalBytes) * 100).toFixed(1) : 0,
    withoutSrcset: rows.filter(row => !row.hasSrcset).length,
    withoutLazyAttr: rows.filter(row => row.loading !== "lazy").length,
    pixelArea: {...pixelArea, ratio: pixelArea.needed ? +(pixelArea.supplied / pixelArea.needed).toFixed(1) : null},
    noCacheControl: [...byUrl.values()].filter(entry => !entry.cacheControl).length,
    shortCache: [...byUrl.values()].filter(entry => {
      const match = entry.cacheControl?.match(/max-age=(\d+)/);
      return match ? Number(match[1]) < 86_400 : false;
    }).length,
  },
  heaviest: [...byUrl.values()]
    .sort((a, b) => b.encoded - a.encoded)
    .slice(0, 30)
    .map(entry => ({kb: Math.round(entry.encoded / 1024), status: entry.status, mime: entry.mime, cacheControl: entry.cacheControl, url: entry.url.slice(0, 200)})),
  oversized: rows
    .filter(row => row.cssW > 0 && row.naturalW > row.cssW * device.deviceScaleFactor * 2)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 20)
    .map(row => ({kb: Math.round(row.bytes / 1024), natural: `${row.naturalW}x${row.naturalH}`, rendered: `${row.cssW}x${row.cssH}`, top: row.top, url: row.src.slice(0, 160)})),
}, null, 1));

await close();
process.exit(0);
