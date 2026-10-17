import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Vitest runs with the frontend package as cwd; under jsdom import.meta.url is not a file: URL.
const fixturesDir = resolve(process.cwd(), '..', 'docs', 'contracts', 'fixtures');

export const loadContractFixture = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8'));
