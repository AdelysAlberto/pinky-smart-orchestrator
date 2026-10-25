// Module: the mark's own strokes fly in from opposite sides and lock together,
// each trailed by motion ghosts that evaporate as it settles.
import { clamp, inv, mix, smoothstep, eOutCubic, eOutBack, st } from '../math.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export const defaultCues = {
  appear: [9.18, 9.38], converge: [9.42, 10.82], clear: [10.86, 11.12],
};

/** Incoming vectors per stroke: [dx, dy, rotation deg, scale, delay]. */
export const defaultPaths = [
  [1, -1560, -440, -64, 0.72, 0],
  [0, 1640, 410, 48, 0.8, 0.05],
];

export function mount(ctx) {
  const md = ctx.brand.mark;
  const cues = { ...defaultCues, ...(ctx.cues?.fragments || {}) };
  const vectors = ctx.fragments || defaultPaths;
  const me = ctx.metrics.markEnd;
  const frags = [];

  vectors.forEach(([pathIndex, dx, dy, rot, sc, delay]) => {
    for (let trail = 3; trail >= 0; trail--) {
      const el = document.createElement('div');
      el.className = 'slot';
      const svg = svgEl('svg', { viewBox: md.viewBox, width: me.w, height: (me.w * 1114) / 1246, overflow: 'visible' });
      svg.appendChild(svgEl('path', { d: md.paths[pathIndex], fill: ctx.brand.markFill || '#fff' }));
      el.appendChild(svg);
      st(el, { left: `${me.cx}px`, top: `${me.cy}px`, width: `${me.w}px`, height: 'auto' });
      ctx.world.appendChild(el);
      const k = 1 + trail * 0.17;
      frags.push({
        el, delay, dx: dx * k, dy: dy * k, rot: rot * k, sc,
        op: trail === 0 ? 1 : [0.3, 0.16, 0.08][trail - 1], trail: trail > 0,
      });
    }
  });
  return { cues, frags };
}

export function update(t, ctx, m) {
  const c = m.cues;
  const appear = smoothstep(t, c.appear[0], c.appear[1]);
  if (appear <= 0) return;
  const conv = eOutCubic(clamp(inv(t, c.converge[0], c.converge[1])));
  const vis = appear * (1 - smoothstep(t, c.clear[0], c.clear[1]));
  m.frags.forEach((f) => {
    const q = clamp((conv - f.delay) / (1 - f.delay || 1));
    const e = eOutCubic(q) * 0.78 + eOutBack(q) * 0.22;   // slight overshoot, settles dead-on
    st(f.el, {
      opacity: vis * f.op * (f.trail ? Math.max(0, 1 - e * 1.15) : 1),
      transform: `translate(-50%,-50%) translate(${f.dx * (1 - e)}px,${f.dy * (1 - e)}px)`
        + ` rotate(${f.rot * (1 - e)}deg) scale(${mix(f.sc, 1, e)})`,
    });
  });
}
