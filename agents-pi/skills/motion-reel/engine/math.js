// Pure math / easing / keyframe primitives. No side effects, no DOM.
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const inv = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const mix = (a, b, p) => a + (b - a) * p;
export const smoothstep = (t, a, b) => { const p = inv(t, a, b); return p * p * (3 - 2 * p); };

export const eOutCubic = (p) => 1 - Math.pow(1 - p, 3);
export const eOutQuart = (p) => 1 - Math.pow(1 - p, 4);
export const eOutQuint = (p) => 1 - Math.pow(1 - p, 5);
export const eOutExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
export const eInCubic = (p) => p * p * p;
export const eInExpo = (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10));
export const eInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const eOutBack = (p) => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
export const eOutElastic = (p) => {
  if (p === 0 || p === 1) return p;
  return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
};

/** Keyframes: [[time, value], [time, value, easing], ...] evaluated at t. */
export function kf(t, frames) {
  if (t <= frames[0][0]) return frames[0][1];
  const last = frames[frames.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, v0] = frames[i];
    const [t1, v1, e] = frames[i + 1];
    if (t >= t0 && t <= t1) return mix(v0, v1, e ? e(inv(t, t0, t1)) : inv(t, t0, t1));
  }
  return last[1];
}

/** Impulse: 0 outside [at, at+rise+fall], spiking to amp on the way in. */
export function spike(t, at, rise, fall, amp) {
  if (t <= at || t >= at + rise + fall) return 0;
  if (t < at + rise) return amp * eOutExpo(inv(t, at, at + rise));
  return amp * (1 - eOutCubic(inv(t, at + rise, at + rise + fall)));
}

/** Bell over [a,b]: 0 at both ends, 1 in the middle. */
export const bell = (t, a, b) => { const p = inv(t, a, b); return p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0; };

/** Seeded PRNG (mulberry32) — deterministic across runs. */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- tiny DOM helpers ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const st = (el, props) => { Object.assign(el.style, props); };
export const setText = (el, txt) => { if (el.textContent !== txt) el.textContent = txt; };
export const fmt = (el, n, digits = 0) =>
  setText(el, n.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
