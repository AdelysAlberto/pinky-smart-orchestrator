---
name: motion-reel
description: Build deterministic motion-graphics videos (brand reels, logo animations, kinetic typography, animated UI/telemetry) as code, and render them to MP4 in 16:9 or 9:16. Use when asked for a reel, an animated logo or brand piece, a motion graphics video, kinetic type, an animated app screenshot, or when told to render/export a video from HTML and Canvas.
license: MIT
compatibility: pi
metadata:
  domain: motion
  focus: video-generation
disable-model-invocation: true
---

# Motion Reel

Turns a **preset** (brand + timeline + canvas plan) into a **deterministic video**. Every frame comes
from `render(t)`, a pure function of time, so output is reproducible and reviewable as code.

**A preset is authored by you, not generated.** This skill gives you an engine and a vocabulary of
animated modules; deciding the beats, rhythm, framing and hierarchy is your job. If a request is
"make a reel", expect to write a preset.

## Hard rules

1. **No `requestAnimationFrame`, no CSS transitions/animations inside the composition.** Every value
   is set inline from `render(t)`. CSS is structure and static styling only.
2. **All randomness is seeded** (`prng(seed)` from `engine/math.js`). Never `Math.random()`.
3. **No hardcoded brand hex in the engine.** Tokens live in the preset and reach CSS as custom
   properties (via `applyCssTokens`) and Canvas as `palette.rgb.<token>` / `palette.a(token, alpha)`.
4. **Frame size, fps and duration come from config**, never repeated as literals across files.
5. **Verify before claiming done.** A render that was not inspected frame by frame is not verified.
   Say so when you only have contact-sheet evidence.

## Commands

```bash
# from anywhere; --out defaults to ./motion-out
node <skill>/reel.mjs --preset viasera                      # 16:9 master + sound
node <skill>/reel.mjs --preset viasera --format 9x16        # vertical master
node <skill>/reel.mjs --preset viasera --formats 16x9,9x16  # both
node <skill>/reel.mjs --preset viasera --sheet              # 4x4 contact sheet (QA, ~20 s)
node <skill>/reel.mjs --preset viasera --at 4.2,10.8        # single full-res frames
node <skill>/reel.mjs --preset viasera --dsf 1              # fast iteration (~4 min vs ~20 min)
node <skill>/reel.mjs --preset viasera --no-sound --no-encode --keep-frames
CHROME=/path/to/chrome   # override Chrome discovery
```

`--dsf 2` (default) rasterises at 2x and downscales with lanczos: crisp text and hairlines at the
cost of roughly 1.4 s/frame at 1080p60. Design and iterate at `--dsf 1`, master at `--dsf 2`.

## Architecture

```
reel.mjs                     CLI: serve, capture, encode, synthesise + mux sound
engine/                      brand-agnostic
  math.js                    easings, kf(), spike(), bell(), prng(), DOM helpers
  layout.js                  createLayout(w,h) -> frame primitives (portrait, u, pad, horizon, safe)
  palette.js                 tokens -> CSS custom properties + canvas rgb triples
  config.js                  FORMATS table + resolveConfig(preset, opts)
  boot.js                    mounts the stage, HUD, camera, impacts, grain; exposes window.__render
  stage.css                  structure only; every colour is a var(--token)
  template.html              stage skeleton with <!--ENTRY--> placeholder
  fx.js                      canvas primitives driven by the preset's fxPlan + layers
  synth.js                   audio synthesis (tone/noise/lowpass/highpass/normalize/toWav)
  modules/                   the animated vocabulary; see below
presets/<id>/
  preset.js                  brand tokens, logo geometry, per-format metrics, fx plan, cues
  sound.js                   design(track): the piece's sound design
  assets/                    images the piece uses
```

## Preset contract

