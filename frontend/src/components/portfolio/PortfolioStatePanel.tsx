import { useState } from 'react';
import { createPortfolioState, getApiErrorMessage } from '../../api/client';
import type {
  PortfolioState,
  PortfolioStateExposureStatus,
  PortfolioStateValuationStatus,
} from '../../api/client';

interface PortfolioStatePanelProps {
  portfolioId: number;
}

const UNKNOWN = 'bilinmiyor';
const NUM = 'px-3 py-2 text-right font-data-mono text-text-primary';

// Unknown values show an em dash (SPEC); the words stay in the accessible name and tooltip.
const unknown = <span role="img" aria-label={UNKNOWN} title={UNKNOWN}>—</span>;
const ERROR_CLASS = 'mt-4 rounded-md border border-bear-red/40 bg-bear-red/10 px-3 py-2 text-xs text-bear-red';

const POSITION_HEADERS: Array<[string, string]> = [
  ['Sembol', ''], ['Tür', ''], ['Adet', 'text-right'], ['Ort. maliyet', 'text-right'], ['Fiyat', 'text-right'],
  ['Fiyat tarihi', ''], ['Piyasa değeri', 'text-right'], ['Ağırlık', 'text-right'], ['Para birimi', ''],
  ['Değerleme', ''],
];

const EXPOSURE_LABELS: Record<PortfolioStateExposureStatus, string> = {
  COMPLETE: 'Tam',
  PARTIAL: 'Kısmi',
  EMPTY: 'Boş',
};

const VALUATION_LABELS: Record<PortfolioStateValuationStatus, string> = {
  PRICED: 'Fiyatlandı',
  STALE_PRICE: 'Eski fiyat',
  NO_PRICE: 'Fiyat yok',
  CURRENCY_UNKNOWN: 'Para birimi bilinmiyor',
  CURRENCY_MISMATCH: 'Para birimi uyumsuz',
  CLOSED: 'Kapalı',
};

// The backend compares as-of with the UTC date, so the picker limit uses it too.
const todayUtc = () => new Date().toISOString().slice(0, 10);

const shortVersion = (version: string) => (version.length > 22 ? `${version.slice(0, 22)}…` : version);

const formatNumber = (value: number | null) => (
  value == null ? unknown : value.toLocaleString('tr-TR', { maximumFractionDigits: 8 })
);

const formatPercent = (value: number | null) => (
  value == null
    ? unknown
    : `%${(value * 100).toFixed(2).replace('.', ',')}`
);

export default function PortfolioStatePanel({ portfolioId }: PortfolioStatePanelProps) {
  const [asOf, setAsOf] = useState(todayUtc);
  const [state, setState] = useState<PortfolioState | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const maxDate = todayUtc();
  const isFuture = asOf > maxDate;
  const canCreate = asOf !== '' && !isFuture && !isCreating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setIsCreating(true);
    setError('');
    try {
      setState(await createPortfolioState(portfolioId, asOf));
    } catch (createError) {
      setState(null);
      setError(getApiErrorMessage(createError, 'Durum oluşturulamadı.'));
    } finally {
      setIsCreating(false);
    }
  };

  const weightEntries = state ? Object.entries(state.assetTypeWeights) : [];

  return (
    <section aria-labelledby="portfolio-state-title" className="rounded-md border border-outline-variant bg-bg-card p-5 md:p-6">
      <h2 id="portfolio-state-title" className="text-base font-bold text-text-primary">Portföy durumu</h2>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="portfolio-state-asof" className="text-xs font-bold text-text-secondary">Durum tarihi</label>
          <input
            id="portfolio-state-asof"
            type="date"
            value={asOf}
            max={maxDate}
            onChange={(event) => setAsOf(event.target.value)}
            className="rounded-md border border-outline-variant px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={!canCreate}
          className="rounded-md border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/15 disabled:opacity-50"
        >
          {isCreating ? 'Oluşturuluyor…' : 'Durum oluştur'}
        </button>
      </div>
      {isFuture && <p className="mt-2 text-xs text-warning-amber">Tarih bugünden sonra olamaz.</p>}

      {error && (
        <p role="alert" className={ERROR_CLASS}>
          {error}
        </p>
      )}

      {state && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-text-primary">
            Sürüm: <span className="font-data-mono font-bold" title={state.version}>{shortVersion(state.version)}</span>
            {' · '}Maruz kalma durumu: <strong>{EXPOSURE_LABELS[state.exposureStatus]}</strong>
          </p>
          <p className="text-xs text-text-muted">Sürüm yalnızca bu durumun kimliğidir; yatırım sinyali değildir.</p>

          {state.exposureStatus === 'PARTIAL' && (
            <p className="rounded-md border border-warning-amber/35 bg-warning-amber/10 px-3 py-2 text-xs text-warning-amber">
              Bazı pozisyonların kullanılabilir fiyatı veya eşleşen para birimi yok; bu nedenle ağırlıklar
              gösterilmiyor.
            </p>
          )}

          {state.positions.length === 0 ? (
            <p className="text-xs text-text-muted">Bu tarihte açık pozisyon yok.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-outline-variant/40">
              <table aria-label="Durum pozisyonları" className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-bg-base text-xs uppercase tracking-wider text-text-muted">
                  <tr>
                    {POSITION_HEADERS.map(([label, align]) => (
                      <th key={label} scope="col" className={`px-3 py-2 ${align}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {state.positions.map((position) => (
                    <tr key={position.symbol}>
                      <td className="px-3 py-2 font-data-mono font-black text-text-primary">{position.symbol}</td>
                      <td className="px-3 py-2 text-text-secondary">{position.assetType}</td>
                      <td className={NUM}>{formatNumber(position.quantity)}</td>
                      <td className={NUM}>{formatNumber(position.averageCost)}</td>
                      <td className={NUM}>{formatNumber(position.price)}</td>
                      <td className="px-3 py-2 font-data-mono text-text-secondary">{position.priceDate ?? unknown}</td>
                      <td className={NUM}>{formatNumber(position.marketValue)}</td>
                      <td className={NUM}>
                        {state.exposureStatus === 'COMPLETE' ? formatPercent(position.weight) : unknown}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">{position.currency ?? unknown}</td>
                      <td className="px-3 py-2 text-text-secondary">{VALUATION_LABELS[position.valuationStatus]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {state.exposureStatus === 'COMPLETE' && weightEntries.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-outline-variant/40">
              <table aria-label="Varlık türü ağırlıkları" className="w-full text-left text-xs">
                <thead className="bg-bg-base text-xs uppercase tracking-wider text-text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">Varlık türü</th>
                    <th scope="col" className="px-3 py-2 text-right">Ağırlık</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {weightEntries.map(([assetType, weight]) => (
                    <tr key={assetType}>
                      <td className="px-3 py-2 font-data-mono text-text-primary">{assetType}</td>
                      <td className={NUM}>{formatPercent(weight)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
