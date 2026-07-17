const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.cwd();
const apiDir = path.join(projectRoot, 'src', 'api');
const clientPath = path.join(apiDir, 'client.ts');
const httpPath = path.join(apiDir, 'http.ts');

const expectedBarrelExports = [
  'http',
  'errors',
  'assets',
  'journal',
  'market',
  'news',
  'portfolio',
  'research',
  'watchlists',
];

const fail = (message) => {
  console.error(`Frontend API boundary check failed: ${message}`);
  process.exitCode = 1;
};

const read = (filePath) => fs.readFileSync(filePath, 'utf8');

const listTypeScriptFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
  .map((name) => path.join(dir, name));

if (!fs.existsSync(clientPath)) {
  fail('src/api/client.ts is missing');
} else {
  const clientSource = read(clientPath);
  const executableLines = clientSource
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of executableLines) {
    if (!line.startsWith('export ')) {
      fail(`client.ts must remain export-only, found: ${line}`);
    }
  }

  for (const moduleName of expectedBarrelExports) {
    const exportLine = `export * from './${moduleName}';`;
    const namedHttpExport = moduleName === 'http' && clientSource.includes("export { apiClient } from './http';");
    if (!clientSource.includes(exportLine) && !namedHttpExport) {
      fail(`client.ts must export ${moduleName}`);
    }
  }
}

if (!fs.existsSync(httpPath)) {
  fail('src/api/http.ts is missing');
} else {
  const httpSource = read(httpPath);
  if (!httpSource.includes("baseURL: 'http://localhost:8080/api/v1'")) {
    fail('http.ts must own the fixed Spring API base URL');
  }
}

for (const filePath of listTypeScriptFiles(apiDir)) {
  const relative = path.relative(projectRoot, filePath).replace(/\\/g, '/');
  const source = read(filePath);
  const fileName = path.basename(filePath);

  if (fileName !== 'http.ts' && /from\s+['"]axios['"]/.test(source)) {
    fail(`${relative} must not import Axios directly`);
  }

  if (fileName !== 'client.ts' && /from\s+['"]\.\/client['"]/.test(source)) {
    fail(`${relative} must not import the compatibility barrel`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log('Frontend API boundary check passed');
