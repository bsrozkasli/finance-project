import { useEffect, useMemo, useState } from 'react';
import { Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FinancialRatios, TechnicalResult } from '../../api/client';
import type { PriceHistory } from '../../api/types';
import { fetchFinancialRatios, fetchFundamentals, fetchPriceHistory, fetchTechnicalAnalysis } from '../../api/client';
import { fmtNum, fmtPct, normalizePerformance, revenueGrowth } from './watchlistUtils';

interface CompareModalProps {
  symbols: string[];
  onClose: () => void;
}

interface CompareRow {
  symbol: string;
  ratios: FinancialRatios | null;
  technical: TechnicalResult | null;
  revenueGrowth: number | null;
  bars: PriceHistory[];
}

export const CompareModal = ({ symbols, onClose }: CompareModalProps) => {
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const settled = await Promise.allSettled(symbols.map(async symbol => {
        const [ratios, technical, fundamentals, bars] = await Promise.allSettled([
          fetchFinancialRatios(symbol),
          fetchTechnicalAnalysis(symbol, '1d', '3mo'),
          fetchFundamentals(symbol),
          fetchPriceHistory(symbol, '1d', '3mo'),
        ]);
        return {
          symbol,
          ratios: ratios.status === 'fulfilled' ? ratios.value : null,
          technical: technical.status === 'fulfilled' ? technical.value : null,
          revenueGrowth: fundamentals.status === 'fulfilled' ? revenueGrowth(fundamentals.value) : null,
          bars: bars.status === 'fulfilled' ? bars.value : [],
        };
      }));
      if (!cancelled) {
        setRows(settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
        setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [symbols]);

  const chartData = useMemo(() => {
    const normalized = rows.map(row => ({ symbol: row.symbol, values: normalizePerformance(row.bars) }));
    const dates = Array.from(new Set(normalized.flatMap(item => item.values.map(point => point.date)))).sort();
    return dates.map(date => {
      const item: Record<string, string | number> = { date };
      normalized.forEach(series => {
        const found = series.values.find(point => point.date === date);
        if (found) item[series.symbol] = found.value;
      });
      return item;
    });
  }, [rows]);

  const radarData = ['P/E', 'P/B', 'Debt/Eq', 'Rev Growth', 'RSI'].map(metric => {
    const item: Record<string, string | number> = { metric };
    rows.forEach(row => {
      const raw = metric === 'P/E' ? row.ratios?.pe : metric === 'P/B' ? row.ratios?.pb : metric === 'Debt/Eq' ? row.ratios?.debtEquity : metric === 'Rev Growth' ? row.revenueGrowth : row.technical?.rsi;
      item[row.symbol] = Math.max(0, Math.min(100, Number(raw ?? 0)));
    });
    return item;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border p-5" style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between"><h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>Hisse Karsilastirma</h2><button type="button" onClick={onClose} className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Kapat</button></div>
        {loading ? <div className="skeleton mt-4 h-40 rounded" /> : <>
          <div className="mt-4 overflow-x-auto"><table className="market-table"><thead><tr><th>Symbol</th><th>P/E</th><th>P/B</th><th>Debt/Equity</th><th>Revenue Growth</th><th>Dividend Yield</th><th>Market Cap</th><th>RSI</th></tr></thead><tbody>{rows.map(row => <tr key={row.symbol}><td className="font-mono text-xs font-bold">{row.symbol}</td><td>{fmtNum(row.ratios?.pe)}</td><td>{fmtNum(row.ratios?.pb)}</td><td>{fmtNum(row.ratios?.debtEquity)}</td><td>{fmtPct(row.revenueGrowth)}</td><td>-</td><td>-</td><td>{fmtNum(row.technical?.rsi)}</td></tr>)}</tbody></table></div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="h-72 rounded-xl border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}><div className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>3 Ay Performans Overlay</div><ResponsiveContainer width="100%" height="90%"><LineChart data={chartData}><XAxis dataKey="date" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} /><YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} /><Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border)' }} />{rows.map((row, index) => <Line key={row.symbol} type="monotone" dataKey={row.symbol} stroke={['#4d8eff', '#4edea3', '#f59e0b'][index % 3]} dot={false} />)}</LineChart></ResponsiveContainer></div>
            <div className="h-72 rounded-xl border p-3" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}><div className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Radar</div><ResponsiveContainer width="100%" height="90%"><RadarChart data={radarData}><PolarGrid /><PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} /><PolarRadiusAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }} />{rows.map((row, index) => <Radar key={row.symbol} name={row.symbol} dataKey={row.symbol} stroke={['#4d8eff', '#4edea3', '#f59e0b'][index % 3]} fill={['#4d8eff', '#4edea3', '#f59e0b'][index % 3]} fillOpacity={0.16} />)}<Tooltip /></RadarChart></ResponsiveContainer></div>
          </div>
        </>}
      </div>
    </div>
  );
};