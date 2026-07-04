import { useState } from 'react';
import type { InvestmentPortfolio } from '../../api/client';
import { fmtCurrency, positiveColor } from './portfolioUtils';

interface PortfolioCardSummary {
  portfolioId: number;
  value: number | null;
  dailyPnl: number | null;
}

interface PortfolioHeaderProps {
  portfolios: InvestmentPortfolio[];
  selectedPortfolio: InvestmentPortfolio | null;
  selectedPortfolioId: number | null;
  summaries: PortfolioCardSummary[];
  onSelectPortfolio: (id: number) => void;
  onCreatePortfolio: (name: string, baseCurrency: string, description?: string) => Promise<void>;
}

const cardSummary = (summaries: PortfolioCardSummary[], portfolioId: number): PortfolioCardSummary | null =>
  summaries.find(summary => summary.portfolioId === portfolioId) ?? null;

export const PortfolioHeader = ({
  portfolios,
  selectedPortfolio,
  selectedPortfolioId,
  summaries,
  onSelectPortfolio,
  onCreatePortfolio,
}: PortfolioHeaderProps) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreatePortfolio(name.trim(), currency.trim() || 'USD', description.trim() || undefined);
      setName('');
      setCurrency('USD');
      setDescription('');
      setCreating(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-[220px] flex-1">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Portfolio Detail</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {selectedPortfolio?.name ?? 'Portfolio'}
            </h1>
            {selectedPortfolio?.baseCurrency && (
              <span className="rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>
                {selectedPortfolio.baseCurrency}
              </span>
            )}
          </div>
          <div className="mt-1 max-w-2xl text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {selectedPortfolio?.description || 'Selected portfolio holdings, periodic profitability, allocation and optimization.'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded px-3 py-2 text-xs font-bold transition-colors"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
        >
          Yeni Portfoy Olustur
        </button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {portfolios.map(portfolio => {
          const selected = portfolio.id === selectedPortfolioId;
          const summary = cardSummary(summaries, portfolio.id);
          return (
            <button
              key={portfolio.id}
              type="button"
              onClick={() => onSelectPortfolio(portfolio.id)}
              className="min-w-[190px] rounded-lg border p-3 text-left transition-colors"
              style={{
                background: selected ? 'var(--color-bg-selected)' : 'var(--color-bg-card)',
                borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{portfolio.name}</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{portfolio.baseCurrency}</span>
              </div>
              <div className="mt-2 font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {summary?.value != null ? fmtCurrency(summary.value) : '-'}
              </div>
              <div className="mt-1 text-[11px] font-mono" style={{ color: positiveColor(summary?.dailyPnl) }}>
                Gunluk P/L {summary?.dailyPnl != null ? `${summary.dailyPnl >= 0 ? '+' : ''}${fmtCurrency(summary.dailyPnl)}` : '-'}
              </div>
            </button>
          );
        })}
      </div>

      {creating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg border p-4" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Yeni Portfoy</h2>
              <button type="button" onClick={() => setCreating(false)} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Kapat</button>
            </div>
            <div className="mt-4 space-y-3">
              <input value={name} onChange={event => setName(event.target.value)} placeholder="Portfoy adi" className="w-full rounded border px-3 py-2 text-sm outline-none" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <input value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} placeholder="USD" className="w-full rounded border px-3 py-2 text-sm outline-none" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Aciklama" rows={3} className="w-full rounded border px-3 py-2 text-sm outline-none" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }} />
              <button type="button" disabled={!name.trim() || saving} onClick={submit} className="w-full rounded px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ background: 'var(--color-accent)', color: '#fff' }}>
                {saving ? 'Kaydediliyor...' : 'Olustur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};