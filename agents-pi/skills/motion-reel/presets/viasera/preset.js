// Preset: Viasera — 15 s brand reel.
// Owns everything brand- and piece-specific: tokens, logo geometry, per-format metrics,
// the canvas plan, the beat schedule and which engine modules run.
import { smoothstep, mix } from '../../engine/math.js';

/* ---------- brand tokens (artifacts/design/design_system_book.md) ---------- */
const COLORS = {
  bg: '#080B10',          // negro asfalto
  bgLift: '#121824',
  line: '#1E293B',
  primary: '#00E5FF',     // electric cyan
  primaryVariant: '#7DF3FF',
  secondary: '#0055FF',   // cobalt royal
  accent: '#FF6B00',      // volcanic orange — waypoints
  white: '#FFFFFF',
  text: '#E2E8F0',
  muted: '#94A3B8',
  dust: '#B4E6FF',
};

/* ---------- logo geometry (artifacts/assets/viasera-isotipo.svg) ---------- */
const MARK = {
  viewBox: '0 0 1246 1114',
  roadIndex: 0,           // the route curve doubles as the animated "road"
  paths: [
    'M843.5 125.5C1143.5 30 1245.5 3 1245.5 3L1095 275.5C1058 222.5 1005.5 207 936.5 205.5C903.358 204.78 808.957 211.914 738.5 234.5C724.279 239.059 554.091 285.299 613.5 356.5C636.336 383.869 707.516 406.884 774.5 441C855 482 884 493 941.5 561.5C811.5 786.667 615.5 1114 615.5 1114L427 792C427 792 625.924 791.156 702 687C818.5 527.5 470 470.5 470 347.5C439.5 243 687 175.319 843.5 125.5Z',
    'M0 0L226.5 81L504 577C504 577 414.468 556.574 369 542.5C322.561 528.126 269 504 269 504L0 0Z',
  ],
};

const RATIO = 1489 / 2430;   // imagotipo height / width

const ITEMS = [
  { label: 'DISTANCIA', unit: 'km', to: 1284 },
  { label: 'DESNIVEL', unit: 'm', to: 1946 },
  { label: 'V. MEDIA', unit: 'km/h', to: 68 },
];

/* ---------- per-format composition metrics ---------- */
const LANDSCAPE = () => ({
  mark: { w: 720, cx: 960, cy: 500 },
  markEnd: { w: 564, cx: 960, cy: 347.1 },
  type: { size: 196, cy: 540 },
  word: { size: 170, cy: 540 },
  tel: { x: 168, y: 266, gap: 42, size: 104, labelSize: 16, unitSize: 22, spread: 36, items: ITEMS },
  bearing: { x: 168, y: 266, size: 104, label: 'RUMBO', value: 137, align: 'right' },
  lock: { w: 1100, cy: 432, ratio: RATIO },
  tag: { cy: 831, size: 27 },
  rule: { cy: 896, w: 368 },
  credit: { cy: 934, size: 14 },
  compass: { cx: 1552, cy: 330, r: 132 },
  route: [[-80, 700], [210, 648], [430, 706], [628, 524], [838, 566], [1032, 386], [1258, 438], [1466, 306], [1712, 348], [2010, 214]],
  waypoints: [2, 4, 6, 8],
  contours: [
    { cx: 340, cy: 300, ph: 0.6, s: 1.0 },
    { cx: 1620, cy: 760, ph: 2.4, s: 1.25 },
    { cx: 1180, cy: 200, ph: 4.1, s: 0.75 },
  ],
  burst: [960, 486],
  blobs: [
    { c: 'primary', s: 900, x: 0.5, y: 0.463, pulse: true, alpha: (t) => smoothstep(t, 1, 2) * (1 - smoothstep(t, 4, 4.4)) * 0.75 + smoothstep(t, 10.9, 11.6) * 0.5 },
    { c: 'secondary', s: 1400, x: 0.781, y: 0.759, alpha: (t) => smoothstep(t, 0.6, 1.6) * (1 - smoothstep(t, 4.2, 4.8)) * 0.5 + smoothstep(t, 6.5, 7.2) * (1 - smoothstep(t, 9, 9.4)) * 0.55 },
    { c: 'accent', s: 620, x: 0.8125, y: 0.278, alpha: (t) => smoothstep(t, 6.7, 7.2) * (1 - smoothstep(t, 8.9, 9.3)) * 0.5 },
    { c: 'primary', s: 1100, x: 0.198, y: 0.833, alpha: (t) => smoothstep(t, 12.1, 12.8) * 0.55 * (1 - smoothstep(t, 14.4, 15)) },
  ],
});

