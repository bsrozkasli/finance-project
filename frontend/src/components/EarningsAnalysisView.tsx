import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  fetchEarningsByPortfolio,
  fetchEarningsContributors,
  fetchEarningsMonthly,
  fetchEarningsSources,
  fetchEarningsSummary,
  fetchEarningsYearly,
  fetchRecentTransactions,
} from '../api/redesign';
import type { EarningsPeriod, EarningsScope } from '../api/redesign';
import { usePanelQuery } from '../hooks/usePanelQuery';
import type { Portfolio } from '../types';
import PanelState from './ui/PanelState';
import EarningsChart from './transactions/EarningsChart';
import {
  BUTTON_CLASS, CARD_CLASS, DASH, INPUT_CLASS, LABEL_CLASS,
  formatDate, formatMoney, formatPercent, formatPoints, formatQuantity, sideLabel, toneClass,
} from './transactions/format';

interface EarningsAnalysisViewProps {
  portfolios: Portfolio[];
  onOpenTradeModal?: (symbol: string) => void;
}

const PERIODS: { value: EarningsPeriod; label: string }[] = [
  { value: 'M1', label: 'Bu ay' },
  { value: 'M3', label: '3 ay' },
  { value: 'YTD', label: 'Yıl başından beri' },
  { value: 'Y1', label: '12 ay' },
  { value: 'ALL', label: 'Tümü' },
];

const PAGE_SIZE = 5;
type PortfolioSort = 'GAIN' | 'RETURN' | 'VALUE';
const SORTS: { value: PortfolioSort; label: string }[] = [
  { value: 'GAIN', label: 'Kazanç' },
  { value: 'RETURN', label: 'Getiri' },
  { value: 'VALUE', label: 'Değer' },
];

const periodLabel = (period: EarningsPeriod) => PERIODS.find((entry) => entry.value === period)?.label ?? period;

