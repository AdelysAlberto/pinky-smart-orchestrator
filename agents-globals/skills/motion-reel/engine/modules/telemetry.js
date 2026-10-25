// Module: telemetry counters + a bearing readout. Values count up on an eased curve.
import { clamp, inv, mix, smoothstep, eOutCubic, eInOutCubic, eOutExpo, st, fmt, setText } from '../math.js';

export const defaultCues = { in: [6.68, 7.05], out: [8.86, 9.18], count: [6.76, 8.2], bearing: [6.7, 7.85] };

export function mount(ctx) {
  const cues = { ...defaultCues, ...(ctx.cues?.telemetry || {}) };
  const t = ctx.metrics.tel;
  const b = ctx.metrics.bearing;

  const wrap = document.createElement('div');
  wrap.className = 'slot';
  st(wrap, { left: `${t.x}px`, top: `${t.y}px` });

  const values = t.items.map((it) => {
    const box = document.createElement('div');
    box.className = 'metric';
    st(box, { 'margin-bottom': `${t.gap}px` });
    const k = document.createElement('span');
    k.className = 'k'; k.textContent = it.label;
    st(k, { 'font-size': `${t.labelSize}px` });
    const v = document.createElement('span');
    v.className = 'v'; st(v, { 'font-size': `${t.size}px` });
    const u = document.createElement('span');
    u.className = 'u'; u.textContent = it.unit; st(u, { 'font-size': `${t.unitSize}px` });
    box.append(k, v, u);
    wrap.appendChild(box);
    return { el: v, to: it.to, digits: it.digits || 0 };
  });
  ctx.world.appendChild(wrap);

  const right = document.createElement('div');
  right.className = 'slot';
  const isRight = (b.align || 'right') === 'right';
  st(right, isRight
    ? { right: `${b.x}px`, top: `${b.y}px`, 'text-align': 'right' }
    : { left: `${b.x}px`, top: `${b.y}px`, 'text-align': 'left' });
  const bk = document.createElement('span');
  bk.className = 'k'; bk.textContent = b.label; st(bk, { 'font-size': `${t.labelSize}px` });
  const bv = document.createElement('span');
  bv.className = 'v'; bv.textContent = '000'; st(bv, { 'font-size': `${b.size}px` });
  const bu = document.createElement('span');
  bu.className = 'u'; bu.textContent = '\u00B0'; st(bu, { 'font-size': `${t.unitSize}px` });
  right.append(bk, bv, bu);
  ctx.world.appendChild(right);

  return { cues, wrap, right, values, bearingEl: bv, bearingTo: b.value, spread: t.spread ?? 36 };
}

export function update(t, ctx, m) {
  const c = m.cues;
  const inA = smoothstep(t, c.in[0], c.in[1]);
  const outA = smoothstep(t, c.out[0], c.out[1]);
  const vis = inA * (1 - outA);

  st(m.wrap, { opacity: vis, transform: `translateX(${(1 - eOutCubic(inA)) * -m.spread}px)` });
  st(m.right, { opacity: vis, transform: `translateX(${(1 - eOutCubic(inA)) * m.spread}px)` });

  const cp = eOutExpo(inv(t, c.count[0], c.count[1]));
  m.values.forEach((v) => fmt(v.el, Math.round(v.to * cp), v.digits));

  const bp = eInOutCubic(inv(t, c.bearing[0], c.bearing[1]));
  setText(m.bearingEl, String(Math.round(mix(0, m.bearingTo, bp))).padStart(3, '0'));
  void clamp;
}