const PORTRAIT = (L) => ({
  mark: { w: 640, cx: 540, cy: 691 },
  markEnd: { w: 461.5, cx: 540, cy: 850.5 },
  type: { size: 142, cy: 900 },
  word: { size: 150, cy: 900 },
  tel: { x: 140, y: 700, gap: 62, size: 98, labelSize: 15, unitSize: 21, spread: 36, items: ITEMS },
  bearing: { x: 140, y: 360, size: 92, label: 'RUMBO', value: 137, align: 'right' },
  lock: { w: 860, cy: 920, ratio: RATIO },
  tag: { cy: 1252, size: 24 },
  rule: { cy: 1348, w: 320 },
  credit: { cy: 1388, size: 13 },
  compass: { cx: 810, cy: 1640, r: 118 },
  route: [[1000, 420], [700, 560], [870, 780], [600, 920], [770, 1140], [520, 1280], [690, 1500], [1010, 1620]],
  waypoints: [2, 4, 6],
  contours: [
    { cx: 200, cy: 380, ph: 0.6, s: 0.8 },
    { cx: 900, cy: 1500, ph: 2.4, s: 1.0 },
    { cx: 760, cy: 180, ph: 4.1, s: 0.6 },
  ],
  burst: [540, 836],
  gridAlpha: 0.5,
  road: [0.33, 0.67],
  blobs: [
    { c: 'primary', s: 820, x: 0.5, y: 0.36, pulse: true, alpha: (t) => smoothstep(t, 1, 2) * (1 - smoothstep(t, 4, 4.4)) * 0.75 + smoothstep(t, 10.9, 11.6) * 0.5 },
    { c: 'secondary', s: 1300, x: 0.86, y: 0.66, alpha: (t) => smoothstep(t, 0.6, 1.6) * (1 - smoothstep(t, 4.2, 4.8)) * 0.5 + smoothstep(t, 6.5, 7.2) * (1 - smoothstep(t, 9, 9.4)) * 0.55 },
    { c: 'accent', s: 620, x: 0.16, y: 0.24, alpha: (t) => smoothstep(t, 6.7, 7.2) * (1 - smoothstep(t, 8.9, 9.3)) * 0.5 },
    { c: 'primary', s: 1100, x: 0.5, y: 0.86, alpha: (t) => smoothstep(t, 12.1, 12.8) * 0.55 * (1 - smoothstep(t, 14.4, 15)) },
  ],
  u: L.u,
});

