import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  deleteStopLevels,
  fetchHoldingsAnalysis,
  fetchPortfolioAllocation,
  fetchPortfolioGains,
  fetchPortfolioSummaryV2,
  fetchRebalanceSuggestions,
  fetchRiskAlerts,
  fetchStopLevels,
  fetchTargetWeights,
  putStopLevels,
  putTargetWeights,
} from '../../api/redesign';
import type { AlertSeverity, Allocation, StopStatus, TargetWeights } from '../../api/redesign';
import { usePanelQuery } from '../../hooks/usePanelQuery';
import PanelState from '../ui/PanelState';
import { DASH, fmtMoney, fmtPct, fmtSignedMoney, fmtSignedPct, toneClass } from './format';

const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section aria-label={title} className="rounded-md border border-outline-variant bg-bg-card p-4 md:p-5">
    <h2 className="mb-3 font-headline text-lg font-bold text-text-primary">{title}</h2>
    {children}
  </section>
);

const Kpi = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="rounded-md border border-outline-variant/60 bg-bg-base/40 p-3">
    <div className="text-xs font-bold text-text-muted">{label}</div>
    <div className={`mt-1 font-data-mono text-lg font-bold ${tone ?? 'text-text-primary'}`}>{value}</div>
  </div>
);

const inputClass = 'min-h-11 w-full rounded-md border border-outline-variant/40 bg-bg-base px-3 text-sm text-text-primary';
const buttonClass = 'min-h-11 rounded-md border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary hover:bg-primary/15 disabled:opacity-45';

function SummaryKpis({ portfolioId }: { portfolioId: number }) {
  const query = usePanelQuery(() => fetchPortfolioSummaryV2(portfolioId), [portfolioId]);
  const d = query.data;
  return (
    <Panel title="Portföy özeti">
      <PanelState state={query.state} notes={d?.notes} onRetry={query.reload} label="Portföy özeti">
        {d && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Kpi label="Toplam değer" value={fmtMoney(d.value, d.currency)} />
              <Kpi label="Nakit" value={fmtMoney(d.cash, d.currency)} />
              <Kpi label="Günlük değişim" value={`${fmtSignedMoney(d.dayChange, d.currency)} (${fmtSignedPct(d.dayChangePct)})`} tone={toneClass(d.dayChange)} />
              <Kpi label="Gerçekleşmemiş K/Z" value={`${fmtSignedMoney(d.unrealizedPnl, d.currency)} (${fmtSignedPct(d.unrealizedPnlPct)})`} tone={toneClass(d.unrealizedPnl)} />
              <Kpi label="Gerçekleşen K/Z (YTD)" value={fmtSignedMoney(d.realizedPnlYtd, d.currency)} tone={toneClass(d.realizedPnlYtd)} />
            </div>
            {d.pricingComplete === false && (
              <p className="mt-2 text-xs text-warning-amber">Fiyatı olmayan pozisyonlar: {d.unpricedSymbols?.join(', ') || DASH}</p>
            )}
          </>
        )}
      </PanelState>
    </Panel>
  );
}

const DONUT_COLORS = ['#14c8a6', '#4c8dff', '#f5a524', '#b27cff', '#ff6b8a', '#7bd88f', '#5ad1e6', '#c9a227'];
const RADIUS = 15.9155; // circumference = 100, so dash lengths are percentages.

