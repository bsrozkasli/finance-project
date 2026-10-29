import { useMarketScope, type MarketScope } from '../../context/marketScope';

const OPTIONS: { value: Exclude<MarketScope, 'ALL'>; label: string }[] = [
  { value: 'BIST', label: 'BIST' },
  { value: 'US', label: 'ABD' },
];

/** BIST / ABD filter. Neither button is pressed for `ALL`; pressing the active one clears it. */
export default function MarketToggle() {
  const { market, toggleMarket } = useMarketScope();
  return (
    <div className="desk-market-toggle" role="group" aria-label="Piyasa filtresi">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={market === value}
          onClick={() => toggleMarket(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
