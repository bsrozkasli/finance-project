import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../api/config';
import { server } from '../../test/server';
import * as fx from '../../test/redesignFixtures';
import ReportsCenter from './ReportsCenter';

const get = (path: string, body: unknown) => http.get(`${API_BASE_URL}${path}`, () => HttpResponse.json(body as Record<string, unknown>));

describe('ReportsCenter', () => {
  it('shows an empty template state without delivery controls by default', async () => {
    render(<ReportsCenter />);
    expect(await screen.findByText('Rapor şablonu yok')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PDF indir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'E-posta ile gönder' })).not.toBeInTheDocument();
  });

  it('renders templates, preview and hides e-mail when delivery.email is false', async () => {
    server.use(get('/report-templates', {
      delivery: { email: false, pdf: true, xlsx: true },
      items: [
        { id: 'PERFORMANCE', name: 'Performans' },
        { id: 'REALIZED_PNL', name: 'Gerçekleşen K/Z' },
        { id: 'DIVIDENDS', name: 'Temettü' },
      ],
    }), get('/report-runs/performance', fx.fixturePerformanceReport),
    get('/report-runs/realized-pnl', fx.fixtureRealizedPnlReport),
    get('/report-runs/dividends', fx.fixtureDividendReport));
    render(<ReportsCenter />);

    expect(await screen.findByRole('button', { name: 'Performans' })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Değer köprüsü' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF indir' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excel indir' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'E-posta ile gönder' })).not.toBeInTheDocument();
    expect(screen.queryByText('Zamanlanmış gönderim')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Gerçekleşen K/Z' }));
    expect(await screen.findByText('Vergi danışmanlığı değildir.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Temettü' }));
    expect(await screen.findByText('Vergi danışmanlığı değildir.')).toBeInTheDocument();
    expect(screen.getByText('Kayıtlı değil')).toBeInTheDocument();
  });

  it('shows e-mail and schedule controls only when delivery.email is true', async () => {
    server.use(get('/report-templates', { ...fx.fixtureReportTemplates, delivery: { email: true, pdf: true, xlsx: false } }),
      get('/report-runs/performance', fx.fixturePerformanceReport));
    render(<ReportsCenter />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'E-posta ile gönder' })).toBeInTheDocument());
    expect(screen.getByText('Zamanlanmış gönderim')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excel indir' })).not.toBeInTheDocument();
  });

  it('shows the unavailable state for a preview without inventing numbers', async () => {
    server.use(get('/report-templates', fx.fixtureReportTemplates));
    render(<ReportsCenter />);
    expect(await screen.findByText('Veri alınamadı')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Değer köprüsü' })).not.toBeInTheDocument();
  });
});
