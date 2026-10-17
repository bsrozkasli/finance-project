import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Playwright runs with the frontend package as cwd (same approach as src/test/contractFixtures.ts).
const fixturesDir = resolve(process.cwd(), '..', 'docs', 'contracts', 'fixtures');

export const loadContractFixture = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8'));
