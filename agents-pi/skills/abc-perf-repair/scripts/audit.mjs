// Scenario: load Home, settle, scroll once, and snapshot network + memory at each checkpoint.
// Usage: node audit.mjs <desktop|mobile> [label]
// Requires a Chrome started with --remote-debugging-port=9222 (see README.md).
import {openSession, sleep} from "./cdp.mjs";

const MODE = process.argv[2] || "desktop";
const LABEL = process.argv[3] || MODE;
const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:4173/";

const session = await openSession({mode: MODE});
const {send, on, evaluate, metrics, close} = session;

const requests = new Map();
const finished = [];
const consoleMessages = [];
const pageErrors = [];
const failedRequests = [];

on(message => {
  const params = message.params;
  if (!params) return;
  if (message.method === "Network.requestWillBeSent") {
    requests.set(params.requestId, {
      url: params.request.url,
      method: params.request.method,
      type: params.type,
      start: params.timestamp,
      status: null,
      encoded: 0,
      cacheControl: null,
    });
  } else if (message.method === "Network.responseReceived") {
    const entry = requests.get(params.requestId);
    if (!entry) return;
    entry.status = params.response.status;
    entry.cacheControl = params.response.headers["cache-control"] || params.response.headers["Cache-Control"] || null;
  } else if (message.method === "Network.loadingFinished") {
    const entry = requests.get(params.requestId);
    if (!entry) return;
    entry.encoded = params.encodedDataLength;
    entry.end = params.timestamp;
    finished.push(entry);
  } else if (message.method === "Network.loadingFailed") {
    failedRequests.push({url: requests.get(params.requestId)?.url, error: params.errorText, type: params.type});
  } else if (message.method === "Runtime.consoleAPICalled") {
    consoleMessages.push({level: params.type, text: (params.args || []).map(a => a.value ?? a.description).join(" ").slice(0, 400)});
  } else if (message.method === "Log.entryAdded") {
    consoleMessages.push({level: params.entry.level, text: `[${params.entry.source}] ${params.entry.text}`.slice(0, 400)});
  } else if (message.method === "Runtime.exceptionThrown") {
    pageErrors.push((params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || "").slice(0, 400));
  }
});

