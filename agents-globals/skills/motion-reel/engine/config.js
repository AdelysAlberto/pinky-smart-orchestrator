// Resolves a preset + requested format into everything the stage needs.
// Single source of truth for duration, fps, frame size, layout, metrics and palette.
import { createLayout } from './layout.js';
import { createPalette } from './palette.js';

export const FORMATS = {
  '16x9': { w: 1920, h: 1080 },
  '9x16': { w: 1080, h: 1920 },
};

export function resolveConfig(preset, opts = {}) {
  const formatId = FORMATS[opts.format] ? opts.format : preset.defaultFormat || '16x9';
  const fmt = FORMATS[formatId];
  const layout = createLayout(fmt.w, fmt.h);
  const metrics = preset.metrics(layout, preset);
  const palette = createPalette(preset.brand.colors);
  const fps = opts.fps ?? preset.fps ?? 60;
  return {
    preset,
    formatId,
    w: fmt.w,
    h: fmt.h,
    fps,
    dsf: opts.dsf ?? 2,
    duration: preset.duration,
    frames: Math.round(preset.duration * fps),
    layout,
    metrics,
    palette,
    fxPlan: preset.fxPlan(layout, metrics),
  };
}
