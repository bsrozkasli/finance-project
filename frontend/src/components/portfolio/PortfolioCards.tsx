import { useState } from 'react';
import { Star } from 'lucide-react';
import { fetchPortfolioOverview, pinPortfolio } from '../../api/redesign';
import type { PortfolioCard } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import { useMarketScope } from '../../context/marketScope';
import PanelState from '../ui/PanelState';
import { fmtMoney, fmtSignedPct, toneClass } from './format';

type CardFilter = 'ALL' | 'PINNED' | 'CRITICAL';
const FILTERS: Array<{ id: CardFilter; label: string }> = [
  { id: 'ALL', label: 'Tümü' },
  { id: 'PINNED', label: 'Sabitlenmiş' },
  { id: 'CRITICAL', label: 'Kritik riskli' },
];
const RISK_LABEL = { LOW: 'Düşük risk', MEDIUM: 'Orta risk', HIGH: 'Yüksek risk' } as const;

const matches = (card: PortfolioCard, filter: CardFilter) => (
  filter === 'ALL' || (filter === 'PINNED' ? card.pinned : card.riskLevel === 'HIGH')
);

interface Props {
  activePortfolioId: number | undefined;
  onSelect: (portfolioId: number) => void;
}

/** Portfolio list from `GET /portfolios/overview` with pin stars, filters and an aggregate card. */
export default function PortfolioCards({ activePortfolioId, onSelect }: Props) {
  const { market } = useMarketScope();
  const query = usePanelQuery(() => fetchPortfolioOverview({ market, limit: 100 }), [market]);
  const [filter, setFilter] = useState<CardFilter>('ALL');
  const [pinError, setPinError] = useState('');
  const data = query.data;
  const cards = data?.items.filter((card) => matches(card, filter)) ?? [];

  const togglePin = async (card: PortfolioCard) => {
    setPinError('');
    try {
      await pinPortfolio(card.portfolioId, !card.pinned);
      query.reload();
    } catch {
      setPinError('Sabitleme kaydedilemedi.');
    }
  };

  return (
    <section aria-label="Portföy listesi" className="rounded-md border border-outline-variant bg-bg-card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-headline text-lg font-bold text-text-primary">Portföylerim</h2>
        <div role="group" aria-label="Portföy filtresi" className="flex gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
              className={`min-h-11 rounded-md border px-3 text-xs font-bold ${filter === item.id ? 'border-primary bg-primary/15 text-primary' : 'border-outline-variant text-text-secondary hover:text-text-primary'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {pinError && <p role="alert" className="mb-2 text-xs text-bear-red">{pinError}</p>}
      <PanelState state={query.state} notes={data?.notes} onRetry={query.reload} label="Portföy listesi" emptyMessage="Portföy bulunamadı">
        {data && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-md border border-outline-variant/60 bg-bg-base/40 p-3" aria-label="Tüm portföyler">
              <div className="text-xs font-bold text-text-muted">Tüm portföyler</div>
              <div className="mt-1 font-data-mono text-xl font-bold text-text-primary">{fmtMoney(data.aggregate.value, data.currency)}</div>
              <div className={`font-data-mono text-xs ${toneClass(data.aggregate.dayChangePct)}`}>{fmtSignedPct(data.aggregate.dayChangePct)} bugün</div>
              <div className="mt-1 text-xs text-text-secondary">
                {data.aggregate.portfolioCount ?? data.total} portföy · {data.aggregate.criticalRiskCount ?? 0} kritik riskli
              </div>
            </div>
            {cards.length === 0 && <p className="text-xs text-text-muted md:col-span-3">Bu filtreye uyan portföy yok.</p>}
            {cards.map((card) => (
              <div
                key={card.portfolioId}
                className={`flex items-stretch rounded-md border bg-bg-base/40 ${card.portfolioId === activePortfolioId ? 'border-primary' : 'border-outline-variant/60'}`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(card.portfolioId)}
                  aria-pressed={card.portfolioId === activePortfolioId}
                  className="min-h-11 flex-1 p-3 text-left"
                >
                  <div className="text-sm font-bold text-text-primary">{card.name}</div>
                  <div className="text-xs text-text-muted">
                    {card.positionCount} pozisyon{card.riskLevel ? ` · ${RISK_LABEL[card.riskLevel]}` : ''}
                  </div>
                  <div className="mt-1 font-data-mono text-sm text-text-primary">{fmtMoney(card.value, data.currency)}</div>
                  <div className="flex gap-3 font-data-mono text-xs">
                    <span className={toneClass(card.dayChangePct)}>Gün {fmtSignedPct(card.dayChangePct)}</span>
                    <span className={toneClass(card.returnPct)}>Getiri {fmtSignedPct(card.returnPct)}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => void togglePin(card)}
                  aria-pressed={card.pinned}
                  aria-label={`${card.name} ${card.pinned ? 'sabitlemeyi kaldır' : 'sabitle'}`}
                  className="flex min-h-11 min-w-11 items-center justify-center text-text-muted hover:text-warning-amber"
                >
                  <Star className={`h-4 w-4 ${card.pinned ? 'fill-current text-warning-amber' : ''}`} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </PanelState>
    </section>
  );
}
