const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
// Raised in steps: 700 (EPIC-002 R-29), 710/725 (financial trends, hand-rolled SVG charts), then 860/270 for
// UI redesign v2 (nine screens, 55 typed endpoints; docs/product/decisions/2026-10-29-ui-redesign-v2.md decision 17).
const maxTotalJsBytes = 880 * 1024;
// Total across all chunks, including lazily loaded routes. The first-load chunk is unchanged in kind;
// the budget keeps a few KiB of headroom, so check the numbers before adding code.
const maxTotalJsGzipBytes = 275 * 1024;

const formatKiB = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

if (!fs.existsSync(distAssetsDir)) {
  console.error('Bundle budget check failed: dist/assets is missing. Run npm run build first.');
  process.exit(1);
}

const jsFiles = fs.readdirSync(distAssetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(distAssetsDir, name));

if (jsFiles.length === 0) {
  console.error('Bundle budget check failed: no JavaScript assets found in dist/assets.');
  process.exit(1);
}

const totals = jsFiles.reduce(
  (accumulator, filePath) => {
    const source = fs.readFileSync(filePath);
    accumulator.raw += source.byteLength;
    accumulator.gzip += zlib.gzipSync(source).byteLength;
    return accumulator;
  },
  { raw: 0, gzip: 0 },
);

const failures = [];
if (totals.raw > maxTotalJsBytes) {
  failures.push(`raw JS ${formatKiB(totals.raw)} exceeds ${formatKiB(maxTotalJsBytes)}`);
}

if (totals.gzip > maxTotalJsGzipBytes) {
  failures.push(`gzipped JS ${formatKiB(totals.gzip)} exceeds ${formatKiB(maxTotalJsGzipBytes)}`);
}

if (failures.length) {
  console.error(`Bundle budget check failed: ${failures.join('; ')}`);
  process.exit(1);
}

console.log(
  `Bundle budget check passed: raw JS ${formatKiB(totals.raw)}, gzipped JS ${formatKiB(totals.gzip)}`,
);
