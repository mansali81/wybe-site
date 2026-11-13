/**
 * bump-version.mjs — cache-busting stamp for wybe.fit
 *
 * Rewrites the ?v=… query on every LOCAL stylesheet and script reference in
 * the site's .html files so a deploy is served fresh instead of sitting
 * behind the 24-hour CDN cache.
 *
 * WHY THIS EXISTS
 * ---------------
 * vercel.json serves /css/* and /js/* with `cache-control: public,
 * max-age=86400`. Without a version query a visitor who loaded the site in
 * the last 24 hours keeps the old CSS/JS even after a deploy. The .html
 * files themselves are `max-age=0, must-revalidate`, so they are always
 * re-fetched — which means the version query inside them is the thing that
 * invalidates the assets.
 *
 * WHY A CONTENT HASH, NOT A DATE
 * ------------------------------
 * This used to stamp today's date. That is wrong in both directions:
 *   - Two deploys on the SAME day share a stamp, so the second one does not
 *     bust anything. That bit us three times: a changed stylesheet shipped
 *     under a stamp returning visitors already had cached, leaving them with
 *     new HTML and a stale stylesheet.
 *   - A day with no asset changes still produces a NEW stamp, throwing away
 *     everyone's warm cache for nothing.
 * Each file is now stamped with a short hash of its own bytes, so a URL
 * changes if and only if that file's contents change — and editing
 * styles.css no longer forces a re-download of main.js.
 *
 * WHAT IT TOUCHES
 * ---------------
 * Only href=/src= attributes pointing at a local css/ or js/ file, with or
 * without a leading slash. CDN URLs, fonts, images and anything with a host
 * are left alone. A reference with no ?v= yet gets one, so a newly added
 * page is stamped on the next run rather than silently skipped.
 *
 * Run it with `npm run bump`; `npm run build:css` runs it automatically
 * after Tailwind, so the compiled CSS is hashed in its final state.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// group 1: attribute + opening quote + path   group 2: existing ?v= (optional)
const REF = /((?:href|src)="\.?\/?(css|js)\/[A-Za-z0-9._-]+\.(?:css|js))(\?v=[A-Za-z0-9._-]+)?"/g;

const hashes = new Map();
const missing = new Set();

/** Short hash of one asset's bytes, computed once per file. */
const stampFor = (ref) => {
  const rel = ref.replace(/^(?:href|src)="\.?\/?/, '');
  if (hashes.has(rel)) return hashes.get(rel);
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) {
    missing.add(rel);
    hashes.set(rel, null);
    return null;
  }
  const h = createHash('sha256').update(readFileSync(abs)).digest('hex').slice(0, 8);
  hashes.set(rel, h);
  return h;
};

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();
let changedFiles = 0;
let changedRefs = 0;
let totalRefs = 0;

for (const page of pages) {
  const path = join(ROOT, page);
  const before = readFileSync(path, 'utf8');
  const after = before.replace(REF, (whole, ref) => {
    totalRefs++;
    const stamp = stampFor(ref);
    if (stamp === null) return whole;          // asset missing: leave it alone
    const next = `${ref}?v=${stamp}"`;
    if (next !== whole) changedRefs++;
    return next;
  });
  if (after !== before) {
    writeFileSync(path, after);
    changedFiles++;
  }
}

const used = [...hashes.entries()].filter(([, h]) => h);
console.log(
  `bump-version: ${changedRefs} of ${totalRefs} references updated across `
  + `${changedFiles} of ${pages.length} pages`
);
for (const [rel, h] of used.sort()) console.log(`   ${h}  ${rel}`);
for (const rel of missing) console.log(`   MISSING, left unstamped: ${rel}`);
if (missing.size) process.exitCode = 1;
