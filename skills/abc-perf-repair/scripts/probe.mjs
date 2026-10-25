// Scenario: idle main-thread churn, running animations and timer creation on a settled Home.
// Usage: node probe.mjs <desktop|mobile>
import {openSession, sleep} from "./cdp.mjs";

const MODE = process.argv[2] || "desktop";
// Third argument "scroll" walks the page once before sampling, so below-the-fold sections
// (BetBy sports widget, live games, promos) are mounted during the measurement window.
const SCROLL_FIRST = process.argv[3] === "scroll";
const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:4173/";

const {send, on, evaluate, metrics, close} = await openSession({mode: MODE});

const networkEvents = [];
on(message => {
  if (message.method !== "Network.requestWillBeSent") return;
  networkEvents.push({at: message.params.timestamp, url: message.params.request.url, type: message.params.type});
});

const sample = async (seconds, label) => {
  const rows = [];
  for (let second = 0; second < seconds; second++) {
    const current = await metrics();
    rows.push({
      second: second + 1,
      recalc: current.RecalcStyleCount,
      layout: current.LayoutCount,
      heap: current.JSHeapUsedSize,
      task: current.TaskDuration,
      script: current.ScriptDuration,
    });
    await sleep(1000);
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  return {
    label,
    recalcPerSecond: +((last.recalc - first.recalc) / seconds).toFixed(1),
    layoutsPerSecond: +((last.layout - first.layout) / seconds).toFixed(1),
    taskMsPerSecond: Math.round(((last.task - first.task) * 1000) / seconds),
    scriptMsPerSecond: Math.round(((last.script - first.script) * 1000) / seconds),
    heapDeltaKb: Math.round((last.heap - first.heap) / 1024),
  };
};

await send("Network.clearBrowserCache");
await send("Page.navigate", {url: TARGET_URL});
await sleep(12_000);

if (SCROLL_FIRST) {
  const height = await evaluate("document.documentElement.scrollHeight");
  const viewport = await evaluate("window.innerHeight");
  for (let step = 1; step <= 8; step++) {
    await evaluate(`window.scrollTo(0, ${'$'}{Math.round((height - viewport) * (step / 8))})`);
    await sleep(800);
  }
  await sleep(2000);
}

// Count timer and frame work created after settling.
await evaluate(`
  window.__probe = {intervals: 0, timeouts: 0, rafs: 0};
  const originalInterval = window.setInterval;
  const originalTimeout = window.setTimeout;
  const originalFrame = window.requestAnimationFrame;
  window.setInterval = function (handler, delay, ...rest) { window.__probe.intervals++; return originalInterval.call(window, handler, delay, ...rest); };
  window.setTimeout = function (handler, delay, ...rest) { window.__probe.timeouts++; return originalTimeout.call(window, handler, delay, ...rest); };
  window.requestAnimationFrame = function (handler) { window.__probe.rafs++; return originalFrame.call(window, handler); };
`);

const networkWindowStart = networkEvents.length;
const withMotion = await sample(10, "idle-default-motion");
const idleTraffic = networkEvents.slice(networkWindowStart);
const animations = await evaluate(`(() => {
  const list = document.getAnimations();
  const byName = {};
  for (const animation of list) {
    const name = (animation.animationName || animation.id || animation.constructor.name) + (animation.effect?.pseudoElement || "");
    byName[name] = (byName[name] || 0) + 1;
  }
  return {count: list.length, byName};
})()`);
const timers = await evaluate("({...window.__probe})");

await send("Emulation.setEmulatedMedia", {features: [{name: "prefers-reduced-motion", value: "reduce"}]});
await sleep(1500);
const reducedMotion = await sample(8, "idle-reduced-motion");

const byHost = {};
for (const event of idleTraffic) {
  let host = "invalid";
  try { host = new URL(event.url).host; } catch {}
  byHost[host] = (byHost[host] || 0) + 1;
}
const busiestHost = Object.entries(byHost).sort((a, b) => b[1] - a[1])[0] || [null, 0];
const busiestGaps = idleTraffic
  .filter(event => {
    try { return new URL(event.url).host === busiestHost[0]; } catch { return false; }
  })
  .map((event, index, list) => (index === 0 ? null : Math.round((event.at - list[index - 1].at) * 1000)))
  .filter(gap => gap !== null)
  .sort((a, b) => a - b);

console.log(JSON.stringify({
  mode: MODE,
  scrolledFirst: SCROLL_FIRST,
  withMotion,
  reducedMotion,
  animations,
  timers,
  idleNetwork: {
    requestsInWindow: idleTraffic.length,
    byHost,
    busiestHost: busiestHost[0],
    busiestHostGapMs: {
      samples: busiestGaps.length,
      median: busiestGaps.length ? busiestGaps[Math.floor(busiestGaps.length / 2)] : null,
      min: busiestGaps[0] ?? null,
      max: busiestGaps[busiestGaps.length - 1] ?? null,
    },
    byUrl: idleTraffic.reduce((accumulator, event) => {
      const key = event.url.replace(/\/\d{6,}$/, "/<id>").slice(0, 120);
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {}),
  },
}, null, 1));

await close();
process.exit(0);
