// Sound-synthesis primitives. Pure DSP over two Float32 buffers — no audio assets.
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const panGains = (pan) => [Math.cos((pan + 1) * Math.PI / 4), Math.sin((pan + 1) * Math.PI / 4)];

export function createTrack(duration, sampleRate = 48000) {
  const N = Math.round(duration * sampleRate);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const idx = (t) => clamp(Math.round(t * sampleRate), 0, N);

  /** Pitched voice. `freqAt(u, t)` and `ampAt(u, t)` are envelopes in [0,1] / seconds. */
  function tone(t0, dur, freqAt, ampAt, pan = 0) {
    const i0 = idx(t0), i1 = idx(t0 + dur);
    const [gl, gr] = panGains(pan);
    let phase = 0;
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / sampleRate, u = t / dur;
      phase += (TAU * freqAt(u, t)) / sampleRate;
      const v = Math.sin(phase) * ampAt(u, t);
      L[i] += v * gl; R[i] += v * gr;
    }
  }

  /** Deterministic white noise burst. */
  function noise(t0, dur, ampAt, pan = 0) {
    const i0 = idx(t0), i1 = idx(t0 + dur);
    if (i1 <= i0) return;
    const [gl, gr] = panGains(pan);
    let s = (0x9e3779b9 ^ i0) | 0;
    for (let i = i0; i < i1; i++) {
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s |= 0;
      const w = ((s >>> 0) / 4294967296) * 2 - 1;
      const a = ampAt((i - i0) / sampleRate);
      L[i] += w * a * gl; R[i] += w * a * gr;
    }
  }

  const onePole = (t0, t1, cutoff, high) => {
    const i0 = idx(t0), i1 = idx(t1);
    const a = clamp(1 - Math.exp((-TAU * cutoff) / sampleRate), 0, 1);
    let zl = 0, zr = 0;
    for (let i = i0; i < i1; i++) {
      zl += a * (L[i] - zl); zr += a * (R[i] - zr);
      if (high) { L[i] -= zl; R[i] -= zr; } else { L[i] = zl; R[i] = zr; }
    }
  };
  const lowpass = (t0, t1, cutoff) => onePole(t0, t1, cutoff, false);
  const highpass = (t0, t1, cutoff) => onePole(t0, t1, cutoff, true);

  function normalize(peak = 0.89) {
    let max = 0;
    for (let i = 0; i < N; i++) max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
    const g = peak / (max || 1);
    for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
    return max;
  }

  /** 16-bit PCM stereo WAV. */
  function toWav() {
    const bytes = 44 + N * 4;
    const buf = Buffer.alloc(bytes);
    buf.write('RIFF', 0); buf.writeUInt32LE(bytes - 8, 4); buf.write('WAVE', 8);
    buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
    buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 4, 28);
    buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
    buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
    let o = 44;
    for (let i = 0; i < N; i++) {
      buf.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), o); o += 2;
      buf.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), o); o += 2;
    }
    return buf;
  }

  return { L, R, N, sampleRate, duration, tone, noise, lowpass, highpass, normalize, toWav };
}
