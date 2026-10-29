import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { News } from '../types';
import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '../api/config';
import { server } from '../test/server';
import { fixtureNewsItems, fixturePortfolioNewsImpact, fixtureSectorImpact, fixtureTopics } from '../test/redesignFixtures';
import NewsFeedView from './NewsFeedView';

const newsItem = (overrides: Partial<News>): News => ({
  id: 'n1',
  title: 'Breadth improves',
  source: 'Test Wire',
  time: '10:00',
  url: 'https://example.test/news/1',
  summary: 'Mocked headline for the boundary test.',
  category: 'macro',
  ...overrides,
});

describe('NewsFeedView', () => {
  it('lists only the sources that actually appear in the feed', () => {
    render(
      <NewsFeedView
        activePortfolio={null}
        news={[newsItem({}), newsItem({ id: 'n2', source: 'Second Desk', category: 'stock', symbol: 'AAPL' }), newsItem({ id: 'n3' })]}
      />,
    );

    const sources = screen.getByRole('region', { name: 'Akıştaki kaynaklar' });
    expect(within(sources).getByText('Test Wire')).toBeInTheDocument();
    expect(within(sources).getByText('Second Desk')).toBeInTheDocument();
    expect(within(sources).getByText('2 başlık')).toBeInTheDocument();
    expect(screen.queryByText('Bloomberg HT')).not.toBeInTheDocument();
    expect(screen.queryByText('Reuters News')).not.toBeInTheDocument();
    expect(screen.queryByText('Investing TR')).not.toBeInTheDocument();
  });

  it('labels news in Turkish and marks portfolio-related headlines', () => {
    render(
      <NewsFeedView
        activePortfolio={{ id: '1', name: 'ALFA', holdings: [{ symbol: 'AAPL', quantity: 1, costPrice: 1 }] }}
        news={[newsItem({ category: 'stock', symbol: 'AAPL' })]}
      />,
    );

    expect(screen.getByText('Portföyle ilgili')).toBeInTheDocument();
    expect(screen.getByText('Varlık haberi')).toBeInTheDocument();
    expect(screen.getByText('Kaynağı aç')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Başlık, sembol veya kaynakta ara…')).toBeInTheDocument();
  });

  it('shows stock news under the asset tab and hides it under the macro tab', async () => {
    render(
      <NewsFeedView
        activePortfolio={null}
        news={[newsItem({ title: 'Apple supply update', category: 'stock', symbol: 'AAPL' })]}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Varlık haberleri' }));
    expect(screen.getByText('Apple supply update')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Makroekonomi' }));
    expect(screen.queryByText('Apple supply update')).not.toBeInTheDocument();
  });

  it('explains an empty result without inventing headlines', async () => {
    render(<NewsFeedView activePortfolio={null} news={[newsItem({})]} />);

    await userEvent.type(screen.getByPlaceholderText('Başlık, sembol veya kaynakta ara…'), 'zzz');

    expect(screen.getByText('Veri yok: aramayla eşleşen haber bulunamadı.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Akıştaki kaynaklar' })).toHaveTextContent('Test Wire');
  });
});

describe('NewsFeedView redesign panels', () => {
  it('renders API items with impact badge only when level is provided', async () => {
    const get = (path: string, body: unknown) => http.get(`${API_BASE_URL}${path}`, () => HttpResponse.json(body as Record<string, unknown>));
    server.use(
      get('/news/items', {
        ...fixtureNewsItems,
        total: 2,
        counts: { MACRO: 2 },
        items: [
          { ...fixtureNewsItems.items[0], id: 'a', title: 'Etkili haber', impact: { level: 'HIGH', source: 'RULE', classifierVersion: 'v1' }, affected: [{ symbol: 'THYAO', direction: 'POSITIVE', inPortfolio: true }] },
          { ...fixtureNewsItems.items[0], id: 'b', title: 'Etkisiz haber' },
        ],
      }),
      get('/news/topics', fixtureTopics),
      get('/news/sector-impact', fixtureSectorImpact),
      get('/news/portfolio-impact', fixturePortfolioNewsImpact),
    );
    render(<NewsFeedView activePortfolio={null} news={[newsItem({})]} />);

    expect(await screen.findByText('Etkili haber')).toBeInTheDocument();
    expect(screen.getByText('Etki: Yüksek · Kural')).toBeInTheDocument();
    expect(screen.getAllByText(/^Etki: /).filter((node) => node.tagName === 'SPAN')).toHaveLength(1);
    expect(screen.getByText(/THYAO/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Makro (2)' })).toBeInTheDocument();
    expect(await screen.findByText('faiz')).toBeInTheDocument();
    expect(await screen.findByText('Test Sektör')).toBeInTheDocument();
    expect(await screen.findByText('HS1')).toBeInTheDocument();
  });

  it('keeps the existing feed and shows unavailable side panels by default', async () => {
    render(<NewsFeedView activePortfolio={null} news={[newsItem({})]} />);
    expect(screen.getByText('Breadth improves')).toBeInTheDocument();
    expect((await screen.findAllByText('Veri alınamadı')).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Breadth improves')).toBeInTheDocument();
  });
});