function Donut({ slices, label }: { slices: Allocation['slices']; label: string }) {
  const usable = slices.filter((slice) => slice.weight != null && slice.weight > 0);
  const summary = usable.map((slice) => `${slice.label} ${fmtPct(slice.weight)}`).join(', ');
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 42 42" className="h-40 w-40" role="img" aria-label={`${label}: ${summary || 'veri yok'}`}>
        <circle cx="21" cy="21" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
        {usable.map((slice, index) => {
          const length = (slice.weight ?? 0) * 100;
          const offset = usable.slice(0, index).reduce((acc, s) => acc + (s.weight ?? 0) * 100, 0);
          return (
            <circle
              key={slice.key}
              cx="21"
              cy="21"
              r={RADIUS}
              fill="none"
              stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
              strokeWidth="6"
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={25 - offset}
            />
          );
        })}
      </svg>
      <ul className="space-y-1 text-xs">
        {slices.map((slice, index) => (
          <li key={slice.key} className="flex items-center gap-2 text-text-secondary">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} aria-hidden="true" />
            <span className="text-text-primary">{slice.label}</span>
            <span className="font-data-mono">{fmtPct(slice.weight)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HoldingAllocation({ portfolioId }: { portfolioId: number }) {
  const query = usePanelQuery(() => fetchPortfolioAllocation(portfolioId, 'HOLDING'), [portfolioId]);
  return (
    <Panel title="Şirket dağılımı">
      <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label="Şirket dağılımı" emptyMessage="Dağılım için pozisyon yok">
        {query.data && <Donut slices={query.data.slices} label="Şirket dağılımı" />}
      </PanelState>
    </Panel>
  );
}

function SectorAllocation({ portfolioId }: { portfolioId: number }) {
  const query = usePanelQuery(() => fetchPortfolioAllocation(portfolioId, 'SECTOR'), [portfolioId]);
  const d = query.data;
  const limit = d?.limitWeight ?? null;
  return (
    <Panel title="Sektör dağılımı">
      <PanelState state={query.state} notes={d?.notes} onRetry={query.reload} label="Sektör dağılımı" emptyMessage="Sektör verisi yok">
        {d && (
          <ul className="space-y-3">
            {d.slices.map((slice) => {
              const over = limit != null && slice.weight != null && slice.weight > limit;
              return (
                <li key={slice.key}>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-primary">{slice.label}</span>
                    <span className={`font-data-mono ${over ? 'text-warning-amber' : 'text-text-secondary'}`}>{fmtPct(slice.weight)}</span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-outline-variant/30" role="meter" aria-label={`${slice.label} ağırlığı`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((slice.weight ?? 0) * 100)}>
                    <div className={`h-2 rounded-full ${over ? 'bg-warning-amber' : 'bg-primary'}`} style={{ width: `${Math.min(100, (slice.weight ?? 0) * 100)}%` }} />
                    {limit != null && <span className="absolute -top-1 h-4 w-0.5 bg-text-primary" style={{ left: `${Math.min(100, limit * 100)}%` }} aria-hidden="true" />}
                  </div>
                </li>
              );
            })}
            {limit != null && <li className="text-xs text-text-muted">Sınır: {fmtPct(limit, 0)}</li>}
          </ul>
        )}
      </PanelState>
    </Panel>
  );
}

function GainStatus({ portfolioId }: { portfolioId: number }) {
  const query = usePanelQuery(() => fetchPortfolioGains(portfolioId), [portfolioId]);
  const d = query.data;
  return (
    <Panel title="Kazanç durumu">
      <PanelState state={query.state} notes={d?.notes} onRetry={query.reload} label="Kazanç durumu" emptyMessage="Pozisyon yok">
        {d && (
          <>
            <p className="mb-2 text-xs text-text-secondary">
              Kazanan {d.winners ?? DASH} · Kaybeden {d.losers ?? DASH} · Net <span className={`font-data-mono ${toneClass(d.net)}`}>{fmtSignedMoney(d.net, d.currency)}</span>
            </p>
            <ul className="space-y-1 text-xs">
              {d.items.map((item) => (
                <li key={item.symbol} className="flex justify-between gap-3">
                  <span className="font-bold text-text-primary">{item.symbol}</span>
                  <span className={`font-data-mono ${toneClass(item.pnl)}`}>{fmtSignedMoney(item.pnl, d.currency)} ({fmtSignedPct(item.pnlPct)})</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </PanelState>
    </Panel>
  );
}

const SEVERITIES: Array<{ id: AlertSeverity | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'Tümü' },
  { id: 'CRITICAL', label: 'Kritik' },
  { id: 'WARNING', label: 'Uyarı' },
  { id: 'INFO', label: 'Bilgi' },
];
const SEVERITY_LABEL: Record<AlertSeverity, string> = { CRITICAL: 'Kritik', WARNING: 'Uyarı', INFO: 'Bilgi' };

function RiskAlertsPanel({ portfolioId }: { portfolioId: number }) {
  const query = usePanelQuery(() => fetchRiskAlerts(portfolioId), [portfolioId]);
  const [severity, setSeverity] = useState<AlertSeverity | 'ALL'>('ALL');
  const d = query.data;
  const items = d?.items.filter((item) => severity === 'ALL' || item.severity === severity) ?? [];
  return (
    <Panel title="Risk uyarıları">
      <PanelState state={query.state} notes={d?.notes} onRetry={query.reload} label="Risk uyarıları" emptyMessage="Aktif risk uyarısı yok">
        {d && (
          <>
            <div role="group" aria-label="Önem filtresi" className="mb-3 flex flex-wrap gap-2">
              {SEVERITIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={severity === item.id}
                  onClick={() => setSeverity(item.id)}
                  className={`min-h-11 rounded-md border px-3 text-xs font-bold ${severity === item.id ? 'border-primary bg-primary/15 text-primary' : 'border-outline-variant text-text-secondary'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {items.length === 0 ? <p className="text-xs text-text-muted">Bu önem düzeyinde uyarı yok.</p> : (
              <ul className="space-y-2">
                {items.map((item, index) => (
                  <li key={`${item.code}-${item.symbol ?? ''}-${index}`} className="rounded-md border border-outline-variant/60 p-3 text-xs">
                    <span className={`font-bold ${item.severity === 'CRITICAL' ? 'text-bear-red' : item.severity === 'WARNING' ? 'text-warning-amber' : 'text-text-secondary'}`}>{SEVERITY_LABEL[item.severity]}</span>
                    {' · '}<span className="font-bold text-text-primary">{item.title}</span>
                    <p className="mt-1 text-text-secondary">{item.message}</p>
                    {item.observed != null && item.limit != null && (
                      <p className="mt-1 font-data-mono text-text-muted">Gözlenen {fmtPct(item.observed)} / sınır {fmtPct(item.limit)}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {d.skipped && d.skipped.length > 0 && (
              <p className="mt-2 text-xs text-text-muted">Değerlendirilemeyen: {d.skipped.map((s) => `${s.symbol ?? DASH} (${s.reason ?? 'neden belirtilmedi'})`).join(', ')}</p>
            )}
          </>
        )}
      </PanelState>
    </Panel>
  );
}

const STOP_LABEL: Record<StopStatus, string> = { BREACHED: 'Aşıldı', AT_RISK: 'Risk altında', NEAR: 'Yakın', SAFE: 'Güvenli', NA: 'Yok' };

function StopStatusPanel({ portfolioId }: { portfolioId: number }) {
  const query = usePanelQuery(() => fetchStopLevels(portfolioId), [portfolioId]);
  const [symbol, setSymbol] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const d = query.data;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const sl = stopLoss.trim() === '' ? null : Number(stopLoss.replace(',', '.'));
    const tp = takeProfit.trim() === '' ? null : Number(takeProfit.replace(',', '.'));
    if (!symbol.trim()) { setError('Sembol gerekli.'); return; }
    if ((sl != null && !(sl > 0)) || (tp != null && !(tp > 0))) { setError('Seviyeler pozitif sayı olmalı.'); return; }
    if (sl == null && tp == null) { setError('En az bir seviye girin.'); return; }
    setBusy(true);
    setError('');
    try {
      await putStopLevels(portfolioId, symbol.trim().toUpperCase(), { stopLoss: sl, takeProfit: tp });
      setStopLoss('');
      setTakeProfit('');
      query.reload();
    } catch {
      setError('Stop seviyesi kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const clear = async (target: string) => {
    setError('');
    try {
      await deleteStopLevels(portfolioId, target);
      query.reload();
    } catch {
      setError('Stop seviyesi kaldırılamadı.');
    }
  };

  return (
    <Panel title="Stop durumu">
      <PanelState state={query.state} notes={d?.notes} onRetry={query.reload} label="Stop durumu" emptyMessage="Tanımlı stop seviyesi yok">
        {d && (
          <ul className="space-y-2">
            {d.items.map((item) => (
              <li key={`${item.symbol}-${item.type ?? ''}`} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span><span className="font-bold text-text-primary">{item.symbol}</span> · {item.type === 'TAKE_PROFIT' ? 'Kâr al' : 'Zarar durdur'} {fmtMoney(item.level, d.currency)}</span>
                <span className="font-data-mono text-text-secondary">{item.status ? STOP_LABEL[item.status] : DASH} · mesafe {fmtSignedPct(item.distance)}</span>
                <button type="button" onClick={() => void clear(item.symbol)} aria-label={`${item.symbol} stop seviyesini kaldır`} className="min-h-11 rounded-md border border-bear-red/30 px-3 font-bold text-bear-red">Kaldır</button>
              </li>
            ))}
          </ul>
        )}
      </PanelState>
      <form onSubmit={(event) => void save(event)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end" aria-label="Stop seviyesi belirle">
        <label className="text-xs font-bold text-text-muted">Sembol<input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} /></label>
        <label className="text-xs font-bold text-text-muted">Zarar durdur<input className={inputClass} inputMode="decimal" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} /></label>
        <label className="text-xs font-bold text-text-muted">Kâr al<input className={inputClass} inputMode="decimal" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} /></label>
        <button type="submit" disabled={busy} className={buttonClass}>Stop kaydet</button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs text-bear-red">{error}</p>}
    </Panel>
  );
}

function TargetEditor({ portfolioId, targets, onSaved }: { portfolioId: number; targets: TargetWeights['targets']; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(targets.map((t) => [t.key, String(+(t.weight * 100).toFixed(2))])));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    const parsed = targets.map((t) => ({ key: t.key, pct: Number((values[t.key] ?? '').replace(',', '.')) }));
    if (parsed.some((p) => !Number.isFinite(p.pct) || p.pct < 0 || p.pct > 100)) { setError('Hedefler 0 ile 100 arasında olmalı.'); return; }
    const sum = parsed.reduce((acc, p) => acc + p.pct, 0);
    if (Math.abs(sum - 100) > 0.01) { setError(`Hedef ağırlıkların toplamı %100 olmalı (şu an %${sum.toFixed(2)}).`); return; }
    setError('');
    try {
      await putTargetWeights(portfolioId, { targets: parsed.map((p) => ({ key: p.key, weight: p.pct / 100 })) });
      setSaved(true);
      onSaved();
    } catch {
      setError('Hedef ağırlıklar kaydedilemedi.');
    }
  };

  return (
    <form onSubmit={(event) => void save(event)} className="mt-4" aria-label="Hedef ağırlıkları düzenle">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {targets.map((t) => (
          <label key={t.key} className="text-xs font-bold text-text-muted">
            {t.key} hedef (%)
            <input className={inputClass} inputMode="decimal" value={values[t.key] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [t.key]: e.target.value }))} />
          </label>
        ))}
      </div>
      <button type="submit" className={`${buttonClass} mt-3`}>Hedefleri kaydet</button>
      {error && <p role="alert" className="mt-2 text-xs text-bear-red">{error}</p>}
      {saved && <p role="status" className="mt-2 text-xs text-bull-green">Hedefler kaydedildi.</p>}
    </form>
  );
}

const DIRECTION_LABEL = { INCREASE: 'Artır', REDUCE: 'Azalt', NONE: 'Değişiklik yok' } as const;

function RebalancePanel({ portfolioId }: { portfolioId: number }) {
  const targets = usePanelQuery(() => fetchTargetWeights(portfolioId), [portfolioId]);
  const suggestions = usePanelQuery(() => fetchRebalanceSuggestions(portfolioId), [portfolioId]);
  const reloadAll = () => { targets.reload(); suggestions.reload(); };
  return (
    <Panel title="Yeniden dengeleme">
      <p className="mb-3 text-xs text-text-muted">Bilgi amaçlıdır; emir oluşturmaz.</p>
      <PanelState state={suggestions.state} notes={suggestions.data?.notes} onRetry={suggestions.reload} label="Yeniden dengeleme" emptyMessage="Öneri için veri yok">
        {suggestions.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-text-muted"><tr><th className="py-1 pr-3">Varlık</th><th className="pr-3">Hedef</th><th className="pr-3">Güncel</th><th className="pr-3">Sapma (puan)</th><th>Öneri</th></tr></thead>
              <tbody>
                {suggestions.data.items.map((item) => (
                  <tr key={item.key} className="border-t border-outline-variant/40 font-data-mono">
                    <td className="py-2 pr-3 font-bold text-text-primary">{item.key}</td>
                    <td className="pr-3">{fmtPct(item.target)}</td>
                    <td className="pr-3">{fmtPct(item.current)}</td>
                    <td className="pr-3">{item.gapPp == null ? DASH : item.gapPp.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</td>
                    <td className="font-sans">{item.direction ? DIRECTION_LABEL[item.direction] : DASH}{item.notionalToClose != null ? ` · ${fmtMoney(Math.abs(item.notionalToClose), suggestions.data?.currency)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelState>
      <PanelState state={targets.state} notes={targets.data?.notes} onRetry={targets.reload} label="Hedef ağırlıklar" emptyMessage="Hedef ağırlık tanımlı değil">
        {targets.data && <TargetEditor key={JSON.stringify(targets.data.targets)} portfolioId={portfolioId} targets={targets.data.targets} onSaved={reloadAll} />}
      </PanelState>
    </Panel>
  );
}

function PositionsTable({ portfolioId }: { portfolioId: number }) {
  const query = usePanelQuery(() => fetchHoldingsAnalysis(portfolioId), [portfolioId]);
  const d = query.data;
  return (
    <Panel title="Pozisyon analizi">
      <PanelState state={query.state} notes={d?.notes} onRetry={query.reload} label="Pozisyon analizi" emptyMessage="Pozisyon yok">
        {d && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-text-muted">
                <tr><th className="py-1 pr-3">Sembol</th><th className="pr-3">Sektör</th><th className="pr-3">Fiyat</th><th className="pr-3">Değer</th><th className="pr-3">Ağırlık</th><th className="pr-3">1G</th><th className="pr-3">1H</th><th className="pr-3">1A</th><th>K/Z</th></tr>
              </thead>
              <tbody>
                {d.items.map((row) => (
                  <tr key={row.symbol} className="border-t border-outline-variant/40 font-data-mono">
                    <td className="py-2 pr-3 font-sans font-bold text-text-primary">{row.symbol}</td>
                    <td className="pr-3 font-sans">{row.sector ?? DASH}</td>
                    <td className="pr-3">{fmtMoney(row.price, d.currency)}</td>
                    <td className="pr-3">{fmtMoney(row.value, d.currency)}</td>
                    <td className="pr-3">{fmtPct(row.weight)}</td>
                    <td className={`pr-3 ${toneClass(row.return1D)}`}>{fmtSignedPct(row.return1D)}</td>
                    <td className={`pr-3 ${toneClass(row.return1W)}`}>{fmtSignedPct(row.return1W)}</td>
                    <td className={`pr-3 ${toneClass(row.return1M)}`}>{fmtSignedPct(row.return1M)}</td>
                    <td className={toneClass(row.pnl)}>{fmtSignedMoney(row.pnl, d.currency)} ({fmtSignedPct(row.pnlPct)})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelState>
    </Panel>
  );
}

/** Per-portfolio analytic panels of the v2 "Portföylerim" screen (spec 3.7). Lazy-loaded by the view. */
export default function PortfolioPanels({ portfolioId }: { portfolioId: number }) {
  return (
    <div className="space-y-6">
      <SummaryKpis portfolioId={portfolioId} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HoldingAllocation portfolioId={portfolioId} />
        <GainStatus portfolioId={portfolioId} />
        <RiskAlertsPanel portfolioId={portfolioId} />
        <SectorAllocation portfolioId={portfolioId} />
      </div>
      <StopStatusPanel portfolioId={portfolioId} />
      <RebalancePanel portfolioId={portfolioId} />
      <PositionsTable portfolioId={portfolioId} />
    </div>
  );
}
