const BACKEND_HEALTH_URL = 'http://localhost:8080/actuator/health';

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

export default async function globalSetup(): Promise<void> {
  if (process.env.E2E_INTEGRATED !== 'true') {
    console.log('[e2e] Integrated backend smoke disabled. Set E2E_INTEGRATED=true to require backend health.');
    return;
  }

  try {
    await checkBackendHealth();
    console.log(`[e2e] Backend health check passed: ${BACKEND_HEALTH_URL}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[e2e] E2E_INTEGRATED=true but backend health check failed: ${message}`, { cause: error });
  }
}