// Installed before navigation: long tasks and DOM mutation churn.
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
    window.__audit = {longTasks: [], mutations: {added: 0, removed: 0}, frames: 0};
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          window.__audit.longTasks.push({start: Math.round(entry.startTime), dur: Math.round(entry.duration)});
        }
      }).observe({entryTypes: ["longtask"]});
    } catch (error) {}
    try {
      const observer = new MutationObserver(records => {
        for (const record of records) {
          window.__audit.mutations.added += record.addedNodes.length;
          window.__audit.mutations.removed += record.removedNodes.length;
        }
      });
      const start = () => observer.observe(document.documentElement, {childList: true, subtree: true, attributes: true, characterData: true});
      if (document.documentElement) start();
      else document.addEventListener("DOMContentLoaded", start, {once: true});
    } catch (error) {}
    const frame = () => { window.__audit.frames++; requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  `,
});

const snapshot = async tag => {
  const performanceMetrics = await metrics();
  const pageState = await evaluate(`(() => {
    const audit = window.__audit || {};
    const navigation = performance.getEntriesByType("navigation")[0] || {};
    return {
      mutations: audit.mutations,
      longTasks: audit.longTasks,
      frames: audit.frames,
      performanceMemory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
      } : null,
      navigation: {
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd || 0),
        load: Math.round(navigation.loadEventEnd || 0),
      },
      domNodes: document.getElementsByTagName("*").length,
      imageCount: document.images.length,
      scrollHeight: document.documentElement.scrollHeight,
    };
  })()`);
  return {
    tag,
    metrics: {
      JSHeapUsedSize: performanceMetrics.JSHeapUsedSize,
      Nodes: performanceMetrics.Nodes,
      LayoutCount: performanceMetrics.LayoutCount,
      RecalcStyleCount: performanceMetrics.RecalcStyleCount,
      TaskDuration: performanceMetrics.TaskDuration,
      ScriptDuration: performanceMetrics.ScriptDuration,
    },
    ...pageState,
  };
};

const scrollThrough = async (steps = 8, pause = 900) => {
  const height = await evaluate("document.documentElement.scrollHeight");
  const viewport = await evaluate("window.innerHeight");
  for (let step = 1; step <= steps; step++) {
    await evaluate(`window.scrollTo(0, ${Math.round((height - viewport) * (step / steps))})`);
    await sleep(pause);
  }
  await evaluate("window.scrollTo(0, 0)");
  await sleep(600);
};

await send("Network.clearBrowserCache");
await send("Page.navigate", {url: TARGET_URL});
await sleep(14_000);
const checkpoints = [await snapshot("after-load-14s")];

await sleep(6_000);
checkpoints.push(await snapshot("idle-20s"));

await scrollThrough();
checkpoints.push(await snapshot("after-scroll"));

await sleep(5_000);
checkpoints.push(await snapshot("post-scroll-idle"));

await send("HeapProfiler.enable");
await send("HeapProfiler.collectGarbage");
await sleep(800);
const afterGc = await metrics();

const all = [...requests.values()];
const countBy = (list, key) =>
  list.reduce((accumulator, entry) => {
    const value = typeof key === "function" ? key(entry) : entry[key];
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});
const originOf = url => {
  try { return new URL(url).origin; } catch { return "invalid"; }
};
const pathOf = url => {
  try { const parsed = new URL(url); return parsed.origin + parsed.pathname; } catch { return url; }
};

const apiCalls = all.filter(entry => ["XHR", "Fetch"].includes(entry.type));
const duplicated = Object.entries(countBy(apiCalls, entry => pathOf(entry.url)))
  .filter(([, count]) => count > 1)
  .sort((a, b) => b[1] - a[1]);

console.log(JSON.stringify({
  label: LABEL,
  mode: MODE,
  url: TARGET_URL,
  checkpoints,
  afterGcHeap: {used: afterGc.JSHeapUsedSize, total: afterGc.JSHeapTotalSize, nodes: afterGc.Nodes},
  network: {
    totalRequests: all.length,
    byType: countBy(all, entry => entry.type || "Other"),
    byOrigin: countBy(all, entry => originOf(entry.url)),
    transferBytes: finished.reduce((sum, entry) => sum + entry.encoded, 0),
    bytesByType: finished.reduce((accumulator, entry) => {
      const type = entry.type || "Other";
      accumulator[type] = (accumulator[type] || 0) + entry.encoded;
      return accumulator;
    }, {}),
    bytesByOrigin: finished.reduce((accumulator, entry) => {
      const origin = originOf(entry.url);
      accumulator[origin] = (accumulator[origin] || 0) + entry.encoded;
      return accumulator;
    }, {}),
    heaviest: finished
      .slice()
      .sort((a, b) => b.encoded - a.encoded)
      .slice(0, 40)
      .map(entry => ({url: entry.url.slice(0, 240), type: entry.type, encoded: entry.encoded, status: entry.status, cacheControl: entry.cacheControl})),
    duplicatedApiPaths: duplicated.map(([path, count]) => ({path, count})),
    apiCalls: apiCalls.map(entry => ({
      path: pathOf(entry.url),
      method: entry.method,
      status: entry.status,
      ms: entry.end ? Math.round((entry.end - entry.start) * 1000) : null,
    })),
    failed: failedRequests,
  },
  console: {
    byLevel: countBy(consoleMessages, message => message.level),
    errors: consoleMessages.filter(message => message.level === "error").slice(0, 40),
    warnings: consoleMessages.filter(message => ["warning", "warn"].includes(message.level)).slice(0, 40),
    pageErrors,
  },
}, null, 1));

await close();
process.exit(0);
