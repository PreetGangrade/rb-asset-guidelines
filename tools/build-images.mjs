#!/usr/bin/env node
/* ============================================================
   build-images.mjs — responsive image pipeline ("drop-in CMS")

   Usage:
     1. Drop high-res masters into assets/src/, named after the
        image slot they replace (extension doesn't matter):
          assets/src/ex-rbtv-1.png  ->  replaces ex-rbtv-1
     2. node tools/build-images.mjs        (or: npm run images)

   For every master it:
     - generates a ladder of WebP variants (quality 82) in
       assets/img/, sized for the site's scaled 1440px stage
       (max stage scale 1.78 on 2560px screens) x 2 retina
     - never upscales past the master's own width
     - rewrites every matching <img> in index.html with
       src / srcset / sizes (+ lazy loading below the fold)

   Images without a master in assets/src/ are left untouched.
   Re-running is safe: already-patched tags are re-matched.
   ============================================================ */

import sharp from 'sharp';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets', 'src');
const OUT = join(ROOT, 'assets', 'img');
const HTML = join(ROOT, 'index.html');

const QUALITY = 82;
const MAX_STAGE_SCALE = 1.78; // --hs cap: min(2560/1440, ...) in main.js
const RETINA = 2;

/* authored width of each slot in the 1440px design stage (CSS px at --hs:1),
   measured from the live layout. 'eager' = above the fold, skip lazy-loading. */
const SLOTS = {
  'tv-console':        { stage: 1338, eager: true },
  'hero-screen-rbtv':  { stage: 675,  eager: true },
  'hero-screen-stv':   { stage: 675,  eager: true },
  'hero-screen-rally': { stage: 675,  eager: true },
  'truth-underline-1': { stage: 243 },
  'truth-underline-2': { stage: 243 },
  /* focal demo stage: 1071x576 container (also reused in examples cards) */
  'stage-rbtv':        { stage: 1071 },
  'stage-stv':         { stage: 1071 },
  'stage-rally':       { stage: 1071 },
  'tv-screen-rbtv':    { stage: 1098, eager: true },
  'tv-screen-stv':     { stage: 1098, eager: true },
  'tv-screen-rally':   { stage: 1098, eager: true },
  'laptop-rbtv':       { stage: 560, eager: true },
  'laptop-stv':        { stage: 560, eager: true },
  'laptop-rally':      { stage: 560, eager: true },
  'tablet-rbtv':       { stage: 280, eager: true },
  'tablet-stv':        { stage: 280, eager: true },
  'tablet-rally':      { stage: 280, eager: true },
  'phone-rbtv':        { stage: 135, eager: true },
  'phone-stv':         { stage: 135, eager: true },
  'phone-rally':       { stage: 135, eager: true },
  'uba-frame-servus':  { stage: 560 },
  'uba-phone-rally':   { stage: 197 },
  'uba-tablet-bike':   { stage: 428 },
  'uba-tablet-padel':  { stage: 428 },
  'uba-tablet-top':    { stage: 428 },
  'uba-card-rbtv':     { stage: 56 },
  'uba-card-stv':      { stage: 56 },
  'uba-card-rally':    { stage: 56 },
  /* examples cards: fixed 16:9 container, 960x540 in the 1440 stage */
  'ex-rbtv-1':         { stage: 960 },
  'ex-rbtv-2':         { stage: 960 },
  'ex-rbtv-3':         { stage: 960 },
  'ex-rbtv-4':         { stage: 960 },
  'ex-rbtv-5':         { stage: 960 },
  'ex-rbtv-6':         { stage: 960 },
  'ex-stv-1':          { stage: 960 },
  'ex-stv-2':          { stage: 960 },
  'ex-stv-3':          { stage: 960 },
  'ex-stv-4':          { stage: 960 },
  'ex-stv-5':          { stage: 960 },
  'ex-stv-6':          { stage: 960 },
  'ex-rally-1':        { stage: 960 },
  'ex-rally-2':        { stage: 960 },
  'ex-rally-3':        { stage: 960 },
  'ex-rally-4':        { stage: 960 },
  'ex-rally-5':        { stage: 960 },
  'ex-rally-6':        { stage: 960 },
  'example-4':         { stage: 1200 },
  'example-5':         { stage: 1200 },
  'example-6':         { stage: 1200 },
};
const DEFAULT_STAGE = 1200; // for new slots not listed above

