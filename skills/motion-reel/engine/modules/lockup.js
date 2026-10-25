// Module: the final lockup — logo asset, masked specular sweep, tagline, rule, credit.
import { clamp, inv, mix, smoothstep, eOutCubic, eInOutCubic, st, setText } from '../math.js';

export const defaultCues = {
  in: [12.0, 12.34], scale: [12.0, 12.95], shine: [12.58, 13.4],
  tag: [12.96, 13.56], rule: [13.42, 13.96], credit: [13.72, 14.16],
};

export function mount(ctx) {
  const cues = { ...defaultCues, ...(ctx.cues?.lockup || {}) };
  const L = ctx.metrics.lock;
  const lock = document.createElement('div');
  lock.id = 'lock';

  const mark = document.createElement('div');
  mark.className = 'lockmark';
  st(mark, { top: `${L.cy}px`, width: `${L.w}px`, height: `${(L.w * L.ratio).toFixed(2)}px` });
  const img = document.createElement('img');
  img.src = ctx.assetUrl;
  img.alt = ctx.brand.name;
  const shine = document.createElement('div');
  shine.className = 'lockshine';
  shine.style.webkitMaskImage = `url(${ctx.assetUrl})`;
  shine.style.maskImage = `url(${ctx.assetUrl})`;
  mark.append(img, shine);

  const tag = document.createElement('div');
  tag.className = 'locktag';
  st(tag, { top: `${ctx.metrics.tag.cy}px`, 'font-size': `${ctx.metrics.tag.size}px` });
  tag.textContent = ctx.tagline || '';

  const rule = document.createElement('div');
  rule.className = 'lockrule';
  st(rule, { top: `${ctx.metrics.rule.cy}px` });

  const credit = document.createElement('div');
  credit.className = 'lockcredit';
  st(credit, { top: `${ctx.metrics.credit.cy}px`, 'font-size': `${ctx.metrics.credit.size}px` });
  credit.textContent = ctx.credit || '';

  lock.append(mark, tag, rule, credit);
  ctx.world.appendChild(lock);
  return { cues, lock, mark, shine, tag, rule, credit, ruleW: ctx.metrics.rule.w };
}

export function update(t, ctx, m) {
  const c = m.cues;
  const inA = smoothstep(t, c.in[0], c.in[1]);
  st(m.lock, { opacity: inA });
  if (inA <= 0) return;

  st(m.mark, { transform: `translate(-50%,-50%) scale(${mix(0.965, 1, eOutCubic(inv(t, c.scale[0], c.scale[1])))})` });

  const sp = inv(t, c.shine[0], c.shine[1]);
  st(m.shine, {
    opacity: sp > 0 && sp < 1 ? Math.sin(sp * Math.PI) * 0.85 : 0,
    backgroundPosition: `${mix(-15, 115, eInOutCubic(sp))}% 0`,
  });

  const tp = inv(t, c.tag[0], c.tag[1]);
  st(m.tag, { opacity: tp, transform: `translateY(${(1 - eOutCubic(tp)) * 16}px)` });
  st(m.rule, { width: `${m.ruleW * eOutCubic(inv(t, c.rule[0], c.rule[1]))}px` });
  st(m.credit, { opacity: inv(t, c.credit[0], c.credit[1]) });
  void clamp; void setText;
}
