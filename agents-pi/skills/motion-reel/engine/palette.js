// Brand tokens -> both CSS custom properties and `r,g,b` triples for canvas.
const hexToRgb = (hex) => {
  const v = hex.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function createPalette(colors) {
  const rgb = {};
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) rgb[key] = hexToRgb(value).join(',');
  }
  return {
    colors,
    rgb,
    /** `rgba()` string from a token name plus alpha. */
    a: (key, alpha) => `rgba(${rgb[key]},${alpha})`,
  };
}

/** Publish the tokens as CSS custom properties so stylesheets never hardcode hex. */
export function applyCssTokens(palette, fonts) {
  const root = document.documentElement.style;
  for (const [key, value] of Object.entries(palette.colors)) {
    root.setProperty(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, value);
  }
  if (fonts?.sans) root.setProperty('--font-sans', fonts.sans);
  if (fonts?.mono) root.setProperty('--font-mono', fonts.mono);
}
