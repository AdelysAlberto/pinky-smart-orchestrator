// Format-agnostic frame primitives. The engine only knows about a frame; the preset
// decides where things sit inside it.
export function createLayout(w, h) {
  const portrait = h > w;
  const u = Math.min(w, h) / 1080;          // design unit: 1.0 on a 1080 short side
  const pad = Math.round(96 * u);           // HUD text inset
  const corner = Math.round(64 * u);        // corner bracket inset
  return {
    w, h, portrait, u, pad, corner,
    aspect: w / h,
    cx: Math.round(w / 2),
    cy: Math.round(h / 2),
    /** Vanishing point of the road plane, as a fraction of height. */
    horizon: Math.round(h * (portrait ? 0.40 : 0.545)),
    /** Usable inner box, clear of the HUD. */
    safe: { x: pad, y: Math.round(h * (portrait ? 0.08 : 0.10)), w: w - pad * 2, h: Math.round(h * (portrait ? 0.80 : 0.78)) },
  };
}

/** Shrink `size` until `chars` em-fits inside `maxWidth`. */
export const fitFont = (size, emPerChar, chars, maxWidth) =>
  Math.min(size, maxWidth / (emPerChar * chars));
