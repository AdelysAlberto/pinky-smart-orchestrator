// Engine bootstrap: turns a preset + a format into a mounted, renderable stage.
import { resolveConfig } from './config.js';
import { applyCssTokens } from './palette.js';
import { MODULES } from './modules/index.js';
import { createFx } from './fx.js';
import { prng, clamp, inv, mix, smoothstep, spike, kf, st, setText, eOutCubic, eInCubic } from './math.js';

export function boot(preset, opts = {}) {
  const cfg = resolveConfig(preset, opts);
  const { layout: L, metrics: M, palette: P } = cfg;

  /* ---------- stage sizing + tokens ---------- */
  applyCssTokens(P, preset.fonts);
  const vp = document.getElementById('viewport');
  st(document.documentElement, { width: `${cfg.w}px`, height: `${cfg.h}px` });
  st(document.body, { width: `${cfg.w}px`, height: `${cfg.h}px` });
  st(vp, { width: `${cfg.w}px`, height: `${cfg.h}px` });
  const canvas = document.getElementById('cvfx');
  st(canvas, { width: `${cfg.w}px`, height: `${cfg.h}px` });

  /* ---------- shared context handed to every module ---------- */
  const ctx = {
    ...preset,
    cfg, layout: L, metrics: M, palette: P,
    world: document.getElementById('world'),
    assetUrl: opts.assetUrl || preset.asset,
  };

  /* ---------- HUD ---------- */
  const hud = {
    corners: Array.from(document.querySelectorAll('#corners .cn')),
    secLabel: document.getElementById('secLabel'),
    secNum: document.getElementById('secNum'),
    secName: document.getElementById('secName'),
    tc: document.getElementById('tc'),
    brandMini: document.getElementById('brandMini'),
    progress: document.getElementById('progress'),
    progressFill: document.getElementById('progressFill'),
    flash: document.getElementById('flash'),
    tear: document.getElementById('tear'),
    grain: document.getElementById('grain'),
    blobs: document.getElementById('blobs'),
  };
  hud.brandMini.innerHTML = `${preset.brand.name}<i>${preset.brand.subTitle}</i>`;
  const cs = Math.round(30 * L.u);
  hud.corners.forEach((c) => st(c, { width: `${cs}px`, height: `${cs}px`, borderColor: P.a('primary', 0.42) }));
  st(hud.corners[0], { left: `${L.corner}px`, top: `${L.corner}px` });
  st(hud.corners[1], { right: `${L.corner}px`, top: `${L.corner}px` });
  st(hud.corners[2], { left: `${L.corner}px`, bottom: `${L.corner}px` });
  st(hud.corners[3], { right: `${L.corner}px`, bottom: `${L.corner}px` });
  st(hud.secLabel, { left: `${L.pad}px`, bottom: `${L.pad}px`, gap: `${Math.round(16 * L.u)}px`, fontSize: `${Math.round(15 * L.u)}px` });
  st(hud.secLabel.querySelector('i'), { width: `${Math.round(52 * L.u)}px`, height: '1px' });
  st(hud.tc, { right: `${L.pad}px`, bottom: `${L.pad}px`, fontSize: `${Math.round(15 * L.u)}px` });
  st(hud.brandMini, { right: `${L.pad}px`, top: `${L.pad}px` });

  /* ---------- bloom blobs ---------- */
  const blobs = (M.blobs || []).map((b) => {
    const el = document.createElement('div');
    el.className = 'blob';
    st(el, {
      width: `${b.s}px`, height: `${b.s}px`,
      left: `${b.x * cfg.w - b.s / 2}px`, top: `${b.y * cfg.h - b.s / 2}px`,
      background: `radial-gradient(circle,${P.a(b.c, 0.55)},${P.a(b.c, 0)} 68%)`,
    });
    hud.blobs.appendChild(el);
    return { el, alpha: b.alpha, pulse: b.pulse };
  });

  /* ---------- film grain ---------- */
  const noise = document.createElement('canvas');
  noise.width = noise.height = 512;
  {
    const nx = noise.getContext('2d');
    const img = nx.createImageData(512, 512);
    const nr = prng(9182736);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (nr() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    nx.putImageData(img, 0, 0);
    st(hud.grain, { backgroundImage: `url(${noise.toDataURL('image/png')})`, backgroundRepeat: 'repeat', backgroundSize: '256px 256px' });
  }
  const grng = prng(4242);
  const GOFF = Array.from({ length: 240 }, () => [(grng() * 512) | 0, (grng() * 512) | 0]);

  /* ---------- modules ---------- */
  const mounted = (preset.modules || Object.keys(MODULES)).map((id) => {
    const mod = MODULES[id];
    if (!mod) throw new Error(`Unknown module "${id}". Available: ${Object.keys(MODULES).join(', ')}`);
    return { id, mod, refs: mod.mount(ctx) };
  });

  /* ---------- fx ---------- */
  const fx = createFx(canvas, cfg.fxPlan, P);

  /* ---------- per-frame ---------- */
  const { camera, impacts, sections } = preset;

  function render(t) {
    // bloom
    blobs.forEach((b) => {
      const pulse = b.pulse ? mix(1.0, 1.09, 0.5 + 0.5 * Math.sin(t * 0.9)) : 1;
      st(b.el, { opacity: clamp(b.alpha(t, M)), transform: `scale(${pulse})` });
    });

    // camera
    st(ctx.world, {
      transform: `translateY(${kf(t, camera.y) * L.u}px) scale(${kf(t, camera.scale)})`,
    });

    // impacts
    const punch = 1 + (impacts.punch || []).reduce((s, [at, rise, fall, amp]) => s + spike(t, at, rise, fall, amp), 0);
    st(document.getElementById('punch'), { transform: `scale(${punch})` });

    const flash = clamp((impacts.flash || []).reduce((s, [at, rise, fall, amp]) => s + spike(t, at, rise, fall, amp), 0));
    st(hud.flash, { opacity: flash, background: t < 2 ? '#FFFFFF' : '#EAFBFF' });

    let tearOp = 0, tearTop = 50, tearH = 2;
    (impacts.tear || []).forEach(([at, y], i) => {
      const v = spike(t, at, 0.01, 0.2, 1) * (i === 3 ? 1 : 0.7);
      if (v > tearOp) { tearOp = v; tearTop = y; tearH = 2 + v * 14; }
    });
    if (impacts.sweep) {
      const [a, b] = impacts.sweep;
      if (t > a && t < b) {
        const sw = Math.sin(inv(t, a, b) * Math.PI);
        if (sw * 0.55 > tearOp) { tearOp = sw * 0.55; tearTop = mix(-4, 104, inv(t, a, b)); tearH = 2; }
      }
    }
    st(hud.tear, { opacity: tearOp, top: `${tearTop}%`, height: `${tearH}px` });

    // grain
    const gi = Math.min(239, (Math.round(t * cfg.fps) * 7) % 240);
    st(hud.grain, { backgroundPosition: `${GOFF[gi][0]}px ${GOFF[gi][1]}px`, opacity: 0.055 + (gi % 5) * 0.009 });

    // HUD
    const bootA = smoothstep(t, 0.4, 0.95);
    const breathe = 0.42 + 0.14 * Math.sin(t * 1.9);
    hud.corners.forEach((c) => st(c, { opacity: bootA * breathe }));
    st(hud.brandMini, { opacity: bootA * 0.9 });
    st(hud.progress, { opacity: smoothstep(t, 0.6, 1.05) });
    st(hud.progressFill, { width: `${(t / cfg.duration) * 100}%` });

    let si = 0;
    for (let i = 0; i < sections.length; i++) if (t >= sections[i][0]) si = i;
    const [t0, num, name] = sections[si];
    setText(hud.secNum, num);
    setText(hud.secName, name);
    st(hud.secLabel, { opacity: smoothstep(t, 0.55, 1.0), transform: `translateX(${(1 - eOutCubic(clamp(inv(t, t0, t0 + 0.34)))) * -26}px)` });

    const fr = Math.min(Math.round(t * cfg.fps), cfg.frames);
    setText(hud.tc, `00:00:${String(Math.floor(fr / cfg.fps)).padStart(2, '0')}:${String(fr % cfg.fps).padStart(2, '0')}`);

    // modules + canvas
    mounted.forEach((m) => m.mod.update(t, ctx, m.refs));
    fx.render(t, preset.layers(ctx));
  }

  const ready = Promise.all(Array.from(document.images).map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve())))
    .then(() => document.fonts.ready)
    .then(() => { render(0); window.__ready = true; });

  window.__render = render;
  window.__cfg = cfg;
  window.__ready = false;
  ready.catch((e) => { console.error(e); window.__ready = true; });
  return { cfg, ctx, render };
}

void eInCubic;
