// Module: an animated mark drawn from vector paths (paint-on mask + wireframe draw-on
// + animated road dashes + perimeter tracer). Owns the shared mark slot for the whole
// piece: draw-on, exit, re-appearance after the assembly and hand-off to the lockup.
import { clamp, inv, mix, smoothstep, bell, st } from '../math.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const nums = (vb) => vb.split(/[\s,]+/).map(Number);

/** Default beats; a preset may override any of them through `cues.mark`. */
export const defaultCues = {
  in: [1.2, 1.55], out: [4.0, 4.28], reveal: [10.82, 11.02], hide: [12.18, 12.52],
  fill: [1.95, 3.05], wire: [[1.58, 2.72], [1.38, 2.32]],
  road: [2.3, 2.7], roadOut: [3.85, 4.15], tracer: [2.62, 3.66],
};

export function mount(ctx) {
  const md = ctx.brand.mark;
  const [vx, vy, vw, vh] = nums(md.viewBox);
  const defs = svgEl('defs');

  const grad = svgEl('linearGradient', { id: 'mrReveal', gradientUnits: 'userSpaceOnUse', x1: vx, y1: vy, x2: vx + vw, y2: vy });
  const s1 = svgEl('stop', { offset: 0, 'stop-color': '#fff' });
  const s2 = svgEl('stop', { offset: 0, 'stop-color': '#fff' });
  const s3 = svgEl('stop', { offset: 0, 'stop-color': '#000' });
  grad.append(s1, s2, s3);
  defs.appendChild(grad);
  defs.appendChild((() => {
    const m = svgEl('mask', { id: 'mrMask' });
    m.appendChild(svgEl('rect', { x: vx, y: vy, width: vw, height: vh, fill: 'url(#mrReveal)' }));
    return m;
  })());
  defs.appendChild((() => {
    const f = svgEl('filter', { id: 'mrSoft', x: '-70%', y: '-70%', width: '240%', height: '240%' });
    const merge = svgEl('feMerge');
    merge.append(svgEl('feMergeNode', { in: 'b' }), svgEl('feMergeNode', { in: 'SourceGraphic' }));
    f.append(svgEl('feGaussianBlur', { stdDeviation: 13, result: 'b' }), merge);
    return f;
  })());

  const svg = svgEl('svg', { viewBox: md.viewBox, preserveAspectRatio: 'xMidYMid meet' });
  svg.appendChild(defs);

  const fill = svgEl('g', { mask: 'url(#mrMask)' });
  md.paths.forEach((d) => fill.appendChild(svgEl('path', { d, fill: ctx.brand.markFill || '#fff' })));

  const outline = svgEl('g');
  const outlines = md.paths.map((d) => {
    const p = svgEl('path', { d, fill: 'none', stroke: ctx.palette.colors.primary, 'stroke-width': 6, 'stroke-linejoin': 'round' });
    outline.appendChild(p); return p;
  });

  const road = svgEl('path', {
    d: md.paths[md.roadIndex ?? 0], fill: 'none', stroke: ctx.palette.colors.primary,
    'stroke-width': 5, 'stroke-dasharray': '28 24', 'stroke-linecap': 'round', opacity: 0,
  });
  const leader = svgEl('rect', { x: vx - 20, y: vy, width: 6, height: vh, fill: ctx.palette.colors.primaryVariant || ctx.palette.colors.primary, filter: 'url(#mrSoft)', opacity: 0 });
  const tracer = svgEl('circle', { cx: vx, cy: vy, r: 10, fill: '#fff', filter: 'url(#mrSoft)', opacity: 0 });

  svg.append(fill, outline, road, leader, tracer);

  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.appendChild(svg);
  ctx.world.appendChild(slot);

  const lenOf = (p) => { if (p.__len === undefined) p.__len = p.getTotalLength(); return p.__len; };
  return {
    slot, s1, s2, s3, outlines, road, leader, tracer, lenOf,
    cues: { ...defaultCues, ...(ctx.cues?.mark || {}) },
    bounds: { x: vx, y: vy, w: vw, h: vh },
  };
}

export function update(t, ctx, m) {
  const c = m.cues;
  const mm = ctx.metrics.mark, me = ctx.metrics.markEnd;

  const posP = clamp(inv(t, c.out[0], c.out[1]));
  const pos = posP * posP * posP;
  const exitPop = pos * (1 - smoothstep(t, c.out[1], c.out[1] + 0.32));
  const vis = smoothstep(t, c.in[0], c.in[1]) * (1 - smoothstep(t, c.out[0], c.out[1]))
            + smoothstep(t, c.reveal[0], c.reveal[1]) * (1 - smoothstep(t, c.hide[0], c.hide[1]));

  st(m.slot, {
    width: `${mix(mm.w, me.w, pos)}px`,
    left: `${mix(mm.cx, me.cx, pos)}px`,
    top: `${mix(mm.cy, me.cy, pos)}px`,
    opacity: clamp(vis),
    transform: `translate(-50%,-50%) scale(${1 + 0.09 * exitPop})`,
  });

  // paint-on fill through animated mask stops
  const p = clamp(1 - Math.pow(1 - inv(t, c.fill[0], c.fill[1]), 3), 0.001, 1.001);
  const a = clamp(p - 0.16, 0, 1), b = clamp(p, 0, 1), c3 = clamp(p + 0.004, 0, 1);
  m.s1.setAttribute('offset', a);
  m.s2.setAttribute('offset', Math.max(b, a + 0.001));
  m.s3.setAttribute('offset', Math.max(c3, Math.max(b, a + 0.001) + 0.001));

  // wireframe draw-on
  const wireOut = 1 - smoothstep(t, c.wire[0][1] + 0.2, c.wire[0][1] + 0.68);
  m.outlines.forEach((path, i) => {
    const len = m.lenOf(path);
    const q = 1 - Math.pow(1 - clamp(inv(t, ...c.wire[i])), 3);
    path.setAttribute('stroke-dasharray', len);
    path.setAttribute('stroke-dashoffset', len * (1 - q));
    path.setAttribute('opacity', wireOut * 0.9);
  });

  // the hero curve reads as a road
  m.road.setAttribute('stroke-dashoffset', -t * 95);
  m.road.setAttribute('opacity', smoothstep(t, c.road[0], c.road[1]) * (1 - smoothstep(t, c.roadOut[0], c.roadOut[1])));

  // light bar chasing the fill edge
  m.leader.setAttribute('x', mix(m.bounds.x - 30, m.bounds.x + m.bounds.w + 4, p));
  m.leader.setAttribute('opacity', bell(p, 0.02, 0.995) * 0.9);

  // tracer running the perimeter
  const tp = inv(t, ...c.tracer);
  const tOp = bell(tp, 0, 1);
  if (tOp > 0) {
    const pt = m.road.getPointAtLength((tp < 0.5 ? 4 * tp * tp * tp : 1 - Math.pow(-2 * tp + 2, 3) / 2) * m.lenOf(m.road));
    m.tracer.setAttribute('cx', pt.x);
    m.tracer.setAttribute('cy', pt.y);
  }
  m.tracer.setAttribute('opacity', tOp);
  m.tracer.setAttribute('r', 8 + 10 * (1 - Math.abs(0.5 - tp) * 2) * (tOp > 0 ? 1 : 0));
}
