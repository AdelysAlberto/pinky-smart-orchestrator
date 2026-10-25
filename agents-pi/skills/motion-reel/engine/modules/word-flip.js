// Module: a rapid word flip used as a transition between beats.
import { clamp, inv, smoothstep, eOutExpo, eOutCubic, st, setText } from '../math.js';

export const defaultCues = { from: 6.06, step: 0.115 };

export function mount(ctx) {
  const cues = { ...defaultCues, ...(ctx.cues?.wordFlip || {}) };
  const m = ctx.metrics.word;
  const el = document.createElement('div');
  el.className = 'slot wordflip';
  st(el, { left: 0, right: 0, top: `${m.cy}px`, width: '100%', 'font-size': `${m.size}px` });
  ctx.world.appendChild(el);
  return { cues, el, words: ctx.words || ['RUTA', 'RUMBO', 'TRAZO', 'DESTINO'], accentIndex: ctx.accentIndex ?? 2 };
}

export function update(t, ctx, m) {
  const { from, step } = m.cues;
  const total = m.words.length * step;
  if (t < from || t > from + total) { st(m.el, { opacity: 0 }); return; }
  const i = clamp(Math.floor((t - from) / step), 0, m.words.length - 1);
  const sub = (t - from - i * step) / step;
  setText(m.el, m.words[i]);
  const inP = eOutExpo(clamp(sub / 0.4));
  const outP = smoothstep(sub, 0.78, 1);
  st(m.el, {
    opacity: (1 - outP) * eOutCubic(inv(t, from, from + 0.08)),
    color: i === m.accentIndex ? ctx.palette.colors.primary : ctx.palette.colors.white,
    transform: `translateY(-50%) translateY(${(1 - inP) * 30 - outP * 22}px) scale(${1.05 - 0.05 * inP})`,
  });
}
