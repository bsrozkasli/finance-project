import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../api/config';
import type { PortfolioImportBatch } from '../../api/client';
import { server } from '../../test/server';
import PortfolioImportPanel from './PortfolioImportPanel';

const url = (path: string) => `${API_BASE_URL}${path}`;

const staged: PortfolioImportBatch = {
  batchId: 9,
  portfolioId: 1,
  status: 'STAGED',
  fileSha256: 'f'.repeat(64),
  createdAt: '2026-10-25T10:00:00Z',
  acceptedAt: null,
  counts: { valid: 1, invalid: 1, duplicate: 1, accepted: 0, rejected: 0 },
  rows: [
    { rowNumber: 1, status: 'VALID', message: null, originLocator: `csv:${'a'.repeat(64)}`, transactionId: null },
    { rowNumber: 2, status: 'INVALID', message: 'trade_date: geçersiz tarih', originLocator: null, transactionId: null },
    { rowNumber: 3, status: 'DUPLICATE', message: 'Defterde zaten var', originLocator: `csv:${'b'.repeat(64)}`, transactionId: null },
  ],
};

const accepted: PortfolioImportBatch = {
  ...staged,
  status: 'ACCEPTED',
  acceptedAt: '2026-10-25T10:05:00Z',
  counts: { valid: 0, invalid: 1, duplicate: 1, accepted: 1, rejected: 0 },
  rows: [{ ...staged.rows[0], status: 'ACCEPTED', transactionId: 500 }, staged.rows[1], staged.rows[2]],
};

const csvFile = () => new File(['trade_date,action\n2026-01-02,BUY\n'], 'islemler.csv', { type: 'text/csv' });

const uploadFile = async () => {
  await userEvent.upload(screen.getByLabelText('CSV dosyası'), csvFile());
  await userEvent.click(screen.getByRole('button', { name: 'Yükle' }));
};

