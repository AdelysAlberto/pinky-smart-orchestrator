// Scenario: service worker install cost. Loads Home once with the worker enabled and
// inventories the Cache Storage it filled.
// Usage: node swcheck.mjs
import {openSession, sleep} from "./cdp.mjs";

const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:4173/";

const {send, evaluate, close} = await openSession({mode: "desktop", bypassServiceWorker: false});
await send("Network.clearBrowserCache");
await send("Page.navigate", {url: TARGET_URL});
await sleep(25_000);

const inventory = await evaluate(`(async () => {
  const names = await caches.keys();
  const result = {cacheNames: names, entries: {}, decodedBytes: {}};
  for (const name of names) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    result.entries[name] = keys.length;
    let bytes = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (!response) continue;
      bytes += (await response.clone().arrayBuffer()).byteLength;
    }
    result.decodedBytes[name] = bytes;
  }
  result.controlled = !!navigator.serviceWorker.controller;
  return result;
})()`);

console.log(JSON.stringify({url: TARGET_URL, ...inventory}, null, 1));

await close();
process.exit(0);
