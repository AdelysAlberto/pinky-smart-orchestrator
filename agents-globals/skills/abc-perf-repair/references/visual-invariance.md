---
title: "abc-perf-repair — proving visual and navigational invariance"
module: "skills/abc-perf-repair"
author: "pi"
date: 2026-08-23
status: Done
priority: P1
scope: "[Reference]"
source: "skills/abc-perf-repair/SKILL.md"
---

# Proving nothing changed visually

A performance fix ships when a user cannot tell anything changed except the speed. Reading the diff is
not proof. This is the procedure that is.

## 1. Capture set

Before touching code, capture and keep:

- Every route whose code path you will modify, plus every route that renders the same component. A
  change in a shared card affects the grid, the carousels and the home page at once.
- Three widths: 390×844 dpr 3 (mobile), 768×1024 (tablet), 1440×900 (desktop).
- Both states when the app has them: anonymous and authenticated. Most layout branches are keyed on
  session state.
- Full page, not viewport: `captureBeyondViewport: true`.

Name the files `<route>-<state>-<width>-before.png` so the comparison is mechanical.

## 2. What you may not change

- Element order, nesting depth of the visible content, or class names consumed by CSS.
- Any rendered text, including fallbacks and empty states.
- Media sources and their crop. Re-encoding a JPEG to a smaller file is allowed only if the pixels are
  identical at the rendered size; changing the artwork is a product decision.
- Any conditional render. If a section disappears for a subset of users, that is a product decision.
- Scroll behaviour: anchor jumps, `scrollIntoView`, sticky offsets, restore-position logic.

## 3. What you will legitimately see

Dynamic content makes byte-identical diffs impossible. Declare the noise instead of pretending:

- CMS artwork, promo banners, winners and live scores rotate per load.
- Carousel positions, jackpot counters and countdowns advance between captures.
- Avatars, aliases and balances differ between sessions.
- Third-party widgets (sportsbooks, chat, analytics badges) render asynchronously.

State explicitly which regions you excluded and why. "Identical except the rotating promo strip and the
live-score widget, which are server-driven" is a real conclusion. "Pixel-identical" from someone who
did not look is not.

## 4. Structural assertions, which do not lie

Screenshots catch the gross errors; these catch the silent ones. Compare counts before and after:

```js
// Same route, same state, before and after the fix
({
  domNodes: document.getElementsByTagName("*").length,
  images: document.images.length,
  sections: document.querySelectorAll("section, [class*='sectionBlock']").length,
  headings: [...document.querySelectorAll("h1,h2,h3")].map(h => h.textContent.trim()),
  route: location.pathname + location.hash,
  scrollHeight: document.documentElement.scrollHeight,
})
```

Expected direction:

- `domNodes`, `images` and the lazy-section counts go **down** (that is the fix working).
- `headings`, `route` and `scrollHeight` stay **equal**. A changed heading is a copy change; a changed
  `scrollHeight` means the vertical rhythm moved.

`scrollHeight` is the single most useful invariant: it collapses every spacer, margin and reserved
height into one number, and any layout drift shows up there first. Allow a tolerance only where a
reserved-height placeholder is being replaced by the same content, and justify it in the report.

## 5. Navigation invariance

Run the interactions, not just the routes:

1. Direct load of every route (deep link, cold cache).
2. In-app navigation into and out of the page, including the back button.
3. The filter and search controls, the sort controls, and the "load more" affordance.
4. The anchor/hash paths (`#all-games` and friends): the scroll target must land in the same place.
5. Any redirect or guard: same destination, same timing.

The cheap check is a script that walks the route list and prints `location.pathname + location.hash`
plus `window.scrollY` after each interaction; compare the two columns. A navigation change is easier to
spot in that table than in a screenshot.

## 6. Report template

```
Route: /games/category/slot  ·  state: authenticated  ·  1440×900
  before: 86,875 nodes · 6,151 img · scrollHeight 187,200 · headings identical
  after:   3,203 nodes ·   175 img · scrollHeight  11,480 · headings identical
  diff: nodes and images down (intended), scrollHeight down because the grid no longer
        reserves 184,020 px for rows that are not rendered
  visual review: identical below the discovery carousels; the reserved empty area at the
        bottom of the page is gone, which is the bug, not a regression
  excluded: rotating promo strip, live-score widget
```

If you cannot fill the `headings` and `scrollHeight` lines, you have not proven anything about the UI.
