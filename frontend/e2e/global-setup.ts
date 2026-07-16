import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const BACKEND_HEALTH_URL = 'http://localhost:8080/actuator/health';

const execFileAsync = promisify(execFile);

const checkBackendHealth = async (): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(BACKEND_HEALTH_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Backend health returned HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
};

const parseDotenv = async (): Promise<Record<string, string>> => {
  try {
    const raw = await readFile('../.env', 'utf8');
    return Object.fromEntries(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), line.slice(separator + 1)];
        }),
    );
  } catch {
    return {};
  }
};

const flushIntegratedRedis = async (): Promise<void> => {
  await execFileAsync('docker', ['exec', 'finance_redis', 'redis-cli', 'FLUSHDB']);
};

const seedIntegratedDatabase = async (): Promise<void> => {
  const env = await parseDotenv();
  const dbName = env.DB_NAME || process.env.DB_NAME || 'financedb';
  const dbUser = env.DB_USERNAME || process.env.DB_USERNAME || 'finance_user';

  const sql = `
    TRUNCATE TABLE
      journal_trade_tags,
      journal_trades,
      portfolio_transactions,
      watchlist_symbols,
      watchlists,
      portfolios,
      price_history,
      assets
    RESTART IDENTITY CASCADE;

    INSERT INTO assets (symbol, name, type) VALUES
      ('AAPL', 'Apple Inc.', 'STOCK'),
      ('MSFT', 'Microsoft Corp.', 'STOCK'),
      ('DRAM', 'Global X DRAM Test Asset', 'STOCK');

    INSERT INTO price_history (asset_id, open_price, close_price, high_price, low_price, volume, price_timestamp) VALUES
      ('AAPL', 100.0000, 102.0000, 105.0000,  99.0000, 1000.0000, '2026-07-08T20:00:00Z'),
      ('AAPL', 102.0000, 108.0000, 110.0000, 101.0000, 1200.0000, '2026-07-09T20:00:00Z'),
      ('MSFT', 300.0000, 315.0000, 320.0000, 298.0000, 1800.0000, '2026-07-08T20:00:00Z'),
      ('MSFT', 315.0000, 320.0000, 325.0000, 310.0000, 2000.0000, '2026-07-09T20:00:00Z'),
      ('DRAM',  10.0000,  10.5000,  11.0000,   9.5000,  900.0000, '2026-07-09T20:00:00Z');

    INSERT INTO watchlists (user_id, name) VALUES ('default', 'Core');
    INSERT INTO watchlist_symbols (watchlist_id, symbol_order, symbol) VALUES (1, 0, 'AAPL');
    INSERT INTO portfolios (user_id, name, base_currency, is_default) VALUES ('default', 'Default', 'USD', true);
  `;

  await execFileAsync('docker', [
    'exec',
    '-i',
    'finance_postgres',
    'psql',
    '-U',
    dbUser,
    '-d',
    dbName,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    sql,
  ]);
};

export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_INTEGRATED !== 'true') {
    console.log('[e2e] Integrated backend smoke disabled. Set E2E_INTEGRATED=true to require backend health.');
    return;
  }

  try {
    await checkBackendHealth();
    await seedIntegratedDatabase();
    await flushIntegratedRedis();
    console.log(`[e2e] Backend health check passed: ${BACKEND_HEALTH_URL}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[e2e] E2E_INTEGRATED=true but setup failed: ${message}`, { cause: error });
  }
}
