// Generic canvas layer. Draws only primitives; every position, colour and cue comes
// from the preset's fxPlan, so nothing here is brand- or format-specific.
import { prng, inv, clamp, mix, eOutCubic, eOutExpo, eInOutCubic, smoothstep } from './math.js';

const TAU = Math.PI * 2;

const line = (ctx, x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
const dot = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
const poly = (ctx, pts, upto = 1) => {
  const n = Math.max(2, Math.ceil(pts.length * upto));
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
};

/** Distorted concentric rings that read as topographic contours. */
function contourSet({ cx, cy, ph = 0, s = 1, rx0, ry0, count = 8, step = 74, stepY = 50 }, steps = 150) {
  const ring = (i) => {
    const rx = rx0 ?? 90, ry = ry0 ?? 62;
    const pts = [];
    for (let j = 0; j <= steps; j++) {
      const a = (j / steps) * TAU;
      const r = 1 + 0.17 * Math.sin(a * 3 + ph + i * 0.42)
              + 0.085 * Math.sin(a * 5 - (ph + i * 0.42) * 1.7)
              + 0.045 * Math.sin(a * 8 + (ph + i * 0.42) * 0.4);
      pts.push([cx + Math.cos(a) * (rx + i * step * s) * r, cy + Math.sin(a) * (ry + i * stepY * s) * r]);
    }
    return pts;
  };
  return Array.from({ length: count }, (_, i) => ring(i));
}

export function createFx(canvas, plan, palette) {
  const { w: W, h: H } = { w: plan.w, h: plan.h };
  const rnd = prng(plan.seed ?? 20260214);
  const C = palette.rgb;

  const contours = plan.contours.map((c) => contourSet(c));
  const dust = Array.from({ length: plan.dustCount ?? 130 }, () => ({
    x: rnd() * W, y: rnd() * H, z: 0.25 + rnd() * 0.85, ph: rnd() * TAU, sp: 0.4 + rnd() * 1.4,
  }));
  const burst = Array.from({ length: plan.burstCount ?? 220 }, () => {
    const a = rnd() * TAU;
    return { dx: Math.cos(a), dy: Math.sin(a), sp: 240 + rnd() * 1500, sz: 1.2 + rnd() * 3.4, ph: rnd() * TAU };
  });
  const streaks = Array.from({ length: plan.streakCount ?? 18 }, () => ({
    y: rnd() * H, len: 260 + rnd() * 900, sp: 0.6 + rnd() * 0.9, ph: rnd(), w: 1 + rnd() * 2.6,
    accent: rnd() > 0.72,
  }));

  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.scale(dpr, dpr);

  /* ---------- primitives ---------- */
  const grid = (aIn) => {
    const a = aIn * (plan.gridAlpha ?? 1);
    if (a < 0.004) return;
    const hz = plan.horizon, vpx = W / 2, scroll = plan.clock * 0.85;
    const [rLo, rHi] = plan.road || [0.26, 0.74];
    ctx.save(); ctx.lineWidth = 1;
    for (let i = -16; i <= 16; i++) {
      ctx.strokeStyle = `rgba(${C.secondary},${a * 0.4 * (1 - Math.abs(i) / 19)})`;
      line(ctx, vpx + i * (W / 13), H, vpx + i * 6, hz);
    }
    for (let k = 0; k < 30; k++) {
      const z = ((k + scroll * 0.9) % 30) / 30;
      ctx.strokeStyle = `rgba(${C.primary},${a * (0.08 + 0.72 * z)})`;
      line(ctx, 0, hz + (H - hz) * Math.pow(z, 2.5), W, hz + (H - hz) * Math.pow(z, 2.5));
    }
    const gl = ctx.createLinearGradient(0, hz, 0, H);
    gl.addColorStop(0, `rgba(${C.primary},0)`);
    gl.addColorStop(0.35, `rgba(${C.primary},${a * 0.07})`);
    gl.addColorStop(1, `rgba(${C.primary},${a * 0.22})`);
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.moveTo(vpx - 34, hz); ctx.lineTo(vpx + 34, hz);
    ctx.lineTo(W * rHi, H); ctx.lineTo(W * rLo, H);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(${C.primary},${a * 0.6})`; ctx.lineWidth = 2;
    line(ctx, vpx - 34, hz, W * rLo, H);
    line(ctx, vpx + 34, hz, W * rHi, H);
    const g = ctx.createLinearGradient(0, hz - 110, 0, hz + 110);
    g.addColorStop(0, `rgba(${C.primary},0)`);
    g.addColorStop(0.5, `rgba(${C.primary},${a * 0.45})`);
    g.addColorStop(1, `rgba(${C.primary},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, hz - 110, W, 220);
    ctx.restore();
  };

  const drawContours = (a) => {
    if (a < 0.004) return;
    const t = plan.clock;
    ctx.save(); ctx.lineWidth = 1.1;
    contours.forEach((set, ci) => set.forEach((ring, i) => {
      const grow = smoothstep(t, 6.5 + i * 0.045 + ci * 0.07, 7.5 + i * 0.045 + ci * 0.07);
      const al = a * (0.34 - i * 0.028) * (0.6 + 0.4 * Math.sin(t * 0.5 + i));
      if (al <= 0) return;
      ctx.strokeStyle = `rgba(${C.secondary},${al})`;
      ctx.beginPath(); ctx.setLineDash([]);
      const n = Math.max(2, Math.ceil(ring.length * grow));
      ctx.moveTo(ring[0][0], ring[0][1]);
      for (let j = 1; j < n; j++) ctx.lineTo(ring[j][0], ring[j][1]);
      ctx.stroke();
    }));
    ctx.restore();
  };

  const route = (t, { at, out, color }) => {
    const p = inv(t, at[0], at[1]);
    const fade = 1 - smoothstep(t, out[0], out[1]);
    if (p <= 0 || fade <= 0) return;
    const col = C[color] || color;
    const pts = plan.route, wps = plan.waypoints;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${col},0.16)`; ctx.lineWidth = plan.routeWidth * 4;
    poly(ctx, pts, p);
    ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = plan.routeWidth;
    poly(ctx, pts, p);
    const seg = p * (pts.length - 1);
    const i0 = Math.min(pts.length - 2, Math.floor(seg)); const f = seg - i0;
    ctx.fillStyle = `rgba(${col},0.9)`;
    dot(ctx, mix(pts[i0][0], pts[i0 + 1][0], f), mix(pts[i0][1], pts[i0 + 1][1], f), 6);
    wps.forEach((wi) => {
      const wt = at[0] + (at[1] - at[0]) * (wi / (pts.length - 1));
      if (t < wt) return;
      const age = t - wt;
      const [x, y] = pts[wi];
      ctx.strokeStyle = `rgba(${C.accent},${Math.max(0, 0.85 - age * 0.55)})`;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 14 + age * 90, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(${C.accent},${Math.min(1, age * 8)})`; dot(ctx, x, y, 7);
      ctx.fillStyle = `rgba(${C.accent},${Math.min(0.9, age * 8)})`;
      ctx.font = `500 ${Math.round(15 * plan.u)}px "${plan.monoFont}", monospace`;
      ctx.fillText(`WP-${String(wi).padStart(2, '0')}`, x + 18, y - 12);
    });
    ctx.restore();
  };

  const compass = (t, { at, bearing }) => {
    const a = mix(0, smoothstep(t, at[0], at[1]), 1) * (1 - smoothstep(t, at[2], at[3]));
    if (a <= 0.005) return;
    const { cx, cy, r: R } = plan.compass;
    ctx.save(); ctx.globalAlpha = a;
    ctx.strokeStyle = `rgba(${C.accent},0.22)`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(${C.primary},0.18)`;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.72, 0, TAU); ctx.stroke();
    for (let i = 0; i < 72; i++) {
      const ang = (i / 72) * TAU - Math.PI / 2;
      const big = i % 6 === 0;
      const r2 = R - (big ? 18 : 9);
      ctx.strokeStyle = big ? `rgba(${C.white},0.6)` : `rgba(${C.muted},0.32)`;
      ctx.lineWidth = big ? 2 : 1;
      line(ctx, cx + Math.cos(ang) * R, cy + Math.sin(ang) * R, cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
    }
    const bg = eInOutCubic(inv(t, at[0], at[1]));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mix(TAU * 2.4, (bearing / 360) * TAU, bg) - Math.PI / 2 + Math.PI / 2);
    ctx.fillStyle = `rgba(${C.accent},0.95)`;
    ctx.beginPath(); ctx.moveTo(0, -(R - 34)); ctx.lineTo(11, 12); ctx.lineTo(0, 4); ctx.lineTo(-11, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(${C.muted},0.5)`;
    ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(9, -10); ctx.lineTo(-9, -10); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = `rgba(${C.primary},0.9)`; dot(ctx, cx, cy, 4);
    ctx.restore();
  };

  const particles = (t) => {
    const amb = 0.10 + 0.10 * Math.sin(t * 0.7);
    ctx.save();
    dust.forEach((d) => {
      const y = (d.y - t * 26 * d.sp + H * 4) % H;
      const al = amb * (0.3 + 0.7 * d.z) * (0.4 + 0.6 * Math.sin(t * 1.6 + d.ph));
      if (al <= 0) return;
      ctx.fillStyle = `rgba(${C.dust},${al})`;
      dot(ctx, d.x, y, d.z * 1.7);
    });
    const bt = t - plan.burst.at;
    if (bt > 0 && bt < 1.5) {
      burst.forEach((b) => {
        const d = eOutExpo(clamp(bt / 0.95)) * b.sp * 0.75;
        const al = Math.max(0, 1 - bt / 1.35) * (0.5 + 0.5 * Math.sin(t * 9 + b.ph));
        ctx.fillStyle = `rgba(${C.primary},${al * 0.85})`;
        dot(ctx, plan.burst.c[0] + b.dx * d, plan.burst.c[1] + b.dy * d, b.sz * (1 - bt / 1.8));
      });
    }
    ctx.restore();
  };

  const streakLayer = (t, { at, out }) => {
    const a = smoothstep(t, at[0], at[1]) * (1 - smoothstep(t, out[0], out[1]));
    if (a <= 0.005) return;
    ctx.save(); ctx.lineCap = 'round';
    streaks.forEach((s) => {
      const ph = ((t * s.sp + s.ph) % 1.35) - 0.35;
      const x = ph * (W + 1400) - 700;
      const y = s.y + Math.sin(t * 2 + s.ph * 9) * 22;
      const c = s.accent ? C.accent : C.primary;
      const g = ctx.createLinearGradient(x - s.len, y, x, y);
      g.addColorStop(0, `rgba(${c},0)`);
      g.addColorStop(0.8, `rgba(${c},${a * 0.95})`);
      g.addColorStop(1, `rgba(255,255,255,${a})`);
      ctx.strokeStyle = g; ctx.lineWidth = s.w * 1.4;
      line(ctx, x - s.len, y, x, y);
    });
    ctx.restore();
  };

  const shocks = (t, shocks) => {
    ctx.save();
    shocks.forEach((s) => {
      const age = t - s.at;
      if (age < 0 || age > 1.05) return;
      const e = eOutCubic(age / 1.05);
      ctx.strokeStyle = `rgba(${C.primary},${(1 - e) * 0.55 * s.a})`;
      ctx.lineWidth = 3 + (1 - e) * 7;
      ctx.beginPath(); ctx.arc(s.c[0], s.c[1], 40 + e * plan.shockSpread * s.a, 0, TAU); ctx.stroke();
    });
    ctx.restore();
  };

  const tickRing = (t, { at, out, center, from, to, ticks }) => {
    const a = smoothstep(t, at[0], at[1]) * (1 - smoothstep(t, out[0], out[1]));
    if (a <= 0.005) return;
    const e = eOutCubic(inv(t, at[1], out[0]));
    const R = mix(from, to, e);
    ctx.save();
    ctx.translate(center[0], center[1]);
    ctx.rotate(mix(1.0, 0, e));
    ctx.lineWidth = 2;
    for (let i = 0; i < ticks; i++) {
      const ang = (i / ticks) * TAU;
      const big = i % 7 === 0;
      ctx.strokeStyle = big ? `rgba(${C.primary},${a * 0.75})` : `rgba(${C.secondary},${a * 0.32})`;
      line(ctx, Math.cos(ang) * R, Math.sin(ang) * R, Math.cos(ang) * (R - (big ? 26 : 12)), Math.sin(ang) * (R - (big ? 26 : 12)));
    }
    ctx.strokeStyle = `rgba(${C.primary},${a * 0.22})`;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.restore();
  };

  /** Draw every layer the preset enabled for `t`. */
  function render(t, layers) {
    plan.clock = t;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    if (layers.grid) grid(layers.grid(t, plan));
    if (layers.contours) drawContours(layers.contours(t, plan));
    if (layers.streaks) streakLayer(t, layers.streaks(t, plan));
    if (layers.ring) tickRing(t, layers.ring(t, plan));
    ctx.globalCompositeOperation = 'source-over';
    if (layers.route) route(t, layers.route(t, plan));
    if (layers.compass) compass(t, layers.compass(t, plan));
    particles(t);
    shocks(t, layers.shocks || []);
  }

  return { render, ctx, plan };
}
