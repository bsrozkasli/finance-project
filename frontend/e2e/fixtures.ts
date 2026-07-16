import { expect, test as base } from '@playwright/test';

const allowedNetworkPatterns = [
  /^http:\/\/localhost:5173(?:\/|$)/,
  /^http:\/\/127\.0\.0\.1:5173(?:\/|$)/,
  /^http:\/\/localhost:8080\/api\/v1(?:\/|$)/,
  /^http:\/\/localhost:8080\/actuator\/health$/,
  /^data:/,
  /^blob:/,
];

const isAllowedUrl = (url: string): boolean => allowedNetworkPatterns.some((pattern) => pattern.test(url));

export const test = base.extend({
  page: async ({ page }, use) => {
    const blockedRequests: string[] = [];

    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (isAllowedUrl(url)) {
        await route.continue();
        return;
      }

      blockedRequests.push(`${route.request().method()} ${url}`);
      await route.abort('blockedbyclient');
    });

    await use(page);

    expect(blockedRequests, 'Frontend must not call non-Spring backend/provider URLs').toEqual([]);
  },
});

export { expect } from '@playwright/test';