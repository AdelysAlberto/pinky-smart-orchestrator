// Module: kinetic type — one letter at a time, masked from below, with animated tracking.
import { clamp, inv, mix, smoothstep, eOutCubic, eOutQuint, st } from '../math.js';

export const defaultCues = {
  in: [4.26, 4.44], out: [6.0, 6.2], stagger: 0.056, letter: 0.6,
  track: [46, 6], trackRange: [4.3, 5.75], sub: [5.3, 5.72],
};

export function mount(ctx) {
  const cues = { ...defaultCues, ...(ctx.cues?.type || {}) };
  const word = ctx.typeWord || ctx.brand.name;
  const m = ctx.metrics.type;

  const layer = document.createElement('div');
  layer.className = 'slot';
  st(layer, { left: 0, right: 0, top: `${m.cy}px`, width: '100%' });

  const row = document.createElement('div');
  row.className = 'krow';
  const letters = [...word].map((ch) => {
    const wrap = document.createElement('span');
    wrap.className = 'kw';
    const inner = document.createElement('i');
    inner.textContent = ch;
    st(inner, { 'font-size': `${m.size}px`, 'line-height': `${Math.round(m.size * 1.072)}px` });
    st(wrap, { height: `${Math.round(m.size * 1.072)}px` });
    wrap.appendChild(inner); row.appendChild(wrap);
    return { wrap, inner };
  });
  layer.appendChild(row);

  const sub = document.createElement('div');
  sub.className = 'ksub';
  sub.textContent = ctx.typeSub || '';
  const subSize = Math.round(21 * ctx.layout.u);
  st(sub, { 'font-size': `${subSize}px`, 'margin-top': `${Math.round(subSize * 1.6)}px` });
  layer.appendChild(sub);

  st(layer, { transform: 'translateY(-50%)' });
  ctx.world.appendChild(layer);
  return { cues, layer, row, letters, sub, layoutHeight: m.size * 1.072 + m.size * 0.28 };
}

export function update(t, ctx, m) {
  const c = m.cues;
  const inA = smoothstep(t, c.in[0], c.in[1]);
  const outA = smoothstep(t, c.out[0], c.out[1]);
  st(m.layer, { opacity: inA * (1 - outA), transform: `translateY(-50%) scale(${1 + 0.16 * outA * outA})` });

  const track = mix(c.track[0], c.track[1], eOutCubic(inv(t, c.trackRange[0], c.trackRange[1])));
  m.letters.forEach((l, i) => {
    const start = c.in[1] - 0.12 + i * c.stagger;
    const q = clamp(inv(t, start, start + c.letter));
    st(l.inner, { transform: `translateY(${(1 - eOutQuint(q)) * 106}%)`, opacity: q > 0 ? 1 : 0 });
    l.wrap.style.marginRight = `${i < m.letters.length - 1 ? track : 0}px`;
  });

  const sp = inv(t, c.sub[0], c.sub[1]);
  st(m.sub, { opacity: sp * (1 - outA), transform: `translateY(${(1 - eOutCubic(sp)) * 16}px)` });
}
