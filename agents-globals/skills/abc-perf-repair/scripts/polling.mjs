// Scenario: third-party polling. Scrolls the Home to the BetBy sports widget (#liveGames),
// parks there and counts outbound requests per host for a fixed window.
// Usage: [AUTH_TOKEN=...] node polling.mjs [windowSeconds] [mode]
import {openSession, sleep} from "./cdp.mjs";

const WINDOW_SECONDS = Number(process.argv[2] || 20);
const MODE = process.argv[3] || "desktop";
const TARGET_URL = process.env.TARGET_URL || "http://127.0.0.1:4173/";

const {send, on, evaluate, close} = await openSession({mode: MODE});

const events = [];
on(message => {
  if (message.method !== "Network.requestWillBeSent") return;
  events.push({at: message.params.timestamp, url: message.params.request.url, type: message.params.type});
});

await send("Network.clearBrowserCache");
await send("Page.navigate", {url: TARGET_URL});
await sleep(14_000);

// Walk the page in steps so IntersectionObserver-based LazySections can mount their children.
const height = await evaluate("document.documentElement.scrollHeight");
const viewport = await evaluate("window.innerHeight");
for (let step = 1; step <= 10; step++) {
  await evaluate(`window.scrollTo(0, ${Math.round((height - viewport) * (step / 10))})`);
  await sleep(700);
}

const scrolled = await evaluate(`(() => {
  const section = document.getElementById("liveGames");
  if (!section) return {found: false};
  section.scrollIntoView({block: "center"});
  return {found: true, height: Math.round(section.getBoundingClientRect().height)};
})()`);

await sleep(6000);

const windowStart = events.length;
const startAt = Date.now();
await sleep(WINDOW_SECONDS * 1000);
const observed = events.slice(windowStart);

const byHost = {};
const byEndpoint = {};
for (const event of observed) {
  let host = "invalid";
  let endpoint = event.url;
  try {
    const parsed = new URL(event.url);
    host = parsed.host;
    endpoint = parsed.pathname.replace(/\/\d{5,}$/, "/<id>");
  } catch {}
  byHost[host] = (byHost[host] || 0) + 1;
  const key = `${host}${endpoint}`.slice(0, 130);
  byEndpoint[key] = (byEndpoint[key] || 0) + 1;
}

const busiestHost = Object.entries(byHost).sort((a, b) => b[1] - a[1])[0];
const gaps = observed
  .filter(event => {
    try { return new URL(event.url).host === busiestHost?.[0]; } catch { return false; }
  })
  .map((event, index, list) => (index === 0 ? null : Math.round((event.at - list[index - 1].at) * 1000)))
  .filter(gap => gap !== null)
  .sort((a, b) => a - b);

console.log(JSON.stringify({
  mode: MODE,
  authenticated: !!process.env.AUTH_TOKEN,
  liveGamesSection: scrolled,
  windowSeconds: +((Date.now() - startAt) / 1000).toFixed(1),
  requestsInWindow: observed.length,
  byHost,
  byEndpoint,
  busiestHost: busiestHost?.[0] ?? null,
  busiestHostGapMs: {
    samples: gaps.length,
    median: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
    min: gaps[0] ?? null,
    max: gaps[gaps.length - 1] ?? null,
  },
  projectedRequestsPerHour: Math.round((observed.length / WINDOW_SECONDS) * 3600),
}, null, 1));

await close();
process.exit(0);
