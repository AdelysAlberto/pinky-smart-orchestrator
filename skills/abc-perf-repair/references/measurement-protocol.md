---
title: "abc-perf-repair — measurement protocol"
module: "skills/abc-perf-repair"
author: "pi"
date: 2026-08-23
status: Done
priority: P1
scope: "[Reference]"
source: "skills/abc-perf-repair/SKILL.md"
---

# Measurement protocol

Everything here runs from the skill's `scripts/` directory with Node 22+ (built-in `WebSocket`,
`fetch`, `zlib`). No npm install, no Playwright, no cloud service.

## 1. Environment

```bash
cd <repo> && npx vite build          # or the project's own build command
DIST=$PWD/dist PORT=4173 node <skill>/scripts/serve-dist.mjs &
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-audit --no-first-run --no-default-browser-check about:blank &
```

`serve-dist.mjs` mirrors the production cache policy on purpose (`max-age=14400, must-revalidate` for
hashed assets, `max-age=0` for HTML) and compresses with brotli. Do not "improve" it: if it caches
better than production, every client-side cache conclusion becomes fiction. Verify the real policy
first with `curl -sI <prod-host>/assets/<hashed>.js | grep -i cache-control` and copy what you find.

`TARGET_URL` overrides the page under test, including a route:
`TARGET_URL=http://127.0.0.1:4173/games/category/slot`.

## 2. Which probe answers which question

| Question | Probe | Key output fields |
|---|---|---|
| How much does this page cost and what does it call? | `audit.mjs <desktop\|mobile> [label]` | `network.transferBytes`, `bytesByType`, `byType`, `duplicatedApiPaths`, `apiCalls`, `checkpoints[].metrics.{JSHeapUsedSize,Nodes,LayoutCount,RecalcStyleCount,TaskDuration}`, `checkpoints[].longTasks`, `console.pageErrors` |
| Are images the problem, and are they loaded before they are seen? | `images.mjs <desktop\|mobile>` | `images.totalBytes`, `bytesBelowFoldPct`, `withoutSrcset`, `withoutLazyAttr`, `pixelArea.ratio`, `vitals.lcp`, `vitals.cls` |
| Is something burning CPU while nothing happens? | `probe.mjs <desktop\|mobile> [scroll]` | `withMotion.recalcPerSecond`, `reducedMotion.recalcPerSecond`, `animations`, `timers`, `idleNetwork` |
| Is a virtualised window wrong? | `virtual-window.mjs [url]` | `atLoad.lastVisibleRow`, `atLoad.windowIsNegative`, `insideGrid.cards` |
| Is a third party polling? | `polling.mjs [seconds] [mode]` | `requestsInWindow`, `busiestHostGapMs.median`, `projectedRequestsPerHour` |
| What is cached between visits? | `reload.mjs` | `overlap.servedFromCache`, `warm.bytes` |
| What does the service worker install? | `swcheck.mjs` | `entries`, `decodedBytes` |

`audit.mjs` is the default first move: it answers "how big, how many, how much memory, what broke" in
one pass and it fails loudly on the things the console hides (uncaught exceptions from a library's
animation loop, for example).

## 3. Reading the numbers honestly

- **The service worker changes everything.** All probes except `swcheck.mjs` call
  `Network.setBypassServiceWorker`. Without it, byte attribution lands on the precache install and
  images report `encodedDataLength: 0`. If you forget it, your numbers are wrong, not just different.
- **`performance.memory` and CDP `JSHeapUsedSize` disagree** because they sample at different points in
  the GC cycle. Report both, trust the shape of the curve, and always call
  `HeapProfiler.collectGarbage` before quoting "retained".
- **Peak is not retained.** A page that peaks at 90 MB and settles at 20 MB after GC has a parse
  problem, not a leak. Say which one you mean.
- **Content varies.** CMS artwork, live scores and winners change per load. Two runs of the same page
  can differ by several MB. Quote a range and name the variable.
- **Cold means cold.** `Network.clearBrowserCache` plus `Storage.clearDataForOrigin` before every run,
  and say in the report whether the service worker was bypassed.

## 4. Reading a component's own state

For any suspicion of "the window/offset/index is wrong", do not infer from the DOM. React attaches
`__reactFiber$<id>` to every host node; `virtual-window.mjs` walks up the `return` chain, reads the
`memoizedState` hooks and recomputes the component's own formula. The output is arithmetic, not an
opinion, and it is the difference between "probably renders too much" and
`lastVisibleRow: -6 → slice(0, -6) → 864 of 870 rows`.

The same technique works for any component whose render depends on measured layout.

## 5. Screenshots

CDP captures them without extra tooling:

```js
await send("Emulation.setDeviceMetricsOverride", {width: 390, height: 844, deviceScaleFactor: 3, mobile: true});
const {data} = await send("Page.captureScreenshot", {format: "png", captureBeyondViewport: true});
```

Capture before and after at 390×844, 768×1024 and 1440×900 for every touched route, then apply
`visual-invariance.md`.

## 6. When the harness cannot answer it

If the question needs React commit counts, flame graphs or interaction traces, say so and ask for a
React DevTools Profiler session or a Performance panel recording. Do not fabricate a causal chain from
`TaskDuration` alone: it tells you how much time the main thread spent, never which component spent it.
