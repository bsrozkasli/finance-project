import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import {
  acceptPortfolioImport,
  createPortfolioState,
  fetchPortfolioImport,
  fetchPortfolioState,
  uploadPortfolioImport,
} from './client';
import { API_BASE_URL } from './config';
import { ApiError } from './errors';
import { server } from '../test/server';

const url = (path: string) => `${API_BASE_URL}${path}`;

describe('portfolio import and state API', () => {
  it('uploads the file bytes unchanged as text/csv', async () => {
    let contentType: string | null = null;
    let body = '';
    server.use(http.post(url('/portfolios/3/imports'), async ({ request }) => {
      contentType = request.headers.get('content-type');
      body = await request.text();
      return HttpResponse.json({ batchId: 1 }, { status: 201 });
    }));

    await uploadPortfolioImport(3, new Blob(['trade_date,action\n2026-01-02,BUY\n'], { type: 'text/plain' }));

    expect(contentType).toContain('text/csv');
    expect(body).toBe('trade_date,action\n2026-01-02,BUY\n');
  });

  it('fetches a batch and accepts it through the batch routes', async () => {
    server.use(
      http.get(url('/portfolios/3/imports/7'), () => HttpResponse.json({ batchId: 7, status: 'STAGED' })),
      http.post(url('/portfolios/3/imports/7/accept'), () => HttpResponse.json({ batchId: 7, status: 'ACCEPTED' })),
    );

    await expect(fetchPortfolioImport(3, 7)).resolves.toMatchObject({ status: 'STAGED' });
    await expect(acceptPortfolioImport(3, 7)).resolves.toMatchObject({ status: 'ACCEPTED' });
  });

  it('posts the as-of date and reads a stored state by encoded version', async () => {
    let posted: unknown = null;
    let requestedPath = '';
    server.use(
      http.post(url('/portfolios/3/states'), async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ version: 'pstate-v2:abc' }, { status: 201 });
      }),
      http.get(url('/portfolios/3/states/:version'), ({ request }) => {
        requestedPath = new URL(request.url).pathname;
        return HttpResponse.json({ version: 'pstate-v2:abc' });
      }),
    );

    await createPortfolioState(3, '2026-10-25');
    await fetchPortfolioState(3, 'pstate-v2:abc');

    expect(posted).toEqual({ asOf: '2026-10-25' });
    expect(requestedPath).toContain('/portfolios/3/states/pstate-v2');
  });

  it('turns backend errors into ApiError with the backend message', async () => {
    server.use(http.post(url('/portfolios/3/imports'), () => HttpResponse.json({
      timestamp: '2026-10-25T10:00:00Z',
      status: 400,
      error: 'Bad Request',
      message: 'missing required header: fee',
      path: '/api/v1/portfolios/3/imports',
    }, { status: 400 })));

    await expect(uploadPortfolioImport(3, new Blob(['x']))).rejects.toMatchObject({
      message: 'missing required header: fee',
      status: 400,
    });
    await expect(uploadPortfolioImport(3, new Blob(['x']))).rejects.toBeInstanceOf(ApiError);
  });
});
