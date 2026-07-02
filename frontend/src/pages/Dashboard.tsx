import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAssets } from '../hooks/useAssets';
import { TopBar } from '../components/terminal/TopBar';
import { LeftNav } from '../components/terminal/LeftNav';
import { MarketGrid } from '../components/terminal/MarketGrid';
import { DashboardHome } from '../components/terminal/DashboardHome';
import { RightPanel } from '../components/terminal/RightPanel';
import { ChartOverlay } from '../components/ChartOverlay';
import { RightSidebar } from '../components/RightSidebar';
import { NewsView } from '../components/terminal/NewsView';
import { ReportsView } from '../components/terminal/ReportsView';
import { TradingJournalView } from '../components/terminal/TradingJournalView';
import { ChartWorkspace } from '../features/chart/components/ChartWorkspace';
import { PortfolioView } from '../components/terminal/PortfolioView';

const NO_RIGHT_PANEL_TABS = ['workspace', 'portfolio', 'transactions', 'journal', 'watchlist', 'reports'];
const NAV_PATHS: Record<string, string> = {
  dashboard: '/dashboard',
  workspace: '/workspace',
  portfolio: '/portfolio',
  transactions: '/transactions',
  journal: '/journal',
  watchlist: '/watchlist',
  news: '/news',
  reports: '/reports',
};

const normalizeSymbolParam = (symbol?: string) => symbol?.trim().toUpperCase() || null;

const getActiveTab = (pathname: string) => {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment || 'dashboard';
};

const SymbolRoute = ({
  onSymbol,
  children,
}: {
  onSymbol: (symbol: string | null) => void;
  children: (symbol: string | null) => ReactNode;
}) => {
  const { symbol } = useParams();
  const normalizedSymbol = normalizeSymbolParam(symbol);

  useEffect(() => {
    if (normalizedSymbol) {
      onSymbol(normalizedSymbol);
    }
  }, [normalizedSymbol, onSymbol]);

  return <>{children(normalizedSymbol)}</>;
};


export const Dashboard = () => {
  const { assets, loading, error, addAssets, removeAsset } = useAssets();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [navExpanded, setNavExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = getActiveTab(location.pathname);
  const isDashboard = activeTab === 'dashboard';
  const noRightPanel = NO_RIGHT_PANEL_TABS.includes(activeTab);

  const handleSelectAsset = (symbol: string) => {
    const normalizedSymbol = symbol.toUpperCase();
    setSelectedSymbol(normalizedSymbol);

    if (activeTab === 'reports' || activeTab === 'news' || activeTab === 'workspace') {
      navigate(`${NAV_PATHS[activeTab]}/${normalizedSymbol}`);
    }
  };

  return (
    <div
      className={`terminal-root ${navExpanded ? 'nav-expanded' : ''} ${isDashboard ? 'dashboard-mode' : ''} ${noRightPanel ? 'no-right-panel' : ''}`}
    >
      <TopBar
        assets={assets}
        onSelectAsset={handleSelectAsset}
        onManageAssets={() => setManageOpen(true)}
      />

      <LeftNav
        activeId={activeTab}
        onSelect={(id) => navigate(NAV_PATHS[id] ?? '/dashboard')}
        onExpandedChange={setNavExpanded}
      />

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
              <div className="font-semibold mb-1" style={{ color: 'var(--color-bear)' }}>Connection error</div>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
              <div className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Make sure the backend is running on port 8080.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <DashboardHome
                assets={assets}
                loading={loading}
                selectedSymbol={selectedSymbol}
                onSelectAsset={handleSelectAsset}
                onOpenChart={(sym) => setChartSymbol(sym)}
                onManageAssets={() => setManageOpen(true)}
              />
            }
          />
          <Route
            path="/workspace"
            element={<ChartWorkspace assets={assets} initialSymbol={selectedSymbol} onSymbolChange={(symbol) => navigate(`/workspace/${symbol.toUpperCase()}`)} />}
          />
          <Route
            path="/workspace/:symbol"
            element={
              <SymbolRoute onSymbol={setSelectedSymbol}>
                {(symbol) => (
                  <ChartWorkspace
                    assets={assets}
                    initialSymbol={symbol}
                    onSymbolChange={(nextSymbol) => navigate(`/workspace/${nextSymbol.toUpperCase()}`)}
                  />
                )}
              </SymbolRoute>
            }
          />
          <Route path="/portfolio" element={<PortfolioView />} />
          <Route path="/portfolio/:portfolioId" element={<PortfolioView />} />
          <Route path="/transactions" element={<TradingJournalView />} />
          <Route
            path="/watchlist"
            element={
              <MarketGrid
                assets={assets}
                loading={loading}
                selectedSymbol={selectedSymbol}
                onSelectAsset={handleSelectAsset}
                onOpenChart={(sym) => setChartSymbol(sym)}
              />
            }
          />
          <Route
            path="/scanner"
            element={
              <MarketGrid
                assets={assets}
                loading={loading}
                selectedSymbol={selectedSymbol}
                onSelectAsset={handleSelectAsset}
                onOpenChart={(sym) => setChartSymbol(sym)}
              />
            }
          />
          <Route path="/news" element={<NewsView symbol={selectedSymbol} />} />
          <Route
            path="/news/:symbol"
            element={
              <SymbolRoute onSymbol={setSelectedSymbol}>
                {(symbol) => <NewsView symbol={symbol ?? selectedSymbol} />}
              </SymbolRoute>
            }
          />
          <Route path="/journal" element={<TradingJournalView />} />
          <Route
            path="/reports"
            element={
              <ReportsView
                assets={assets}
                initialSymbol={selectedSymbol}
                onSelectSymbol={(symbol) => navigate(`/reports/${symbol.toUpperCase()}`)}
              />
            }
          />
          <Route
            path="/reports/:symbol"
            element={
              <SymbolRoute onSymbol={setSelectedSymbol}>
                {(symbol) => (
                  <ReportsView
                    assets={assets}
                    initialSymbol={symbol}
                    onSelectSymbol={(nextSymbol) => navigate(`/reports/${nextSymbol.toUpperCase()}`)}
                  />
                )}
              </SymbolRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      )}

      {!noRightPanel && !isDashboard && (
        <RightPanel
          selectedSymbol={selectedSymbol}
          assets={assets}
        />
      )}

      {chartSymbol && (
        <ChartOverlay
          symbol={chartSymbol}
          onClose={() => setChartSymbol(null)}
        />
      )}

      <RightSidebar
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        onAddAssets={addAssets}
        onRemoveAsset={removeAsset}
        watchedAssets={assets}
        onSelectAsset={(asset) => {
          handleSelectAsset(asset.symbol);
          setManageOpen(false);
        }}
      />
    </div>
  );
};