```js
export default {
  id, duration: 15, fps: 60, defaultFormat: '16x9',

  brand: { name: 'VIASERA', subTitle: 'MOTION REEL', colors: {...}, mark: { viewBox, paths, roadIndex } },
  fonts: { sans, mono },
  asset: '/presets/<id>/assets/logo.png',     // used by the lockup module
  tagline, credit, typeWord, typeSub, words, accentIndex,
  fragments: [[pathIndex, dx, dy, rotDeg, scale, delay], ...],

  modules: ['mark', 'fragments', 'kinetic-type', 'word-flip', 'telemetry', 'lockup'],
  sections: [[t, '01', 'ORIGEN'], ...],          // HUD chapter labels

  camera: { scale: [[t, v, easing]], y: [[t, v, easing]] },
  impacts: {
    punch: [[at, rise, fall, amp]],              // camera scale punch
    flash: [[at, rise, fall, amp]],              // full-frame flash
    tear:  [[at, yPercent]],                     // horizontal tear line
    sweep: [start, end],                         // boot scanline
  },

  cues: { mark: {...}, fragments: {...}, type: {...}, wordFlip: {...}, telemetry: {...}, lockup: {...} },

  metrics: (layout) => layout.portrait ? PORTRAIT(layout) : LANDSCAPE(layout),
  fxPlan: (layout, metrics) => ({ w, h, u, horizon, seed, markW, shockSpread, road, gridAlpha,
                                  route, waypoints, routeWidth, contours, compass, burst, dustCount, burstCount, streakCount }),
  layers: (ctx) => ({ grid(t), contours(t), streaks(t), ring(t, plan), route(t), compass(t), shocks }),
};
```

`cues` merges over each module's defaults, so a preset only overrides what differs.

### Metrics consumed by the modules

| Key | Shape | Used by |
| --- | --- | --- |
| `mark`, `markEnd` | `{ w, cx, cy }` | mark (scene 02 position, and the lockup position the assembly converges to) |
| `type` | `{ size, cy }` | kinetic-type (block is horizontally centred) |
| `word` | `{ size, cy }` | word-flip |
| `tel` | `{ x, y, gap, size, labelSize, unitSize, spread, items:[{label,unit,to,digits}] }` | telemetry |
| `bearing` | `{ x, y, size, label, value, align }` | telemetry |
| `lock` | `{ w, cy, ratio }` | lockup (the logo/imagotipo asset box) |
| `tag`, `rule`, `credit` | `{ cy, size }` / `{ cy, w }` | lockup |
| `compass` | `{ cx, cy, r }` | fx canvas |
| `route`, `waypoints`, `contours`, `burst` | arrays | fx canvas |
| `gridAlpha`, `road` | number, `[lo, hi]` | fx canvas density (lower in portrait) |
| `blobs` | `[{ c, s, x, y, pulse, alpha(t) }]` | ambient bloom (`x`/`y` are fractions of the frame) |

## Formats

`16x9` → 1920x1080, `9x16` → 1080x1920. `layout.portrait` flips the numbers; `layout.u` is the
design unit (1.0 on the 1080 short side) so type sizes and HUD insets scale consistently.

**Portrait is a re-authoring, not a crop.** The preset ships a separate metrics block per
orientation. What actually has to change:

- Centred elements (`type`, `word`, `lock`, `markEnd`) only need `size`/`cy`.
- Edge-anchored elements (`tel`, `bearing`, `compass`, `route`) need new coordinates — a landscape
  route will fly out of a vertical frame.
- Lower the canvas density (`gridAlpha` ~0.5, narrower `road`) or the perspective plane becomes a
  bright cone that swallows the composition.
- Watch collisions that do not exist in landscape: the perspective cone vs. the mark, the telemetry
  column vs. the route, the splash screen vs. the kinetic type.

## Modules

