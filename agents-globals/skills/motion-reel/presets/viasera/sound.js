// Preset sound design for the Viasera reel. Cuts are locked to preset.impacts.
// Build: node reel.mjs --sound   (engine writes the WAV and muxes it onto the master)
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Hits are authored to land exactly on the cut frames. */
const HITS = [
  { at: 0.07, amp: 0.85, f0: 185, f1: 40, tau: 0.42, tick: 0.30 },
  { at: 4.20, amp: 0.55, f0: 150, f1: 50, tau: 0.34, tick: 0.24 },
  { at: 6.60, amp: 0.50, f0: 142, f1: 52, tau: 0.32, tick: 0.22 },
  { at: 9.20, amp: 0.78, f0: 168, f1: 44, tau: 0.44, tick: 0.30 },
  { at: 10.82, amp: 1.00, f0: 205, f1: 36, tau: 0.62, tick: 0.34 },
  { at: 12.00, amp: 0.46, f0: 128, f1: 48, tau: 0.40, tick: 0.18 },
];

export const loudness = { I: -15, TP: -1.0, LRA: 11 };

export function design(tr) {
  const DUR = tr.duration;

  // asphalt drone
  const drone = [46.5, 69.75, 93, 139.5, 186];
  const damp = [1, 0.5, 0.26, 0.12, 0.05];
  drone.forEach((f, k) => tr.tone(0, DUR, () => f, (u) => {
    const fade = clamp(u / 0.06, 0, 1) * clamp((1 - u) / 0.05, 0, 1);
    const am = 1 - 0.22 * (0.5 + 0.5 * Math.sin(TAU * 0.11 * u * DUR + k));
    return fade * am * 0.085 * damp[k];
  }));

  // impacts: pitch-dropping sine + noise transient
  HITS.forEach((h) => {
    tr.tone(h.at, h.tau * 4, (u, t) => h.f1 + (h.f0 - h.f1) * Math.exp(-t / 0.055),
      (u, t) => h.amp * Math.exp(-t / h.tau) * clamp(t / 0.004, 0, 1));
    tr.noise(h.at, 0.09, (t) => h.tick * Math.exp(-t / 0.022));
  });

  // risers into the three structural cuts
  [[3.55, 4.20], [8.30, 9.20], [11.10, 12.00]].forEach(([a, b]) => {
    const d = b - a;
    tr.tone(a, d, (u) => 240 * Math.pow(7.6, u * u), (u) => 0.085 * Math.pow(u, 2.2) * (1 - u * 0.15), -0.2);
    tr.tone(a, d, (u) => 241 * Math.pow(7.6, u * u) * 1.5, (u) => 0.04 * Math.pow(u, 3), 0.25);
  });

  // assembly shimmer resolving into a bright bell
  tr.tone(9.45, 1.37, (u) => 300 + 1150 * u * u, (u) => 0.05 * u);
  [1046.5, 1568.0, 2093.0].forEach((f, i) => {
    tr.tone(10.82, 1.6, () => f * 1.002, (t) => (0.12 / (i + 1)) * Math.exp(-t / 0.7) * clamp(t / 0.002, 0, 1));
  });

  // quiet pad under the kinetic type
  [233.08, 349.23, 466.16].forEach((f, i) => tr.tone(4.35, 2.1, () => f, (u, t) => {
    const e = clamp(t / 0.5, 0, 1) * clamp((2.1 - t) / 0.7, 0, 1);
    return (e * 0.035) / (i + 1);
  }, i === 1 ? 0.3 : -0.3));

  // telemetry blips
  [6.85, 7.05, 7.25, 7.48, 7.72, 7.98, 8.24].forEach((t, i) => {
    tr.tone(t, 0.09, () => 880 + i * 120, (tt) => 0.04 * Math.exp(-tt / 0.03), i % 2 ? 0.5 : -0.5);
  });

  // warm rear cover chord
  [[110, -0.4], [164.81, 0.4], [220, -0.3], [277.18, 0.3]].forEach(([f, p]) => {
    tr.tone(12.0, 3.0, () => f, (u, t) => clamp(t / 0.9, 0, 1) * clamp((3.0 - t) / 0.9, 0, 1) * 0.075, p);
  });

  tr.lowpass(0, DUR, 5200);
  tr.noise(0.4, 14.2, (t) => 0.011 * (0.55 + 0.45 * Math.sin(TAU * 0.07 * t)) * clamp(t / 1.2, 0, 1));
  tr.highpass(0.4, 14.6, 4200);
  tr.normalize(0.89);
  return tr;
}
