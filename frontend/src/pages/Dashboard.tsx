import { useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { TopBar } from '../components/terminal/TopBar';
import { LeftNav } from '../components/terminal/LeftNav';
import { MarketGrid } from '../components/terminal/MarketGrid';
import { RightPanel } from '../components/terminal/RightPanel';
import { ChartOverlay } from '../components/ChartOverlay';
import { RightSidebar } from '../components/RightSidebar';

export const Dashboard = () => {
  const { assets, loading, error, addAssets } = useAssets();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="terminal-root">
      {/* Top Bar */}
      <TopBar
        assets={assets}
        onSelectAsset={(sym) => setSelectedSymbol(sym)}
        onManageAssets={() => setManageOpen(true)}
      />

      {/* Left Navigation */}
      <LeftNav />

      {/* Main Content — Market Grid */}
      {error ? (
        <div
          className="terminal-main flex items-center justify-center"
          style={{ background: 'var(--color-bg-primary)' }}
        >
          <div
            className="flex flex-col items-center gap-3 p-6 rounded-xl max-w-md text-center"
            style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.2)' }}
          >
            <svg width="32" height="32" fill="none" stroke="var(--color-bear)" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            <div>
              <div className="font-semibold mb-1" style={{ color: 'var(--color-bear)' }}>Bağlantı Hatası</div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
              <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Backend sunucusunun çalıştığından emin olun (port 8080)
              </div>
            </div>
          </div>
        </div>
      ) : (
        <MarketGrid
          assets={assets}
          loading={loading}
          selectedSymbol={selectedSymbol}
          onSelectAsset={(sym) => setSelectedSymbol(sym)}
          onOpenChart={(sym) => setChartSymbol(sym)}
        />
      )}

      {/* Right Analysis Panel */}
      <RightPanel
        selectedSymbol={selectedSymbol}
        assets={assets}
      />

      {/* Chart Modal (unchanged) */}
      {chartSymbol && (
        <ChartOverlay
          symbol={chartSymbol}
          onClose={() => setChartSymbol(null)}
        />
      )}

      {/* Manage Assets Drawer */}
      <RightSidebar
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        onAddAssets={addAssets}
        watchedAssets={assets}
        onSelectAsset={(asset) => {
          setSelectedSymbol(asset.symbol);
          setManageOpen(false);
        }}
      />
    </div>
  );
};
