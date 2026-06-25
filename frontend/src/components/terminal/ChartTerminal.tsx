import { useState, useEffect, useCallback, useRef } from 'react';
import type { Asset } from '../../api/types';
import { apiClient } from '../../api/client';
import { isMarketOpen } from '../../utils/market';

interface OHLCPoint { date: string; close: number; open?: number; high?: number; low?: number; }

// Period definitions — shown as strip below chart (TradingView style)
const PERIODS = [
  { id: '1D',  label: '1 gün',  interval: '5m',  range: '1d' },
  { id: '5D',  label: '5 gün',  interval: '15m', range: '5d' },
  { id: '1M',  label: '1 ay',   interval: '1d',  range: '1mo' },
  { id: '3M',  label: '3 ay',   interval: '1d',  range: '3mo' },
  { id: '6M',  label: '6 ay',   interval: '1d',  range: '6mo' },
  { id: '1Y',  label: '1 yıl',  interval: '1wk', range: '1y' },
  { id: '5Y',  label: '5 yıl',  interval: '1wk', range: '5y' },
];

type PeriodId = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y';

interface ChartTerminalProps {
  assets: Asset[];
  initialSymbol?: string | null;
}

// ── SMA helper ────────────────────────────────────────────────────────────────
const sma = (data: number[], period: number): (number | null)[] =>
  data.map((_, i) => i < period - 1 ? null : data.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period);

// ── Bezier path helper (smooth curve like TradingView) ───────────────────────
function smoothPath(xs: number[], ys: number[]): string {
  if (xs.length < 2) return '';
  const pts = xs.map((x, i) => ({ x, y: ys[i] }));
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return d;
}

