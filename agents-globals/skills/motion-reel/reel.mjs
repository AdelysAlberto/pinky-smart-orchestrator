#!/usr/bin/env node
/**
 * Motion Reel builder — deterministic HTML/Canvas -> MP4.
 *
 *   node reel.mjs --preset viasera                       16:9 master with sound
 *   node reel.mjs --preset viasera --formats 16x9,9x16   both masters
 *   node reel.mjs --preset viasera --format 9x16         vertical only
 *   node reel.mjs --preset viasera --sheet               4x4 contact sheet (QA, fast)
 *   node reel.mjs --preset viasera --at 4.2,10.8         single full-res frames
 *   node reel.mjs --preset viasera --dsf 1               fast iteration render
 *
 * Flags: --out <dir>  --no-sound  --no-encode  --keep-frames  --from <s>  --to <s>
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, stat, readdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import puppeteer from 'puppeteer-core';

const SKILL = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const has = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const num = (n, d) => Number(opt(n, d));

const SHEET = has('--sheet');
const AT = opt('--at', null);
const PRESET = opt('--preset', 'viasera');
const FORMATS = String(opt('--formats', opt('--format', ''))).split(',').filter(Boolean);
const DSF = num('--dsf', SHEET ? 0.5 : 2);
const OUT = resolve(process.cwd(), opt('--out', 'motion-out'));
const WANT_SOUND = !has('--no-sound');
const NO_ENCODE = has('--no-encode');
const KEEP = has('--keep-frames');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = join(homedir(), '.cache', 'puppeteer', 'chrome');
  if (existsSync(base)) {
    for (const v of (process.env.CHROME_VERSIONS || '149.0.7827.22,145.0.7632.46,131.0.6778.204').split(',')) {
      const p = join(base, `mac_arm-${v}`, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
      if (existsSync(p)) return p;
    }
  }
  for (const p of ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) if (existsSync(p)) return p;
  throw new Error('No Chrome found. Set CHROME=/path/to/chrome');
}

function serve(root) {
  const template = readFileSync(join(root, 'engine', 'template.html'), 'utf8');
  const server = createServer(async (req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    try {
      if (url === '/' || url === '/index.html') {
        const [presetId, format] = String(req.headers['x-bootstrap'] || '').split('|');
        res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'no-store' })
          .end(template.replace('<!--ENTRY-->', entryScript(presetId, format)));
        return;
      }
      if (url === '/favicon.ico') { res.writeHead(204).end(); return; }
      const file = resolve(root, '.' + url);
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      const body = readFileSync(file);   // read before writeHead so a miss still 404s cleanly
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(404).end('not found'); }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const entryScript = (preset, format) => `<script type="module">
import { boot } from '/engine/boot.js';
import preset from '/presets/${preset}/preset.js';
boot(preset, { format: '${format}' });
</script>`;

function ff(args) {
  return new Promise((ok, bad) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (c) => (c === 0 ? ok() : bad(new Error(`ffmpeg exit ${c}\n${err.slice(-1800)}`))));
  });
}

async function buildFormat(browser, server, preset, format, presetMod) {
  const { w, h } = FORMATS_TABLE[format];
  const fps = presetMod.fps || 60;
  const duration = presetMod.duration || 15;
  const tag = `${preset}-${format}`;
  const framesDir = join(OUT, `.frames-${tag}`);
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  page.on('pageerror', (e) => console.error('  [pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('  [console]', m.text()); });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: DSF });
  await page.setExtraHTTPHeaders({ 'x-bootstrap': `${preset}|${format}` });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__ready === true');
  console.log(`  preset=${preset} format=${format} ${w}x${h}@${fps} dsf=${DSF}`);

  const times = [];
  if (AT) times.push(...String(AT).split(',').map(Number));
  else if (SHEET) { for (let i = 0; i < 16; i++) times.push(((i + 0.5) / 16) * duration); }
  else { for (let f = Math.round(num('--from', 0) * fps); f < Math.round(num('--to', duration) * fps); f++) times.push(f / fps); }

  const started = Date.now();
  for (let i = 0; i < times.length; i++) {
    await page.evaluate((t) => window.__render(t), times[i]);
    await writeFile(join(framesDir, `f${String(i).padStart(5, '0')}.png`),
      await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } }));
    if (!SHEET && !AT && (i % 60 === 0 || i === times.length - 1)) {
      console.log(`  frame ${i + 1}/${times.length} t=${times[i].toFixed(2)}s ${(Date.now() - started) / 1000 | 0}s`);
    }
  }
  await page.close();

  if (SHEET) {
    const out = join(OUT, `${tag}-sheet.jpg`);
    await ff(['-y', '-framerate', '1', '-i', join(framesDir, 'f%05d.png'),
      '-filter_complex', 'tile=4x4:margin=8:padding=8:color=0x0b0b0b', '-frames:v', '1', '-q:v', '3', out]);
    console.log(`  -> ${out}`);
    await rm(framesDir, { recursive: true, force: true });
    return out;
  }
  if (AT) { console.log(`  -> ${framesDir} (${times.join(', ')})`); return framesDir; }
  if (NO_ENCODE) { console.log(`  frames -> ${framesDir}`); return framesDir; }

  const silent = join(OUT, `${tag}-silent.mp4`);
  await ff(['-y', '-framerate', String(fps), '-i', join(framesDir, 'f%05d.png'),
    '-vf', `scale=${w}:${h}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-level', '4.2',
    '-x264-params', 'bframes=3:ref=4:me=umh:subme=8:aq-mode=3', '-movflags', '+faststart', silent]);

  const wav = join(OUT, `${tag}-sound.wav`);
  let master = silent;
  if (WANT_SOUND && existsSync(wav)) {
    master = join(OUT, `${tag}.mp4`);
    await ff(['-y', '-i', silent, '-i', wav, '-af', `loudnorm=I=${presetMod.loudness?.I ?? -15}:TP=${presetMod.loudness?.TP ?? -1}:LRA=${presetMod.loudness?.LRA ?? 11}`,
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', master]);
  }
  await ff(['-y', '-ss', String(duration * 0.9), '-i', master, '-frames:v', '1', '-q:v', '2', join(OUT, `${tag}-poster.jpg`)]);
  if (!KEEP) await rm(framesDir, { recursive: true, force: true });
  const s = await stat(master);
  console.log(`  -> ${master} (${(s.size / 1048576).toFixed(1)} MB)`);
  return master;
}

const FORMATS_TABLE = { '16x9': { w: 1920, h: 1080 }, '9x16': { w: 1080, h: 1920 } };

async function main() {
  const presetPath = join(SKILL, 'presets', PRESET, 'preset.js');
  if (!existsSync(presetPath)) {
    const available = (await readdir(join(SKILL, 'presets'), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    throw new Error(`Unknown preset "${PRESET}". Available: ${available.join(', ')}`);
  }
  const presetMod = (await import(pathToFileURL(presetPath).href)).default;
  const formats = FORMATS.length ? FORMATS : [presetMod.defaultFormat || '16x9'];

  await mkdir(OUT, { recursive: true });

  if (WANT_SOUND) {
    const soundPath = join(SKILL, 'presets', PRESET, 'sound.js');
    if (existsSync(soundPath)) {
      const { createTrack } = await import(pathToFileURL(join(SKILL, 'engine', 'synth.js')).href);
      const mod = await import(pathToFileURL(soundPath).href);
      for (const format of formats) {
        const tr = createTrack(presetMod.duration);
        mod.design(tr);
        const wav = join(OUT, `${PRESET}-${format}-sound.wav`);
        await writeFile(wav, tr.toWav());
        console.log(`  sound -> ${wav}`);
      }
    }
  }

  const server = await serve(SKILL);
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none',
      '--disable-lcd-text', '--disable-dev-shm-usage', '--mute-audio'],
  });
  for (const format of formats) await buildFormat(browser, server, PRESET, format, presetMod);
  await browser.close();
  server.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
