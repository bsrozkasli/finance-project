import { useState } from 'react';
import { useAgentAnalysis } from '../../hooks/useAgentAnalysis';
import { useLivePrice } from '../../hooks/useLivePrice';
import { useTechnicalAnalysis } from '../../hooks/useTechnicalAnalysis';
import { fetchNews } from '../../api/client';
import type { NewsItem, TechnicalResult } from '../../api/client';
import { AdvancedSymbolOverview } from './AdvancedSymbolOverview';
import { AlertsPanel } from './AlertsPanel';
import { AnalystDetailPanel } from './AnalystDetailPanel';
import { fmtCurrency, fmtNum, fmtPct, positiveColor } from './watchlistUtils';
import type { WatchlistAlert, WatchlistTab } from './watchlistUtils';
import { useEffect } from 'react';

interface SymbolDetailPanelProps {
  symbol: string;
  alerts: WatchlistAlert[];
  onAddAlert: (alert: Omit<WatchlistAlert, 'id' | 'createdAt'>) => void;
  onRemoveAlert: (id: string) => void;
}

export const SymbolDetailPanel = ({ symbol, alerts, onAddAlert, onRemoveAlert }: SymbolDetailPanelProps) => {
  const { data: liveData } = useLivePrice(symbol);
  const [activeTab, setActiveTab] = useState<WatchlistTab>('overview');
  const tabs: { id: WatchlistTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'technical', label: 'Technical' },
    { id: 'analyst', label: 'Analyst' },
    { id: 'news', label: 'News' },
    { id: 'ai', label: 'AI Summary' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 pb-3 pt-4" style={{ borderColor: 'var(--color-border)' }}>
        <div className="mb-2 flex items-start justify-between">
          <div className="font-mono text-xl font-bold" style={{ color: 'var(--color-accent-light)' }}>{symbol}</div>
          {liveData && <div className="text-right"><div className="font-mono text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{fmtCurrency(liveData.price)}</div><div className="font-mono text-sm font-semibold" style={{ color: positiveColor(liveData.changePct) }}>{fmtPct(liveData.changePct)}</div></div>}
        </div>
        <div className="mt-3 flex gap-0.5 overflow-x-auto">{tabs.map(tab => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className="rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap" style={{ background: activeTab === tab.id ? 'var(--color-accent-dim)' : 'transparent', color: activeTab === tab.id ? 'var(--color-accent-light)' : 'var(--color-text-secondary)', border: activeTab === tab.id ? '1px solid rgba(77,142,255,0.3)' : '1px solid transparent' }}>{tab.label}</button>)}</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && <><AdvancedSymbolOverview symbol={symbol} /><div className="px-4 pb-4"><AlertsPanel symbol={symbol} alerts={alerts} onAddAlert={onAddAlert} onRemoveAlert={onRemoveAlert} /></div></>}
        {activeTab === 'technical' && <TechnicalTab symbol={symbol} />}
        {activeTab === 'analyst' && <AnalystDetailPanel symbol={symbol} />}
        {activeTab === 'news' && <NewsTab symbol={symbol} />}
        {activeTab === 'ai' && <AISummaryTab symbol={symbol} />}
      </div>
    </div>
  );
};

const RatioCard = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl border p-3" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}><div className="mb-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</div><div className="font-mono text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{value}</div></div>;

const TechnicalTab = ({ symbol }: { symbol: string }) => {
  const { data, loading } = useTechnicalAnalysis(symbol);
  const techData = data as TechnicalResult | null;
  if (loading) return <div className="flex flex-col gap-3 p-6">{[0, 1, 2, 3].map(item => <div key={item} className="skeleton h-10 rounded" />)}</div>;
  if (!techData) return <div className="p-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No technical data</div>;
  return <div className="space-y-4 p-4"><div className="grid grid-cols-2 gap-2"><RatioCard label="RSI (14)" value={fmtNum(techData.rsi)} /><RatioCard label="MACD" value={fmtNum(techData.macd)} /><RatioCard label="MACD Signal" value={fmtNum(techData.macdSignal)} /><RatioCard label="ATR" value={fmtNum(techData.atr)} /><RatioCard label="SMA" value={fmtCurrency(techData.sma)} /><RatioCard label="EMA" value={fmtCurrency(techData.ema)} /><RatioCard label="BB Upper" value={fmtCurrency(techData.bbUpper)} /><RatioCard label="BB Lower" value={fmtCurrency(techData.bbLower)} /></div></div>;
};

const NewsTab = ({ symbol }: { symbol: string }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); fetchNews(symbol).then(data => setNews(data || [])).catch(() => setNews([])).finally(() => setLoading(false)); }, [symbol]);
  if (loading) return <div className="flex flex-col gap-3 p-6">{[0, 1, 2, 3].map(item => <div key={item} className="skeleton h-20 rounded" />)}</div>;
  return <div className="space-y-3 p-4">{news.length > 0 ? news.slice(0, 15).map(item => <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border p-3" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}><div className="mb-1 text-xs" style={{ color: 'var(--color-accent-light)' }}>{item.source}</div><div className="text-xs font-semibold leading-snug" style={{ color: 'var(--color-text-primary)' }}>{item.headline}</div><div className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.summary}</div></a>) : <div className="p-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>No recent news</div>}</div>;
};

const AISummaryTab = ({ symbol }: { symbol: string }) => {
  const { data: analysis, loading, error, refetch } = useAgentAnalysis(symbol);
  return <div className="p-4">{!analysis && !loading && <div className="py-8 text-center"><div className="mb-1 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>AI Analysis</div><button type="button" onClick={refetch} className="mt-3 rounded-lg px-4 py-2 text-xs font-bold" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>Generate Analysis</button></div>}{loading && <div className="py-8 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Running multi-agent analysis...</div>}{error && <div className="rounded-lg p-3 text-xs" style={{ background: 'var(--color-bear-dim)', color: 'var(--color-bear)' }}>{error}</div>}{analysis && <div className="space-y-3"><div className="rounded-xl border p-3" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}><div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Decision</div><div className="text-sm font-bold" style={{ color: analysis.decision === 'BUY' ? 'var(--color-bull)' : analysis.decision === 'SELL' ? 'var(--color-bear)' : 'var(--color-warning)' }}>{analysis.decision} {analysis.confidence != null ? `- ${(analysis.confidence * 100).toFixed(0)}%` : ''}</div></div>{analysis.portfolio_manager_reasoning && <div className="rounded-xl border p-3 text-xs leading-relaxed" style={{ background: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{analysis.portfolio_manager_reasoning}</div>}<button type="button" onClick={refetch} className="rounded px-3 py-2 text-xs" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>Regenerate</button></div>}</div>;
};