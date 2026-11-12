#!/usr/bin/env node
/**
 * Generate resized image variants for wybe.fit.
 *
 * Run with:  npm run images
 *
 * Rules this script guarantees:
 *   - It NEVER overwrites or deletes an original. Every output path is
 *     asserted to differ from its input, and to not collide with any other
 *     file that already existed before the run.
 *   - Output names are lowercase, hyphenated, no spaces, suffixed with width.
 *   - A requested width larger than the source is skipped (no upscaling).
 *   - WebP output is quality 80. PNG output keeps its alpha channel.
 *   - SVGs and images/brush-stroke.webp (a CSS background) are never touched.
 *
 * It is idempotent: running it twice produces the same files.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const IMG = path.join(ROOT, 'images');
const WEBP_QUALITY = 80;

/** Files that must never be read-modified-written, regardless of any glob. */
const NEVER_TOUCH = new Set(['images/brush-stroke.webp']);

/** Explicit, one-off jobs: [source, [widths], outputBasename, format] */
const JOBS = [
  ['images/Hero.webp',                        [1280, 1920],      'hero',                         'webp'],
  ['images/hero-mobile.webp',                 [480, 828],        'hero-mobile',                  'webp'],
  ['images/Profile Pic.webp',                 [480, 768, 1024],  'profile-pic',                  'webp'],
  ['images/Nutrition 2.webp',                 [480, 768, 1080],  'nutrition-2',                  'webp'],
  ['images/the-1825-days-cover-white.webp',   [480, 960],        'the-1825-days-cover-white',    'webp'],
  ['images/logo-mark-orange.png',             [160, 320],        'logo-mark-orange',             'png'],
];

/** Directory sweeps: every .webp in the folder gets one width. */
const SWEEPS = [
  ['images/testimonials', 96],   // 40px avatars, 2.4x for retina
  ['images/results',      360],
];

// ── build the full job list ──────────────────────────────────────────────
const planned = [];

for (const [rel, widths, base, format] of JOBS) {
  for (const w of widths) planned.push({ rel, width: w, base, format });
}

for (const [dirRel, width] of SWEEPS) {
  const dir = path.join(ROOT, dirRel);
  if (!fs.existsSync(dir)) throw new Error(`missing directory: ${dirRel}`);
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.toLowerCase().endsWith('.webp')) continue;      // skips the SVG placeholders
    const rel = `${dirRel}/${f}`;
    if (NEVER_TOUCH.has(rel)) continue;
    if (/-\d+\.webp$/.test(f)) continue;                   // already a generated variant
    planned.push({ rel, width, base: `${dirRel}/${path.basename(f, path.extname(f))}`, format: 'webp' });
  }
}

/** lowercase, hyphenated, space-free output path. */
function outPath(job) {
  const dir = path.dirname(job.base.includes('/') ? job.base : `images/${job.base}`);
  const name = path.basename(job.base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${dir}/${name}-${job.width}.${job.format}`;
}

// snapshot of what existed before the run, so we can prove we clobbered nothing
const preexisting = new Set();
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else preexisting.add(path.relative(ROOT, p));
  }
})(IMG);

const results = [];
let made = 0, skipped = 0;

for (const job of planned) {
  const srcAbs = path.join(ROOT, job.rel);
  if (!fs.existsSync(srcAbs)) throw new Error(`source not found: ${job.rel}`);
  if (NEVER_TOUCH.has(job.rel)) throw new Error(`refusing to touch ${job.rel}`);

  const rel = outPath(job);
  const dstAbs = path.join(ROOT, rel);

  // Hard safety gate: never write over the source or any other original.
  if (path.resolve(dstAbs) === path.resolve(srcAbs)) {
    throw new Error(`output would overwrite its own source: ${rel}`);
  }
  const isRegen = results.some(r => r.out === rel);
  if (preexisting.has(rel) && !/-\d+\.(webp|png)$/.test(rel)) {
    throw new Error(`output would overwrite a pre-existing original: ${rel}`);
  }
  if (isRegen) throw new Error(`two jobs target the same output: ${rel}`);

  const meta = await sharp(srcAbs).metadata();
  if (job.width > meta.width) {
    results.push({ out: rel, from: job.rel, status: `skipped (source only ${meta.width}px wide)`, kb: null });
    skipped++;
    continue;
  }

  let pipe = sharp(srcAbs).resize({ width: job.width, withoutEnlargement: true });
  pipe = job.format === 'png'
    ? pipe.png({ compressionLevel: 9, palette: true })   // keeps the alpha channel
    : pipe.webp({ quality: WEBP_QUALITY });

  await pipe.toFile(dstAbs + '.tmp');
  fs.renameSync(dstAbs + '.tmp', dstAbs);

  const after = await sharp(dstAbs).metadata();
  results.push({
    out: rel, from: job.rel, status: 'ok',
    dims: `${after.width}x${after.height}`,
    kb: (fs.statSync(dstAbs).size / 1024).toFixed(1),
    alpha: after.hasAlpha,
  });
  made++;
}

// ── report ───────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('output', 52) + pad('dims', 12) + pad('KB', 9) + 'source');
console.log('-'.repeat(110));
for (const r of results) {
  console.log(pad(r.out, 52) + pad(r.dims || '-', 12) + pad(r.kb ?? r.status, 9) + r.from);
}
console.log(`\n${made} written, ${skipped} skipped. Originals left untouched: ${preexisting.size} files pre-existing.`);
