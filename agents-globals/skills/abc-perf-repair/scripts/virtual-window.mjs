// Scenario: virtualisation window probe. Reads the live React hook state of the grid component
// (through the fiber attached to a rendered card) and recomputes its window arithmetic, then
// checks whether the window self-corrects once the grid is inside the viewport.
// Usage: [AUTH_TOKEN=...] node virtual-window.mjs [url]
import {openSession, sleep, TARGET_URL} from "./cdp.mjs";

const PAGE_URL = process.argv[2] || process.env.TARGET_URL || `${new URL(TARGET_URL).origin}/games/category/slot`;
const OVERSCAN_ROWS = 5;

const {send, evaluate, close} = await openSession({mode: "desktop"});
await send("Network.clearBrowserCache");
await send("Page.navigate", {url: PAGE_URL});
await sleep(17_000);

// React attaches `__reactFiber$<id>` to every host node. Walk up to the component that owns the
// layout state and read its memoized hooks instead of guessing from the DOM.
const probe = `(() => {
  const card = document.querySelector('img[class*="_thumbnailImg_"]');
  if (!card) return {error: "no game card rendered"};
  let host = card.closest('div[style*="height:"]') || card;
  const key = Object.keys(host).find(name => name.startsWith("__reactFiber$"));
  if (!key) return {error: "react fiber not found on host node"};

  let fiber = host[key];
  let layout = null;
  let scrollTop = null;
  for (let depth = 0; depth < 12 && fiber; depth++) {
    for (let hook = fiber.memoizedState, guard = 0; hook && guard < 12; hook = hook.next, guard++) {
      const state = hook.memoizedState;
      if (state && typeof state === "object" && "width" in state && "offsetTop" in state) layout = {width: state.width, offsetTop: state.offsetTop};
      else if (typeof state === "number" && scrollTop === null) scrollTop = state;
    }
    fiber = fiber.return;
  }

  const cards = document.querySelectorAll('img[class*="_thumbnailImg_"]').length;
  if (!layout) return {cards, error: "layout state not found in fiber chain"};

  const columns = layout.width <= 480 ? 3
    : layout.width <= 768 ? Math.max(3, Math.floor(layout.width / 140))
    : layout.width < 1200 ? Math.max(4, Math.floor(layout.width / 150))
    : Math.max(5, Math.floor(layout.width / 160));
  const gap = layout.width <= 480 ? 8 : 12;
  const cardWidth = (layout.width - gap * (columns - 1)) / columns;
  const rowHeight = Math.round(cardWidth + 46 + gap);
  const viewportHeight = window.innerHeight;
  const relativeScroll = (scrollTop ?? 0) - layout.offsetTop;
  const firstVisibleRow = Math.max(0, Math.floor(relativeScroll / rowHeight) - ${OVERSCAN_ROWS});
  const lastVisibleRow = Math.min(Number.MAX_SAFE_INTEGER, Math.ceil((relativeScroll + viewportHeight) / rowHeight) + ${OVERSCAN_ROWS});

  return {
    cards,
    domNodes: document.getElementsByTagName("*").length,
    images: document.images.length,
    scrollY: Math.round(window.scrollY),
    layout: {width: Math.round(layout.width), offsetTop: Math.round(layout.offsetTop)},
    scrollTopState: scrollTop,
    columns, rowHeight, viewportHeight,
    relativeScroll: Math.round(relativeScroll),
    firstVisibleRow,
    lastVisibleRow,
    windowIsNegative: lastVisibleRow < firstVisibleRow,
  };
})()`;

const atLoad = await evaluate(probe);

await evaluate("document.scrollingElement.scrollTop = 6000");
await sleep(2000);
const insideGrid = await evaluate(probe);

console.log(JSON.stringify({
  url: PAGE_URL,
  reading: "layout and scrollTop come from the component's own hooks; the window is recomputed with the same formulas the component uses",
  atLoad,
  insideGrid,
  interpretation: atLoad.windowIsNegative
    ? "Negative window at scroll 0: Array.prototype.slice(first, negative) returns the list minus its tail instead of an empty window."
    : "Window is not negative at scroll 0 on this run.",
}, null, 1));

await close();
process.exit(0);