function Panel({ title, id, children, hint }: { title: string; id: string; children: ReactNode; hint?: string }) {
  return (
    <section className={CARD_CLASS} aria-labelledby={id}>
      <h3 id={id} className="font-headline text-sm font-bold uppercase tracking-wide text-text-primary">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function EarningsAnalysisView({ portfolios, onOpenTradeModal }: EarningsAnalysisViewProps) {
  const [scopeId, setScopeId] = useState<string>('ALL');
  const [period, setPeriod] = useState<EarningsPeriod>('YTD');
  const [sort, setSort] = useState<PortfolioSort>('GAIN');
  const [page, setPage] = useState(0);

  const scope: EarningsScope = scopeId === 'ALL' ? 'ALL' : `PORTFOLIO:${Number(scopeId)}`;
  const recentPortfolioId = scopeId === 'ALL' ? undefined : Number(scopeId);

  const summary = usePanelQuery(() => fetchEarningsSummary(scope), [scope]);
  const monthly = usePanelQuery(() => fetchEarningsMonthly(scope, 12), [scope]);
  const sources = usePanelQuery(() => fetchEarningsSources(scope, period), [scope, period]);
  const yearly = usePanelQuery(() => fetchEarningsYearly(scope), [scope]);
  const winners = usePanelQuery(() => fetchEarningsContributors('WINNERS', { scope, period, limit: 5 }), [scope, period]);
  const losers = usePanelQuery(() => fetchEarningsContributors('LOSERS', { scope, period, limit: 5 }), [scope, period]);
  const byPortfolio = usePanelQuery(
    () => fetchEarningsByPortfolio({ period, sort, limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
    [period, sort, page],
  );
  const recent = usePanelQuery(() => fetchRecentTransactions({ limit: 10, portfolioId: recentPortfolioId }), [recentPortfolioId]);

  const selectScope = (next: string) => { setScopeId(next); };

  const scopeKnown = scopeId === 'ALL' || portfolios.some((portfolio) => portfolio.id === scopeId);

  const monthlyItems = monthly.data?.items ?? [];
  const knownMonths = monthlyItems.filter((item) => item.gain != null);
  const best = knownMonths.reduce<(typeof knownMonths)[number] | null>((acc, item) => (acc == null || (item.gain ?? 0) > (acc.gain ?? 0) ? item : acc), null);
  const worst = knownMonths.reduce<(typeof knownMonths)[number] | null>((acc, item) => (acc == null || (item.gain ?? 0) < (acc.gain ?? 0) ? item : acc), null);

  const src = sources.data;
  const residual = src?.residual;
  const hasResidual = residual != null && residual !== 0;

  const total = byPortfolio.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6">
      <div className="mb-5">
        <div className="text-xs font-label-caps uppercase tracking-wider text-text-muted">İşlem kayıtları</div>
        <h2 className="mt-1 font-headline text-2xl font-bold tracking-tight text-text-primary">Kazanç Analizi</h2>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Kazanç = bitiş değeri − başlangıç değeri − net yatırılan sermaye. Tüm tutarlar sunucudan gelir; eksik veri sıfır gösterilmez.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-48">
          <label htmlFor="earnings-scope" className={LABEL_CLASS}>Kapsam</label>
          <select id="earnings-scope" value={scopeId} onChange={(event) => selectScope(event.target.value)} className={INPUT_CLASS}>
            <option value="ALL">Tüm portföyler</option>
            {!scopeKnown ? <option value={scopeId}>{`Portföy ${scopeId}`}</option> : null}
            {portfolios.map((portfolio) => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
          </select>
        </div>
        <div role="group" aria-label="Dönem" className="flex flex-wrap gap-2">
          {PERIODS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={period === option.value}
              onClick={() => { setPeriod(option.value); setPage(0); }}
              className={`min-h-11 rounded-md border px-3 text-sm font-bold ${period === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-bg-card text-text-secondary hover:text-text-primary'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <Panel title="Dönem özeti" id="earnings-summary-title">
          <PanelState state={summary.state} notes={summary.data?.notes} onRetry={summary.reload} label="Dönem özeti" emptyMessage="Bu kapsam için kazanç verisi yok.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(summary.data?.items ?? []).map((item) => (
                <div
                  key={item.period}
                  data-testid={`summary-${item.period}`}
                  className={`rounded-md border p-3 ${item.period === period ? 'border-primary' : 'border-outline-variant'} bg-bg-base/45`}
                >
                  <div className="text-xs font-label-caps uppercase tracking-wide text-text-muted">{periodLabel(item.period)}</div>
                  <div className={`mt-1 font-data-mono text-lg font-bold ${toneClass(item.gain)}`}>{formatMoney(item.gain, summary.data?.currency)}</div>
                  <div className={`font-data-mono text-sm ${toneClass(item.returnPct)}`}>{formatPercent(item.returnPct)}</div>
                  <div className="mt-1 text-xs text-text-muted">BIST 100: {formatPercent(item.benchmarkReturnPct)}</div>
                  <dl className="mt-2 space-y-0.5 text-xs text-text-muted">
                    <div className="flex justify-between"><dt>Gerçekleşen</dt><dd className="font-data-mono">{formatMoney(item.realized, summary.data?.currency)}</dd></div>
                    <div className="flex justify-between"><dt>Gerçekleşmemiş</dt><dd className="font-data-mono">{formatMoney(item.unrealized, summary.data?.currency)}</dd></div>
                    <div className="flex justify-between"><dt>Temettü</dt><dd className="font-data-mono">{formatMoney(item.dividends, summary.data?.currency)}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          </PanelState>
        </Panel>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel title="Aylık kazanç" id="earnings-monthly-title" hint="Çubuklar aylık kazanç, çizgi kümülatif kazanç">
            <PanelState state={monthly.state} notes={monthly.data?.notes} onRetry={monthly.reload} label="Aylık kazanç" emptyMessage="Aylık kazanç verisi yok.">
              <EarningsChart items={monthlyItems} currency={monthly.data?.currency} />
              <p className="mt-2 text-xs text-text-muted">
                En iyi ay: {best ? `${best.month} (${formatMoney(best.gain, monthly.data?.currency)})` : DASH}
                {' · '}En kötü ay: {worst ? `${worst.month} (${formatMoney(worst.gain, monthly.data?.currency)})` : DASH}
                {monthly.data?.positiveMonths != null ? ` · Pozitif ay: ${monthly.data.positiveMonths}` : ''}
              </p>
            </PanelState>
          </Panel>

          <Panel title="Kazanç kaynakları" id="earnings-sources-title" hint={`Dönem: ${periodLabel(period)}`}>
            <PanelState state={sources.state} notes={sources.data?.notes} onRetry={sources.reload} label="Kazanç kaynakları" emptyMessage="Kazanç kaynağı verisi yok.">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt>Gerçekleşen kâr/zarar</dt><dd className={`font-data-mono ${toneClass(src?.realized)}`}>{formatMoney(src?.realized, src?.currency)}</dd></div>
                <div className="flex justify-between"><dt>Gerçekleşmemiş</dt><dd className={`font-data-mono ${toneClass(src?.unrealized)}`}>{formatMoney(src?.unrealized, src?.currency)}</dd></div>
                <div className="flex justify-between"><dt>Temettü</dt><dd className={`font-data-mono ${toneClass(src?.dividends)}`}>{formatMoney(src?.dividends, src?.currency)}</dd></div>
                <div className="flex justify-between"><dt>Masraflar</dt><dd className="font-data-mono">{formatMoney(src?.fees, src?.currency)}</dd></div>
                <div className="flex justify-between border-t border-outline-variant/40 pt-2 font-bold"><dt>Toplam kazanç</dt><dd className={`font-data-mono ${toneClass(src?.gain)}`}>{formatMoney(src?.gain, src?.currency)}</dd></div>
              </dl>
              {hasResidual ? (
                <p role="status" data-testid="earnings-residual" className="mt-3 rounded-md border border-warning-amber/40 bg-warning-amber/10 p-2 text-xs font-bold text-warning-amber">
                  Açıklanamayan fark: {formatMoney(residual, src?.currency)} — kalemlerin toplamı kazancı tam karşılamıyor.
                </p>
              ) : null}
            </PanelState>
          </Panel>
        </div>

        <Panel title="Yıllık özet" id="earnings-yearly-title">
          <PanelState state={yearly.state} notes={yearly.data?.notes} onRetry={yearly.reload} label="Yıllık özet" emptyMessage="Yıllık özet verisi yok.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Yıllık kazanç özeti</caption>
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th scope="col" className="px-2 py-2">Yıl</th>
                    <th scope="col" className="px-2 py-2">Başlangıç değeri</th>
                    <th scope="col" className="px-2 py-2">Net para girişi</th>
                    <th scope="col" className="px-2 py-2">Kazanç</th>
                    <th scope="col" className="px-2 py-2">Getiri</th>
                    <th scope="col" className="px-2 py-2">BIST 100</th>
                    <th scope="col" className="px-2 py-2">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {(yearly.data?.items ?? []).map((row) => (
                    <tr key={row.year} className="border-t border-outline-variant/25">
                      <th scope="row" className="px-2 py-2 font-data-mono">{row.year}</th>
                      <td className="px-2 py-2 font-data-mono">{formatMoney(row.startValue, yearly.data?.currency)}</td>
                      <td className="px-2 py-2 font-data-mono">{formatMoney(row.netFlow, yearly.data?.currency)}</td>
                      <td className={`px-2 py-2 font-data-mono ${toneClass(row.gain)}`}>{formatMoney(row.gain, yearly.data?.currency)}</td>
                      <td className={`px-2 py-2 font-data-mono ${toneClass(row.returnPct)}`}>{formatPercent(row.returnPct)}</td>
                      <td className="px-2 py-2 font-data-mono">{formatPercent(row.benchmarkReturnPct)}</td>
                      <td className={`px-2 py-2 font-data-mono ${toneClass(row.differencePp)}`}>{formatPoints(row.differencePp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelState>
        </Panel>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {([['En çok kazandıranlar', 'earnings-winners-title', winners], ['En çok kaybettirenler', 'earnings-losers-title', losers]] as const).map(([title, id, query]) => (
            <Panel key={id} title={title} id={id} hint={`Dönem: ${periodLabel(period)}`}>
              <PanelState state={query.state} notes={query.data?.notes} onRetry={query.reload} label={title} emptyMessage="Katkı verisi yok.">
                <ul className="divide-y divide-outline-variant/25">
                  {(query.data?.items ?? []).map((item) => (
                    <li key={item.symbol} className="flex items-center justify-between py-1 text-sm">
                      {onOpenTradeModal ? (
                        <button type="button" onClick={() => onOpenTradeModal(item.symbol)} className="min-h-11 font-data-mono font-bold text-primary hover:text-text-primary">{item.symbol}</button>
                      ) : <span className="font-data-mono font-bold">{item.symbol}</span>}
                      <span className={`font-data-mono ${toneClass(item.contribution)}`}>{formatMoney(item.contribution, query.data?.currency)}</span>
                    </li>
                  ))}
                </ul>
              </PanelState>
            </Panel>
          ))}
        </div>

        <Panel title="Portföy bazında kazanç" id="earnings-portfolios-title" hint="Satıra tıklayarak kapsamı o portföye daraltın">
          <div role="group" aria-label="Sıralama" className="mb-3 flex flex-wrap gap-2">
            {SORTS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={sort === option.value}
                onClick={() => { setSort(option.value); setPage(0); }}
                className={`min-h-11 rounded-md border px-3 text-sm font-bold ${sort === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-bg-base text-text-secondary hover:text-text-primary'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <PanelState state={byPortfolio.state} notes={byPortfolio.data?.notes} onRetry={byPortfolio.reload} label="Portföy bazında kazanç" emptyMessage="Portföy kazanç verisi yok.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Portföy bazında kazanç sıralaması</caption>
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th scope="col" className="px-2 py-2">#</th>
                    <th scope="col" className="px-2 py-2">Portföy</th>
                    <th scope="col" className="px-2 py-2">Değer</th>
                    <th scope="col" className="px-2 py-2">Kazanç</th>
                    <th scope="col" className="px-2 py-2">Getiri</th>
                    <th scope="col" className="px-2 py-2">BIST farkı</th>
                  </tr>
                </thead>
                <tbody>
                  {(byPortfolio.data?.items ?? []).map((row) => (
                    <tr key={row.portfolioId} className="border-t border-outline-variant/25">
                      <td className="px-2 py-2 font-data-mono">{row.rank}</td>
                      <td className="px-2 py-1">
                        <button
                          type="button"
                          aria-label={`${row.name} portföyüne daralt`}
                          aria-current={scopeId === String(row.portfolioId) ? 'true' : undefined}
                          onClick={() => selectScope(String(row.portfolioId))}
                          className="min-h-11 text-left font-bold text-primary hover:text-text-primary"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-2 py-2 font-data-mono">{formatMoney(row.value, byPortfolio.data?.currency)}</td>
                      <td className={`px-2 py-2 font-data-mono ${toneClass(row.gain)}`}>{formatMoney(row.gain, byPortfolio.data?.currency)}</td>
                      <td className={`px-2 py-2 font-data-mono ${toneClass(row.returnPct)}`}>{formatPercent(row.returnPct)}</td>
                      <td className={`px-2 py-2 font-data-mono ${toneClass(row.benchmarkDifferencePp)}`}>{formatPoints(row.benchmarkDifferencePp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-text-muted">
              <button type="button" className={BUTTON_CLASS} disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>← Önceki</button>
              <span>Sayfa {page + 1} / {pageCount} · {total} portföy</span>
              <button type="button" className={BUTTON_CLASS} disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Sonraki →</button>
            </div>
          </PanelState>
        </Panel>

        <Panel title="Son işlemler" id="earnings-recent-title" hint="Satışlarda gerçekleşen kâr/zarar ortalama maliyete göre">
          <PanelState state={recent.state} notes={recent.data?.notes} onRetry={recent.reload} label="Son işlemler" emptyMessage="Henüz işlem yok.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Son işlemler</caption>
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th scope="col" className="px-2 py-2">Tarih</th>
                    <th scope="col" className="px-2 py-2">Yön</th>
                    <th scope="col" className="px-2 py-2">Ticker</th>
                    <th scope="col" className="px-2 py-2">Adet</th>
                    <th scope="col" className="px-2 py-2">Fiyat</th>
                    <th scope="col" className="px-2 py-2">Tutar</th>
                    <th scope="col" className="px-2 py-2">Gerçekleşen K/Z</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent.data?.items ?? []).map((item) => (
                    <tr key={item.transactionId} className="border-t border-outline-variant/25">
                      <td className="px-2 py-2">{formatDate(item.date)}</td>
                      <td className="px-2 py-2">{sideLabel(item.side)}</td>
                      <td className="px-2 py-2 font-data-mono font-bold">{item.symbol ?? DASH}</td>
                      <td className="px-2 py-2 font-data-mono">{formatQuantity(item.quantity)}</td>
                      <td className="px-2 py-2 font-data-mono">{formatMoney(item.price, recent.data?.currency)}</td>
                      <td className="px-2 py-2 font-data-mono">{formatMoney(item.amount, recent.data?.currency)}</td>
                      <td className={`px-2 py-2 font-data-mono ${toneClass(item.realizedPnl)}`}>{item.side === 'SELL' ? formatMoney(item.realizedPnl, recent.data?.currency) : DASH}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PanelState>
        </Panel>
      </div>
    </div>
  );
}
