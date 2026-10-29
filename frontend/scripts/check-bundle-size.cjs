const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
const maxTotalJsBytes = 860 * 1024;
// Total across all chunks, including lazily loaded routes. The research-desk
// redesign code-splits every page (~100 KiB gzipped on first load) at the cost
// of ~214 KiB in total. UI redesign v2 (nine screens, 55 typed endpoints; see
// docs/product/decisions/2026-10-29-ui-redesign-v2.md decision 17) raised the
// total to ~260 KiB gzipped with the first-load chunk unchanged; the budget
// keeps ~10 KiB of headroom over that.
const maxTotalJsGzipBytes = 270 * 1024;

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
