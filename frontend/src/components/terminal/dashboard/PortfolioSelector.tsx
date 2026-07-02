import type { InvestmentPortfolio } from '../../../api/client';

interface PortfolioSelectorProps {
  portfolios: InvestmentPortfolio[];
  selectedPortfolioId: number | null;
  loading: boolean;
  onSelect: (portfolioId: number | null) => void;
}

export const PortfolioSelector = ({ portfolios, selectedPortfolioId, loading, onSelect }: PortfolioSelectorProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={() => onSelect(null)}
      className="rounded px-3 py-2 text-xs font-bold transition-colors"
      style={{
        background: selectedPortfolioId == null ? 'var(--color-accent)' : 'var(--color-bg-card)',
        color: selectedPortfolioId == null ? '#001a42' : 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      All Portfolios
    </button>
    {loading && <span className="skeleton h-8 w-32" />}
    {!loading && portfolios.map((portfolio) => (
      <button
        type="button"
        key={portfolio.id}
        onClick={() => onSelect(portfolio.id)}
        className="rounded px-3 py-2 text-xs font-bold transition-colors"
        style={{
          background: selectedPortfolioId === portfolio.id ? 'var(--color-accent)' : 'var(--color-bg-card)',
          color: selectedPortfolioId === portfolio.id ? '#001a42' : 'var(--color-text-secondary)',
          border: '1px solid var(--color-border)',
        }}
      >
        {portfolio.name}
      </button>
    ))}
  </div>
);
