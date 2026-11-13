/**
 * bump-version.mjs — cache-busting stamp for wybe.fit
 *
 * Rewrites the ?v=YYYYMMDD query on every LOCAL stylesheet and script
 * reference in the site's .html files to today's date, so a deploy is
 * served fresh instead of sitting behind the 24-hour CDN cache.
 *
 * WHY THIS EXISTS
 * ---------------
 * vercel.json serves /css/* and /js/* with `cache-control: public,
 * max-age=86400`. Without a version query a visitor who loaded the site
 * in the last 24 hours keeps the old CSS/JS even after a deploy. The
 * .html files themselves are `max-age=0, must-revalidate`, so they are
 * always re-fetched — which means the version query inside them is the
 * thing that invalidates the assets.
 *
 * WHAT IT TOUCHES
 * ---------------
 * Only href=/src= attributes pointing at a local css/ or js/ file, with
 * or without a leading slash. CDN URLs, fonts, images and anything with
 * a host are left alone. A reference that has no ?v= yet gets one, so a
 * newly added page is stamped on the next run rather than silently
 * skipped.
 *
 * Run it with `npm run bump`; `npm run build:css` runs it automatically.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const d = new Date();
const STAMP = String(d.getFullYear())
  + String(d.getMonth() + 1).padStart(2, '0')
  + String(d.getDate()).padStart(2, '0');

// group 1: attribute + opening quote + path   group 2: existing ?v= (optional)
const REF = /((?:href|src)="\.?\/?(?:css|js)\/[A-Za-z0-9._-]+\.(?:css|js))(\?v=\d{8})?"/g;

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
let changedFiles = 0;
let changedRefs = 0;
let totalRefs = 0;

for (const page of pages) {
  const path = join(ROOT, page);
  const before = readFileSync(path, 'utf8');
  const after = before.replace(REF, (whole, ref, version) => {
    totalRefs++;
    const next = `${ref}?v=${STAMP}"`;
    if (next !== whole) changedRefs++;
    return next;
  });
  if (after !== before) {
    writeFileSync(path, after);
    changedFiles++;
  }
}

console.log(
  `bump-version: ?v=${STAMP} — ${changedRefs} of ${totalRefs} references updated `
  + `across ${changedFiles} of ${pages.length} pages`
);