// ── Area Chart (TradingView style) ────────────────────────────────────────────
const AreaChart = ({
  points, sma20, sma50, showSMA, prevClose, width = 800, height = 300,
}: {
  points: OHLCPoint[];
  sma20: (number | null)[];
  sma50: (number | null)[];
  showSMA: boolean;
  prevClose: number | null;
  width?: number;
  height?: number;
}) => {
  const prices = points.map(p => p.close);
  const allPrices = prevClose ? [...prices, prevClose] : prices;
  const min = Math.min(...allPrices) * 0.997;
  const max = Math.max(...allPrices) * 1.003;
  const range = max - min || 1;
  const n = prices.length;

  const toX = (i: number) => (i / Math.max(n - 1, 1)) * width;
  const toY = (v: number) => height - ((v - min) / range) * height;

  const xs = prices.map((_, i) => toX(i));
  const ys = prices.map(v => toY(v));

  const mainPath = smoothPath(xs, ys);
  const fillPath = `${mainPath} L${width},${height} L0,${height} Z`;

  const positive = prices[prices.length - 1] >= (prevClose ?? prices[0]);
  const lineColor = positive ? '#4edea3' : '#ff4d6d';

  const yTicks = Array.from({ length: 5 }, (_, i) => min + (range * i) / 4);
  const xTickCount = 6;
  const xTicks = Array.from({ length: xTickCount }, (_, i) => Math.round((i / (xTickCount - 1)) * (n - 1)));

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const frac = (e.clientX - rect.left) / rect.width;
    setHoverIdx(Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1)))));
  };

  const hoverPrice = hoverIdx !== null ? prices[hoverIdx] : null;
  const hoverDate = hoverIdx !== null ? points[hoverIdx].date : null;
  const hoverX = hoverIdx !== null ? toX(hoverIdx) : null;
  const hoverY = hoverPrice !== null ? toY(hoverPrice) : null;

  // SMA path builder
  const smaPath = (vals: (number | null)[]) => {
    const segs: string[] = [];
    let seg: { x: number; y: number }[] = [];
    vals.forEach((v, i) => {
      if (v != null) { seg.push({ x: toX(i), y: toY(v) }); }
      else if (seg.length > 0) { segs.push(smoothPath(seg.map(s => s.x), seg.map(s => s.y))); seg = []; }
    });
    if (seg.length > 1) segs.push(smoothPath(seg.map(s => s.x), seg.map(s => s.y)));
    return segs.join(' ');
  };

  if (n < 2) return (
    <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--color-text-muted)' }}>
      Yeterli veri yok
    </div>
  );

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height + 28}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="ct-grad-bull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4edea3" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#4edea3" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="ct-grad-bear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#ff4d6d" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis grid + labels */}
        {yTicks.map((v, i) => {
          const y = toY(v);
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4,6" />
              <text x={width - 4} y={y - 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.3)">
                ${v >= 1000 ? v.toFixed(0) : v.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Previous close reference line */}
        {prevClose != null && (
          <g>
            <line
              x1="0" y1={toY(prevClose)} x2={width} y2={toY(prevClose)}
              stroke="rgba(255,255,255,0.25)" strokeDasharray="6,4" strokeWidth="1"
            />
            <rect x={width - 58} y={toY(prevClose) - 9} width={56} height={16} rx="3"
              fill="rgba(30,35,45,0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            <text x={width - 30} y={toY(prevClose) + 3} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.6)" fontWeight="600">
              Önceki: ${prevClose.toFixed(2)}
            </text>
          </g>
        )}

        {/* X-axis labels */}
        {xTicks.map((idx, i) => (
          <text key={i} x={toX(idx)} y={height + 18} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.3)">
            {points[idx]?.date?.slice(0, 10) ?? ''}
          </text>
        ))}

        {/* Fill area */}
        <path d={fillPath} fill={positive ? 'url(#ct-grad-bull)' : 'url(#ct-grad-bear)'} />

        {/* Main price line */}
        <path d={mainPath} fill="none" stroke={lineColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* SMA overlays */}
        {showSMA && (
          <>
            <path d={smaPath(sma20)} fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.75" strokeDasharray="4,2" />
            <path d={smaPath(sma50)} fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.75" strokeDasharray="4,2" />
          </>
        )}

        {/* Hover vertical line */}
        {hoverIdx !== null && hoverX !== null && hoverY !== null && (
          <>
            <line x1={hoverX} y1="0" x2={hoverX} y2={height} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
            <line x1="0" y1={hoverY} x2={width} y2={hoverY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle cx={hoverX} cy={hoverY} r="4" fill={lineColor} stroke="#0f141b" strokeWidth="2" />
          </>
        )}
      </svg>

      {/* Hover tooltip */}
      {hoverPrice !== null && hoverDate !== null && (
        <div className="absolute top-2 left-3 px-2.5 py-1.5 rounded-lg text-xs pointer-events-none"
          style={{ background: 'rgba(15,20,27,0.92)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{hoverDate}</div>
          <div className="font-mono font-bold" style={{ color: lineColor, fontSize: 13 }}>${hoverPrice.toFixed(2)}</div>
          {prevClose && (
            <div style={{ color: positive ? '#4edea3' : '#ff4d6d', fontSize: 10 }}>
              {positive ? '▲' : '▼'} {Math.abs(((hoverPrice - prevClose) / prevClose) * 100).toFixed(2)}%
            </div>
          )}
        </div>
      )}

      {/* Current price label on right edge */}
      {prices.length > 0 && (
        <div
          className="absolute right-0 font-mono font-bold text-xs px-1.5 py-0.5 rounded-l"
          style={{
            top: `${(toY(prices[prices.length - 1]) / (height + 28)) * 100}%`,
            transform: 'translateY(-50%)',
            background: lineColor,
            color: '#0f141b',
            fontSize: 10,
          }}
        >
          ${prices[prices.length - 1].toFixed(2)}
        </div>
      )}
    </div>
  );
};

// ── Period Return Chip ────────────────────────────────────────────────────────
const PeriodChip = ({
  period, selected, onSelect, pct,
}: {
  period: typeof PERIODS[0];
  selected: boolean;
  onSelect: () => void;
  pct: number | null;
}) => {
  const isPos = (pct ?? 0) >= 0;
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center px-4 py-2 cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(255,255,255,0.06)' : 'transparent',
        borderBottom: selected ? `2px solid ${isPos ? '#4edea3' : '#ff4d6d'}` : '2px solid transparent',
        minWidth: 64,
      }}
    >
      <span className="text-xs font-bold" style={{ color: selected ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
        {period.label}
      </span>
      {pct !== null ? (
        <span className="text-[10px] font-mono font-bold mt-0.5" style={{ color: isPos ? '#4edea3' : '#ff4d6d' }}>
          {isPos ? '+' : ''}{pct.toFixed(2)}%
        </span>
      ) : (
        <span className="skeleton inline-block w-10 h-2.5 rounded mt-0.5" />
      )}
    </button>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const ChartTerminal = ({ assets, initialSymbol }: ChartTerminalProps) => {
  const [symbol, setSymbol] = useState(initialSymbol ?? assets[0]?.symbol ?? '');
  const [period, setPeriod] = useState<PeriodId>('3M');
  const [data, setData] = useState<OHLCPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [showSMA, setShowSMA] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [periodReturns, setPeriodReturns] = useState<Record<string, number | null>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (sym: string, pid: PeriodId) => {
    if (!sym) return;
    setLoading(true); setError(null);
    const cfg = PERIODS.find(p => p.id === pid)!;
    try {
      const res = await apiClient.get(`/prices/${sym}/history`, {
        params: { interval: cfg.interval, range: cfg.range },
      });
      const raw: Array<{ date?: string; timestamp?: string; closePrice?: number; close?: number }> = res.data;
      const sorted = [...raw].sort((a, b) =>
        (a.date ?? a.timestamp ?? '').localeCompare(b.date ?? b.timestamp ?? '')
      );
      setData(sorted.map(p => ({
        date: (p.date ?? p.timestamp ?? '').slice(0, 10),
        close: p.closePrice ?? p.close ?? 0,
      })));
      setLastFetched(new Date());
    } catch {
      setError('Fiyat verisi yüklenemedi.');
    } finally { setLoading(false); }
  }, []);

  // Fetch period returns for all periods (background)
  const fetchPeriodReturns = useCallback(async (sym: string) => {
    if (!sym) return;
    const results: Record<string, number | null> = {};
    await Promise.allSettled(
      PERIODS.map(async p => {
        try {
          const res = await apiClient.get(`/prices/${sym}/history`, {
            params: { interval: p.interval, range: p.range },
          });
          const raw: Array<{ closePrice?: number; close?: number }> = res.data;
          if (raw.length >= 2) {
            const first = raw[0].closePrice ?? raw[0].close ?? 0;
            const last = raw[raw.length - 1].closePrice ?? raw[raw.length - 1].close ?? 0;
            results[p.id] = first > 0 ? ((last - first) / first) * 100 : null;
          } else { results[p.id] = null; }
        } catch { results[p.id] = null; }
      })
    );
    setPeriodReturns(results);
  }, []);

  useEffect(() => {
    if (symbol) {
      fetchData(symbol, period);
      fetchPeriodReturns(symbol);
    }
  }, [symbol, period, fetchData, fetchPeriodReturns]);

  // Auto-refresh
  const refreshMs = isMarketOpen() ? 30_000 : 15 * 60_000;
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh && symbol) {
      intervalRef.current = setInterval(() => fetchData(symbol, period), refreshMs);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, symbol, period, fetchData, refreshMs]);

  const prices = data.map(p => p.close);
  const sma20vals = sma(prices, 20);
  const sma50vals = sma(prices, 50);

  const firstPrice = prices[0] ?? 0;
  const lastPrice = prices[prices.length - 1] ?? 0;
  // "Previous close" = first candle of selected period (reference line)
  const prevClose = prices.length >= 2 ? prices[0] : null;
  const changePct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
  const positive = changePct >= 0;
  const changeColor = positive ? '#4edea3' : '#ff4d6d';

  const asset = assets.find(a => a.symbol === symbol);
  const marketOpen = isMarketOpen();

  // Data freshness warning
  const dataAge = lastFetched ? Math.floor((Date.now() - lastFetched.getTime()) / 1000 / 60 / 60 / 24) : 0;
  const isStale = data.length > 0 && lastFetched && dataAge === 0 && data[data.length - 1].date < new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="terminal-main flex overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
      {/* LEFT: Asset list — compact, no empty space */}
      <div className="w-36 shrink-0 border-r overflow-y-auto flex flex-col" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}>
        <div className="px-2 py-2 text-[9px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' }}>
          Hisseler
        </div>
        {assets.length === 0 && (
          <div className="px-2 py-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Watchlist boş</div>
        )}
        {assets.map(a => (
          <button key={a.symbol} onClick={() => setSymbol(a.symbol)}
            className="w-full text-left px-2 py-2 transition-all cursor-pointer"
            style={{
              background: symbol === a.symbol ? 'rgba(0,219,233,0.08)' : 'transparent',
              borderLeft: symbol === a.symbol ? '2px solid var(--color-accent)' : '2px solid transparent',
            }}>
            <div className="font-mono font-bold text-xs leading-tight" style={{ color: symbol === a.symbol ? 'var(--color-accent-light)' : 'var(--color-text-primary)' }}>
              {a.symbol}
            </div>
            <div className="text-[9px] truncate leading-tight mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{a.name}</div>
          </button>
        ))}
      </div>

      {/* RIGHT: Chart area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <div>
            <div className="flex items-baseline gap-2">
              {/* Market live dot */}
              <span className="relative flex h-2 w-2 self-center mr-0.5">
                {marketOpen ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#4edea3' }} />
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#4edea3' }} />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'var(--color-text-muted)' }} />
                )}
              </span>
              <span className="text-lg font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>{symbol || '—'}</span>
              {asset && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{asset.name}</span>}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              {lastPrice > 0 && (
                <>
                  <span className="text-2xl font-mono font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                    ${lastPrice.toFixed(2)}
                  </span>
                  <span className="font-mono text-sm font-bold" style={{ color: changeColor }}>
                    {positive ? '▲' : '▼'} {positive ? '+' : ''}{changePct.toFixed(2)}%
                  </span>
                </>
              )}
              {lastFetched && (
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  · {lastFetched.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            {isStale && (
              <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--color-warning)' }}>
                ⚠️ Veri güncel olmayabilir — backend cache'i kontrol edin
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* SMA toggle */}
            <button onClick={() => setShowSMA(!showSMA)}
              className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all"
              style={{
                background: showSMA ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                color: showSMA ? '#f59e0b' : 'var(--color-text-muted)',
                border: showSMA ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              SMA
            </button>
            {/* Auto-refresh */}
            <button onClick={() => setAutoRefresh(!autoRefresh)}
              className="px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all"
              style={{
                background: autoRefresh ? 'rgba(0,219,233,0.12)' : 'rgba(255,255,255,0.05)',
                color: autoRefresh ? 'var(--color-accent-light)' : 'var(--color-text-muted)',
                border: autoRefresh ? '1px solid rgba(0,219,233,0.25)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              🔄 {marketOpen ? '30s' : '15dk'}
            </button>
            <button onClick={() => fetchData(symbol, period)}
              className="px-2 py-1 rounded text-[10px] cursor-pointer hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
              ↻
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 overflow-hidden p-4 pb-0">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="skeleton rounded-xl w-full" style={{ height: 280 }} />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="text-3xl">📉</div>
                <div className="text-sm font-semibold" style={{ color: '#ff4d6d' }}>Veri yüklenemedi</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{error}</div>
                <button onClick={() => fetchData(symbol, period)}
                  className="px-3 py-1.5 rounded text-xs font-bold cursor-pointer mt-2"
                  style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}>
                  Tekrar Dene
                </button>
              </div>
            </div>
          )}
          {!loading && !error && !symbol && (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--color-text-muted)' }}>
              <div className="text-4xl">📈</div>
              <div className="text-sm">Sol listeden bir hisse seçin.</div>
            </div>
          )}
          {!loading && !error && data.length > 0 && (
            <>
              <AreaChart
                points={data}
                sma20={sma20vals}
                sma50={sma50vals}
                showSMA={showSMA}
                prevClose={prevClose}
              />
              {/* SMA legend */}
              {showSMA && data.length >= 20 && (
                <div className="flex items-center gap-3 px-1 mt-1 text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: '#f59e0b' }} /> SMA20
                  </span>
                  {data.length >= 50 && (
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: '#818cf8' }} /> SMA50
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Period strip — TradingView style bottom bar */}
        <div className="border-t shrink-0 flex items-stretch overflow-x-auto" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)', scrollbarWidth: 'none' }}>
          {PERIODS.map(p => (
            <PeriodChip
              key={p.id}
              period={p}
              selected={period === p.id}
              onSelect={() => setPeriod(p.id as PeriodId)}
              pct={periodReturns[p.id] ?? null}
            />
          ))}
          <div className="flex-1" />
          {/* Stats inline */}
          {!loading && data.length > 0 && (
            <div className="flex items-center gap-4 px-4 text-[10px] shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
              <span>Aç: <strong className="font-mono" style={{ color: 'var(--color-text-primary)' }}>${prices[0]?.toFixed(2)}</strong></span>
              <span>Min: <strong className="font-mono" style={{ color: '#ff4d6d' }}>${Math.min(...prices).toFixed(2)}</strong></span>
              <span>Max: <strong className="font-mono" style={{ color: '#4edea3' }}>${Math.max(...prices).toFixed(2)}</strong></span>
              <span style={{ color: 'var(--color-text-muted)' }}>{data.length} bar</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