function ladder(stage, masterW) {
  const maxNeeded = Math.ceil(stage * MAX_STAGE_SCALE * RETINA); // biggest paint possible
  const steps = [1, 1.5, 2, 2.7, MAX_STAGE_SCALE * RETINA];
  const widths = steps
    .map(m => Math.min(Math.round(stage * m / 10) * 10, masterW, maxNeeded))
    .filter((w, i, a) => a.indexOf(w) === i && w >= 100)
    .sort((a, b) => a - b);
  return widths.length ? widths : [Math.min(masterW, maxNeeded)];
}

if (!existsSync(SRC)) mkdirSync(SRC, { recursive: true });
const masters = readdirSync(SRC).filter(f => /\.(png|jpe?g|webp|tiff?|avif)$/i.test(f));
if (!masters.length) {
  console.log('No masters found in assets/src/ — drop high-res images there (named after the slot they replace) and re-run.');
  process.exit(0);
}

let html = readFileSync(HTML, 'utf8');
const report = [];

for (const file of masters) {
  const slug = parse(file).name;
  const slot = SLOTS[slug] || { stage: DEFAULT_STAGE };
  const master = sharp(join(SRC, file), { limitInputPixels: false });
  const meta = await master.metadata();

  const widths = ladder(slot.stage, meta.width);
  const maxNeeded = Math.ceil(slot.stage * MAX_STAGE_SCALE * RETINA);
  if (meta.width < maxNeeded) {
    console.warn(`⚠ ${file}: master is ${meta.width}px wide, ideal is ${maxNeeded}px — using what's there (no upscaling).`);
  }

  for (const w of widths) {
    const out = join(OUT, `${slug}-${w}.webp`);
    await sharp(join(SRC, file), { limitInputPixels: false })
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out);
  }

  /* fallback src: ~1.5x of authored size (sharp on normal screens, modest weight) */
  const fallbackW = widths.reduce((best, w) => (Math.abs(w - slot.stage * 1.5) < Math.abs(best - slot.stage * 1.5) ? w : best), widths[0]);
  const srcset = widths.map(w => `assets/img/${slug}-${w}.webp ${w}w`).join(', ');
  const pct = Math.round((slot.stage / 1440) * 1000) / 10;
  const sizes = `(min-width: 2560px) ${Math.round(slot.stage * MAX_STAGE_SCALE)}px, ${pct}vw`;

  /* rewrite every <img> pointing at this slot (original file or an earlier variant) */
  const tagRe = new RegExp(`<img\\b[^>]*\\bsrc="assets/img/${slug}(?:-\\d+)?\\.(?:png|jpe?g|webp)"[^>]*>`, 'g');
  let count = 0;
  html = html.replace(tagRe, tag => {
    count++;
    let t = tag
      .replace(/\s+(srcset|sizes|loading|decoding)="[^"]*"/g, '')
      .replace(/\bsrc="[^"]*"/, `src="assets/img/${slug}-${fallbackW}.webp" srcset="${srcset}" sizes="${sizes}"`);
    const extras = ` decoding="async"${slot.eager ? '' : ' loading="lazy"'}`;
    t = t.replace(/\s*\/?>$/, m => `${extras}${m}`);
    return t;
  });

  report.push({ slug, master: `${meta.width}x${meta.height}`, variants: widths.join('/'), tags: count });
}

writeFileSync(HTML, html);

console.log('\nDone:\n');
for (const r of report) {
  console.log(`  ${r.slug}  master ${r.master}  ->  widths ${r.variants}  (${r.tags} <img> tag${r.tags === 1 ? '' : 's'} updated)`);
}
console.log('\nPreview locally, then commit & push to publish.');