describe('PortfolioImportPanel', () => {
  it('uploads a csv file and shows counts and every row with status, message and identity', async () => {
    let uploadedBody = '';
    let contentType: string | null = null;
    server.use(http.post(url('/portfolios/1/imports'), async ({ request }) => {
      contentType = request.headers.get('content-type');
      uploadedBody = await request.text();
      return HttpResponse.json(staged, { status: 201 });
    }));
    render(<PortfolioImportPanel portfolioId={1} />);

    expect(screen.getByRole('button', { name: 'Yükle' })).toBeDisabled();
    expect(screen.getByText(/Kabul et.*düğmesine basana kadar defteriniz ve portföyünüz\s+değişmez/)).toBeInTheDocument();
    await uploadFile();

    const counts = await screen.findByRole('group', { name: 'Satır sayıları' });
    expect(within(counts).getByText('Geçerli').nextSibling).toHaveTextContent('1');
    expect(within(counts).getByText('Geçersiz').nextSibling).toHaveTextContent('1');
    expect(within(counts).getByText('Mükerrer').nextSibling).toHaveTextContent('1');
    expect(within(counts).getByText('Kabul edilen').nextSibling).toHaveTextContent('0');
    expect(within(counts).getByText('Reddedilen').nextSibling).toHaveTextContent('0');
    expect(contentType).toContain('text/csv');
    expect(uploadedBody).toBe('trade_date,action\n2026-01-02,BUY\n');

    const table = screen.getByRole('table', { name: 'Aşamalı satırlar' });
    const invalidRow = within(table).getByText('trade_date: geçersiz tarih').closest('tr') as HTMLElement;
    expect(within(invalidRow).getByText('Geçersiz')).toBeInTheDocument();
    expect(within(invalidRow).getByText('2')).toBeInTheDocument();
    expect(within(table).getByText('Defterde zaten var')).toBeInTheDocument();
    expect(within(table).getByTitle(`csv:${'a'.repeat(64)}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kabul et' })).toBeEnabled();
  });

  it('accepts the staged batch explicitly, shows final statuses and locks the button', async () => {
    const onLedgerChanged = vi.fn();
    let acceptCalls = 0;
    server.use(
      http.post(url('/portfolios/1/imports'), () => HttpResponse.json(staged, { status: 201 })),
      http.post(url('/portfolios/1/imports/9/accept'), () => {
        acceptCalls += 1;
        return HttpResponse.json(accepted);
      }),
    );
    render(<PortfolioImportPanel portfolioId={1} onLedgerChanged={onLedgerChanged} />);

    await uploadFile();
    expect(acceptCalls).toBe(0);
    expect(onLedgerChanged).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Kabul et' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Kabul et' })).toBeDisabled());
    const table = screen.getByRole('table', { name: 'Aşamalı satırlar' });
    expect(within(table).getByText('Kabul edildi')).toBeInTheDocument();
    expect(screen.getByText(/Toplu aktarım kabul edildi/)).toBeInTheDocument();
    expect(onLedgerChanged).toHaveBeenCalledTimes(1);
    expect(acceptCalls).toBe(1);
  });

  it('disables the accept button while the accept request is running', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(
      http.post(url('/portfolios/1/imports'), () => HttpResponse.json(staged, { status: 201 })),
      http.post(url('/portfolios/1/imports/9/accept'), async () => {
        await gate;
        return HttpResponse.json(accepted);
      }),
    );
    render(<PortfolioImportPanel portfolioId={1} />);
    await uploadFile();
    await userEvent.click(await screen.findByRole('button', { name: 'Kabul et' }));

    expect(screen.getByRole('button', { name: 'Kabul ediliyor…' })).toBeDisabled();
    release();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Kabul et' })).toBeDisabled());
  });

  it('does not signal a ledger change when staging or accepting fails', async () => {
    const onLedgerChanged = vi.fn();
    server.use(
      http.post(url('/portfolios/1/imports'), () => HttpResponse.json(staged, { status: 201 })),
      http.post(url('/portfolios/1/imports/9/accept'), () => HttpResponse.json({
        timestamp: '2026-10-25T10:00:00Z',
        status: 500,
        error: 'Internal Server Error',
        message: 'Accept failed',
        path: '/api/v1/portfolios/1/imports/9/accept',
      }, { status: 500 })),
    );
    render(<PortfolioImportPanel portfolioId={1} onLedgerChanged={onLedgerChanged} />);
    await uploadFile();
    await userEvent.click(await screen.findByRole('button', { name: 'Kabul et' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Accept failed');
    expect(onLedgerChanged).not.toHaveBeenCalled();
  });

  it('shows the backend message when the whole file is rejected', async () => {
    server.use(http.post(url('/portfolios/1/imports'), () => HttpResponse.json({
      timestamp: '2026-10-25T10:00:00Z',
      status: 400,
      error: 'Bad Request',
      message: 'missing required header: fee',
      path: '/api/v1/portfolios/1/imports',
    }, { status: 400 })));
    render(<PortfolioImportPanel portfolioId={1} />);

    await uploadFile();

    expect(await screen.findByRole('alert')).toHaveTextContent('missing required header: fee');
    expect(screen.queryByRole('button', { name: 'Kabul et' })).not.toBeInTheDocument();
  });

  it('shows the backend message when accepting fails and keeps accept available', async () => {
    server.use(
      http.post(url('/portfolios/1/imports'), () => HttpResponse.json(staged, { status: 201 })),
      http.post(url('/portfolios/1/imports/9/accept'), () => HttpResponse.json({
        timestamp: '2026-10-25T10:00:00Z',
        status: 404,
        error: 'Not Found',
        message: 'Import batch not found',
        path: '/api/v1/portfolios/1/imports/9/accept',
      }, { status: 404 })),
    );
    render(<PortfolioImportPanel portfolioId={1} />);
    await uploadFile();
    await userEvent.click(await screen.findByRole('button', { name: 'Kabul et' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Import batch not found');
    expect(screen.getByRole('button', { name: 'Kabul et' })).toBeEnabled();
  });
});