| id | Owns | Notes |
| --- | --- | --- |
| `mark` | the vector mark slot for the whole piece | paint-on mask + wireframe draw-on + road dashes + perimeter tracer. **Also drives the re-appearance after the assembly and the hand-off to the lockup**, so its position/size must match `metrics.markEnd`. |
| `fragments` | the two strokes flying in | needs `brand.mark.paths`; converges onto `metrics.markEnd` |
| `kinetic-type` | masked per-letter reveal + tracking | needs `typeWord`, `typeSub` |
| `word-flip` | rapid single-word transition | needs `words`, `accentIndex` |
| `telemetry` | counters + bearing readout | counts on an eased curve from `cues.count` |
| `lockup` | logo asset + masked shine + tagline + credit | needs `asset`; the shine reuses the asset as its own alpha mask |

### Adding a module

```js
// engine/modules/my-beat.js
export const defaultCues = { in: [...], out: [...] };
export function mount(ctx) { /* build DOM into ctx.world, return refs */ }
export function update(t, ctx, m) { /* pure f(t) */ }
```

Register it in `engine/modules/index.js`. `ctx` = `{ cfg, layout, metrics, palette, world, assetUrl, ...preset }`.
Modules must own disjoint elements — two modules writing the same node is a bug.

## Sound

`presets/<id>/sound.js` exports `design(track)` and optional `loudness`. Hits are authored to land on
the same frames as `impacts`. `reel.mjs` writes `<preset>-<format>-sound.wav` and muxes it with
`loudnorm` (default −15 LUFS / TP −1.0). Inspect with a spectrogram, not by ear:

```bash
ffmpeg -i out/<preset>-16x9-sound.wav -lavfi showspectrumpic=s=1600x520:scale=log:color=intensity spec.png
```

A good spectrogram shows a continuous low bed, vertical broadband transients on the cuts, and
diagonal risers resolving into them. Silence in the upper band means a muffled mix.

## Verification protocol

1. `--sheet` → check the 16-frame arc: does every beat read, is anything colliding, is anything empty.
2. `--at` on the risky instants (cuts, mask hand-offs, the lockup hold) at full res. **Zoom into
   edges**: seam artefacts only show at 1:1 or larger.
3. Full render at `--dsf 2`, then re-extract a dense sheet **from the MP4** (not from the PNGs) to
   confirm nothing was lost in encode.
4. State clearly whether you inspected frames or watched the video. You cannot watch video; say so.

## Pitfalls already paid for

- **Canvas `rgba(${token})` with a wrong token name fails silently.** Invalid colour strings are
  ignored by `strokeStyle`/`fillStyle`, and `arc(NaN, …)` draws nothing — the layer just disappears
  with no error. When a canvas layer is missing, assert its values, do not re-read the code.
- **Destructuring key mismatches are silent too.** `{ x, y } = { cx, cy }` yields `undefined`, and
  Canvas treats non-finite geometry as a no-op. This is how the compass vanished once.
- **Two representations of one shape (vector + PNG) crossfading must share the box to the pixel.**
  Any residual `scale` on the vector wrapper shows up as a grey ghost edge over the PNG. Keep
  exit "pops" in a transient term, never in the position interpolator.
- **`mix-blend-mode: overlay` grain dirties white.** Keep the noise tile small (256 px) and total
  opacity under 0.09, or the logo and type pick up mottling.
- **A 1px-on/2px-off scanline overlay moirés badly on any rescale.** Keep it at ~0.018 opacity and a
  4 px period.
- **Editorialising in the engine is a smell.** If you are writing a beat's timing into `engine/`, it
  belongs in the preset's `cues` instead.

## Workflow for a new brand or piece

1. Create `presets/<id>/`, copy the logo/image into `assets/`.
2. Fill `brand.colors` from the brand's own token source — never invent hex.
3. Set `duration`, `fps`, `sections`, and the `modules` list for the beats you want.
4. Author `metrics` for **both** orientations (`--sheet` each; the vertical one will need real work).
5. Author `fxPlan` + `layers`, then `camera` + `impacts` to give the cuts weight.
6. Author `sound.js` with hits locked to `impacts`.
7. Run the verification protocol. Then hand back the file paths and state what you verified.