export default {
  id: 'viasera',
  duration: 15,
  fps: 60,
  defaultFormat: '16x9',

  brand: { name: 'VIASERA', subTitle: 'MOTION REEL', colors: COLORS, mark: MARK },
  fonts: { sans: 'Inter, system-ui, sans-serif', mono: "'JetBrains Mono', monospace" },
  asset: '/presets/viasera/assets/logo-imagotipo.png',
  tagline: 'Cambia el rumbo, disfruta la ruta',
  credit: 'MOTION DESIGN \u00B7 REEL 2026',
  typeWord: 'VIASERA',
  typeSub: 'Motion Design Reel',
  words: ['RUTA', 'RUMBO', 'TRAZO', 'DESTINO'],
  accentIndex: 2,
  fragments: [[1, -1560, -440, -64, 0.72, 0], [0, 1640, 410, 48, 0.8, 0.05]],

  modules: ['mark', 'fragments', 'kinetic-type', 'word-flip', 'telemetry', 'lockup'],

  sections: [
    [0, '01', 'ORIGEN'], [1.16, '02', 'TRAZO'], [4.24, '03', 'VOZ'],
    [6.64, '04', 'TELEMETR\u00CDA'], [9.22, '05', 'ENSAMBLAJE'], [12.04, '06', 'MARCA'],
  ],

  camera: {
    scale: [
      [0, 1.16, (p) => 1 - (1 - p) ** 3], [1.15, 1.0, (p) => 1 - (1 - p) ** 3], [4.0, 1.045, (p) => p ** 3],
      [4.32, 1.0, (p) => 1 - (1 - p) ** 3], [6.5, 1.0, (p) => p ** 3], [6.62, 1.02, (p) => 1 - (1 - p) ** 3],
      [9.15, 1.0, (p) => p ** 3], [9.22, 1.075, (p) => p ** 3], [9.55, 1.0, (p) => 1 - (1 - p) ** 3],
      [12.0, 0.975, (p) => 1 - (1 - p) ** 3], [12.9, 1.004, (p) => 1 - (1 - p) ** 3], [15, 1.035, (p) => 1 - (1 - p) ** 3],
    ],
    y: [
      [0, 30, (p) => 1 - (1 - p) ** 3], [1.15, 0], [4.0, -16, (p) => p ** 3], [4.32, 0, (p) => 1 - (1 - p) ** 3],
      [6.6, 0], [9.2, 20, (p) => p ** 3], [9.55, 0, (p) => 1 - (1 - p) ** 3], [12.0, 0], [15, -12, (p) => 1 - (1 - p) ** 3],
    ],
  },

  impacts: {
    punch: [[4.2, 0.03, 0.3, 0.05], [6.6, 0.03, 0.26, 0.04], [9.2, 0.02, 0.34, 0.08], [10.82, 0.02, 0.38, 0.1], [12.0, 0.02, 0.26, 0.035]],
    flash: [[0.07, 0.025, 0.22, 0.95], [4.2, 0.015, 0.15, 0.3], [6.6, 0.015, 0.14, 0.26], [9.2, 0.015, 0.2, 0.5], [10.82, 0.015, 0.24, 0.34], [12.0, 0.015, 0.16, 0.2]],
    tear: [[4.2, 96], [6.6, 34], [9.2, 68], [10.82, 22], [12.0, 78]],
    sweep: [0.3, 1.2],
  },

  metrics: (L) => (L.portrait ? PORTRAIT(L) : LANDSCAPE()),

  fxPlan: (L, M) => ({
    w: L.w, h: L.h, u: L.u,
    horizon: L.horizon,
    seed: 20260214,
    monoFont: 'JetBrains Mono',
    markW: M.markEnd.w,
    shockSpread: Math.round(1500 * (L.w / 1920)),
    route: M.route,
    waypoints: M.waypoints,
    routeWidth: 4.2,
    contours: M.contours,
    compass: M.compass,
    gridAlpha: M.gridAlpha ?? 1,
    road: M.road ?? [0.26, 0.74],
    burst: { at: 10.82, c: M.burst },
    dustCount: 130,
    burstCount: 220,
    streakCount: 18,
  }),

  /** Canvas layer schedule. Each entry receives t and returns its parameters. */
  layers: (ctx) => {
    const M = ctx.metrics;
    const L = ctx.layout;
    return {
      grid: (t) => mix(smoothstep(t, 0.45, 1.9), 0, smoothstep(t, 3.9, 4.6)) * 0.5
        + mix(0, smoothstep(t, 9.1, 10.4), 1) * 0.34 * (1 - smoothstep(t, 13.6, 15)),
      contours: (t) => smoothstep(t, 6.55, 7.6) * (1 - smoothstep(t, 11.2, 12.2)),
      streaks: () => ({ at: [9.25, 9.6], out: [10.9, 11.5] }),
      ring: (t, plan) => ({
        at: [9.32, 9.72], out: [10.72, 11.0], ticks: 84,
        center: [M.markEnd.cx, M.markEnd.cy],
        from: plan.markW * 1.22, to: plan.markW * 0.6,
      }),
      route: () => ({ at: [6.72, 8.35], out: [8.8, 9.2], color: 'primary' }),
      compass: () => ({ at: [6.62, 7.9, 8.9, 9.2], bearing: M.bearing.value }),
      shocks: [
        { at: 4.2, c: [M.markEnd.cx, L.horizon * 0.99], a: 0.5 },
        { at: 6.6, c: [M.markEnd.cx, L.horizon * 0.99], a: 0.45 },
        { at: 9.2, c: [M.markEnd.cx, L.horizon * 0.99], a: 0.6 },
        { at: 10.82, c: [M.markEnd.cx, M.markEnd.cy], a: 1 },
        { at: 12.02, c: [M.markEnd.cx, M.lock.cy * 0.93], a: 0.4 },
      ],
    };
  },
};
