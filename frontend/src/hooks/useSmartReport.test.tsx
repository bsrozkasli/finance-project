import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { loadContractFixture } from '../test/contractFixtures';
import { useSmartReport } from './useSmartReport';

describe('useSmartReport sectionStatus', () => {
  it('passes the contract fixture sectionStatus through unchanged', async () => {
    server.use(http.get('*/reports/smart/AAPL', () => HttpResponse.json(loadContractFixture('smart-report.json') as Record<string, unknown>)));
    const { result } = renderHook(() => useSmartReport('AAPL'));
    await waitFor(() => expect(result.current.report).not.toBeNull());
    expect(result.current.report?.sectionStatus?.overall).toBe('EMPTY');
    expect(result.current.report?.sectionStatus?.components.valuation_score).toEqual({
      status: 'EMPTY',
      reason: 'valuation_component_unavailable',
    });
  });

  it('keeps a missing sectionStatus missing (old backend or old cache entry)', async () => {
    const legacy = { ...(loadContractFixture('smart-report.json') as Record<string, unknown>) };
    delete legacy.sectionStatus;
    server.use(http.get('*/reports/smart/AAPL', () => HttpResponse.json(legacy)));
    const { result } = renderHook(() => useSmartReport('AAPL'));
    await waitFor(() => expect(result.current.report).not.toBeNull());
    expect(result.current.report?.sectionStatus ?? null).toBeNull();
  });
});
