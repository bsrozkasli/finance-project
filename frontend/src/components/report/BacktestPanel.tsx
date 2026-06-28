import React from 'react';
import { useBacktest } from '../../hooks/useBacktest';

interface BacktestPanelProps {
  symbol: string;
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ symbol }) => {
  const { data, loading, error } = useBacktest(symbol);

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-800 rounded-xl w-full" style={{ background: 'var(--color-bg-card)' }}></div>;
  }

  if (error || !data) {
    return null;
  }

  const { isMeaningful, totalOccurrences, winRate, averageReturnPct, scenarioDescription } = data;

  if (!isMeaningful) {
    return (
      <div className="p-4 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
        <div className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          "{scenarioDescription}" koşulu için son 5 yılda yeterli benzer tarihsel veri bulunamadı.
        </div>
      </div>
    );
  }

  const isPositive = winRate > 50;
  const color = winRate >= 70 ? 'var(--color-bull)' : winRate <= 30 ? 'var(--color-bear)' : 'var(--color-warning)';

  return (
    <div className="p-5 rounded-xl border relative overflow-hidden" style={{ background: 'var(--color-bg-card)', borderColor: color }}>
      <div className="absolute top-0 left-0 w-1 h-full" style={{ background: color }}></div>
      <div className="pl-2">
        <h3 className="font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Tarih Tekerrür Eder mi?
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Mevcut koşul (<strong>{scenarioDescription}</strong>) son 5 yılda tam <strong>{totalOccurrences} kez</strong> yaşandı. 
          Bu durumlardan sonraki 30 gün içinde hisse <strong>%{winRate.toFixed(1)}</strong> ihtimalle {isPositive ? 'yükseliş' : 'düşüş'} gösterdi.
        </p>
        
        <div className="flex items-end gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Kazanma Oranı</div>
            <div className="text-2xl font-bold" style={{ color }}>
              %{winRate.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Ortalama Getiri (30 Gün)</div>
            <div className="text-xl font-bold" style={{ color: averageReturnPct > 0 ? 'var(--color-bull)' : 'var(--color-bear)' }}>
              {averageReturnPct > 0 ? '+' : ''}{averageReturnPct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
