import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import type { Stock, Trade, Watchlist, Portfolio, CompanyLogoSource } from './types';
import type { PriceStatus } from './api/types';
import type { JournalTrade } from './api/client';
import { createPortfolioTransaction, deleteInvestmentPortfolio, deletePortfolioTransaction } from './api/client';
import { useAssets } from './hooks/useAssets';
import { useAssetMarketData } from './hooks/useAssetMarketData';
import { useInvestmentPortfolio } from './hooks/useInvestmentPortfolio';
import { useMarketContext } from './hooks/useMarketContext';
import { useWatchlists } from './hooks/useWatchlists';
import { selectDisplayQuote, useMarketOverviewData } from './hooks/useMarketOverviewData';
import { useJournalTrades } from './hooks/useJournalTrades';

// Component Imports
import TopBar from './components/TopBar';
import LeftNav from './components/LeftNav';

// Modals & Drawers
import SettingsModal from './components/SettingsModal';

const DashboardHome = lazy(() => import('./components/DashboardHome'));
const ResearchWorkspace = lazy(() => import('./components/research/ResearchWorkspace'));
const WatchlistsView = lazy(() => import('./components/WatchlistsView'));
const NewsFeedView = lazy(() => import('./components/NewsFeedView'));
const AiReportsView = lazy(() => import('./components/AiReportsView'));
const PortfolioManagerView = lazy(() => import('./components/PortfolioManagerView'));
const TradingJournalView = lazy(() => import('./components/TradingJournalView'));
const StockDetailModal = lazy(() => import('./components/StockDetailModal'));
const ManageAssetsDrawer = lazy(() => import('./components/ManageAssetsDrawer'));
const TradeActionModal = lazy(() => import('./components/TradeActionModal'));
const TradingJournalModal = lazy(() => import('./components/TradingJournalModal'));

function ResearchRoute(props: { stocks: Stock[]; assets: import('./api/types').Asset[]; onSelectStock: (stock: Stock) => void; watchlists: Watchlist[]; onAddToWatchlist: (symbol: string, id: string) => Promise<void> }) {
  const { symbol } = useParams();
  return <ResearchWorkspace key={symbol ?? 'all'} symbol={symbol} {...props} />;
}

const mapJournalTradeToUiTrade = (trade: JournalTrade): Trade => ({
  id: String(trade.id),
  symbol: trade.symbol,
  type: trade.type,
  quantity: trade.quantity,
  price: trade.purchasePrice,
  notes: trade.notes ?? '',
  date: trade.openedAt,
  portfolioId: trade.portfolioId == null ? undefined : String(trade.portfolioId),
  transactionId: trade.transactionId == null ? undefined : String(trade.transactionId),
});

const numericPortfolioId = (id: string | undefined): number | undefined => {
  if (!id) return undefined;
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : undefined;
};

function PortfolioRoute({
  portfolios,
  activePortfolioId,
  onSelectPortfolioId,
  onCreatePortfolio,
  onDeletePortfolio,
  onExecuteTrade,
  onOpenTradingJournal,
  onLedgerChanged,
  stocks,
  pricingStatus,
}: {
  portfolios: Portfolio[];
  activePortfolioId: string;
  onSelectPortfolioId: (id: string) => void;
  onCreatePortfolio: (name: string) => Promise<string>;
  onDeletePortfolio: (id: string) => Promise<void>;
  onExecuteTrade: (trade: Omit<Trade, 'id' | 'date'>) => Promise<void>;
  onOpenTradingJournal: () => void;
  onLedgerChanged: () => Promise<void>;
  stocks: Stock[];
  pricingStatus?: PriceStatus | null;
}) {
  const { portfolioId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (portfolioId && portfolioId !== activePortfolioId) {
      onSelectPortfolioId(portfolioId);
    }
  }, [activePortfolioId, onSelectPortfolioId, portfolioId]);

  const handleSelectPortfolioId = (id: string) => {
    onSelectPortfolioId(id);
    navigate(`/portfolio/${id}`);
  };

  return (
    <PortfolioManagerView
      stocks={stocks}
      portfolios={portfolios}
      onCreatePortfolio={onCreatePortfolio}
      onDeletePortfolio={onDeletePortfolio}
      activePortfolioId={portfolioId ?? activePortfolioId}
      onSelectPortfolioId={handleSelectPortfolioId}
      onExecuteTrade={onExecuteTrade}
      onOpenTradingJournal={onOpenTradingJournal}
      onLedgerChanged={onLedgerChanged}
      pricingStatus={pricingStatus}
    />
  );
}
export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [focusMode,setFocusMode]=useState(false);
  const pageTitle=pathname.startsWith('/portfolio')?'Portföy':pathname.startsWith('/watchlist')?'İzleme Listem':pathname.startsWith('/journal')||pathname.startsWith('/transactions')?'Günlük':pathname.startsWith('/dashboard')?'Bugün':'Araştır';

  // Core Persistent States
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('port-1');

  // Modal Open/Close States
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [selectedDetailSymbol, setSelectedDetailSymbol] = useState<string | null>(null);
  const [selectedDetailName, setSelectedDetailName] = useState<string | null>(null);
  const [isManageAssetsOpen, setIsManageAssetsOpen] = useState(false);
  const [tradeModalSymbol, setTradeModalSymbol] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTradingJournalOpen, setIsTradingJournalOpen] = useState(false);

  const { assets, addAssets } = useAssets();
  const { stocks: baseStocks } = useAssetMarketData(assets);
  const { news, calendarEvents } = useMarketContext();
  const {
    portfolios: apiPortfolios,
    holdings: apiHoldings,
    createPortfolio: createApiPortfolio,
    setSelectedPortfolioId: setApiPortfolioId,
    reload: reloadInvestmentPortfolio,
    summary: apiPortfolioSummary,
  } = useInvestmentPortfolio(numericPortfolioId(activePortfolioId) ?? null);
  const {
    watchlists: apiWatchlists,
    createList: createApiWatchlist,
    addSymbol: addApiWatchlistSymbol,
    removeSymbol: removeApiWatchlistSymbol,
  } = useWatchlists();
  const liveMarketSymbols = useMemo(() => {
    const symbols = new Set<string>();
    apiHoldings.forEach((holding) => symbols.add(holding.symbol.trim().toUpperCase()));
    apiWatchlists.forEach((watchlist) => watchlist.symbols?.forEach((symbol) => symbols.add(symbol.trim().toUpperCase())));
    return [...symbols].filter(Boolean).sort();
  }, [apiHoldings, apiWatchlists]);
  const profileSymbols = useMemo(() => [...new Set([
    ...assets.map((asset) => asset.symbol.trim().toUpperCase()),
    ...liveMarketSymbols,
  ])].filter(Boolean).sort(), [assets, liveMarketSymbols]);
  const { quotes: liveQuoteSections, profiles: companyProfileSections } = useMarketOverviewData(
    liveMarketSymbols,
    profileSymbols,
  );
  const logoSources = useMemo<Record<string, CompanyLogoSource>>(() => Object.fromEntries(
    Object.entries(companyProfileSections)
      .filter(([, section]) => section.data != null)
      .map(([symbol, section]) => [symbol, {
        logoUrl: section.data?.logoUrl,
        website: section.data?.website,
      }]),
  ), [companyProfileSections]);

  const stocks = useMemo<Stock[]>(() => baseStocks.map((stock) => {
    const profile = companyProfileSections[stock.symbol]?.data;
    const quote = liveQuoteSections[stock.symbol]?.data;
    const displayQuote = quote ? selectDisplayQuote(quote) : null;
    if (!profile && !displayQuote) return stock;
    return {
      ...stock,
      name: profile?.name ?? stock.name,
      sector: profile?.sector ?? stock.sector,
      industry: profile?.industry ?? stock.industry,
      logoUrl: profile?.logoUrl ?? stock.logoUrl,
      website: profile?.website ?? stock.website,
      price: displayQuote?.price ?? stock.price,
      close: displayQuote?.price ?? stock.close,
      change: displayQuote?.change ?? stock.change,
      changePercent: displayQuote?.changePercent == null
        ? stock.changePercent
        : displayQuote.changePercent * 100,
      priceUpdatedAt: displayQuote?.timestamp ?? stock.priceUpdatedAt,
      marketState: displayQuote?.marketState ?? stock.marketState,
      priceDelayed: displayQuote?.delayed ?? stock.priceDelayed,
    };
  }), [baseStocks, companyProfileSections, liveQuoteSections]);

  useEffect(() => {
    if (!selectedStock) return;
    const updated = stocks.find((stock) => stock.symbol === selectedStock.symbol);
    if (updated && updated !== selectedStock) setSelectedStock(updated);
  }, [selectedStock, stocks]);
  const {
    trades: journalTrades,
    addTrade: addJournalTradeRecord,
    removeTrade: removeJournalTradeRecord,
    reload: reloadJournalTrades,
  } = useJournalTrades();


  const openStockDetails = (stock: Stock | null, symbol?: string, name?: string) => {
    setSelectedStock(stock);
    setSelectedDetailSymbol(stock?.symbol ?? symbol ?? null);
    setSelectedDetailName(stock?.name ?? name ?? null);
  };
  const trades = useMemo<Trade[]>(
    () => journalTrades.map(mapJournalTradeToUiTrade),
    [journalTrades]
  );

  useEffect(() => {
    if (apiWatchlists && apiWatchlists.length > 0) {
      const mapped: Watchlist[] = apiWatchlists.map(w => ({
        id: w.id.toString(),
        name: w.name,
        symbols: w.symbols || []
      }));
      setWatchlists(mapped);
    } else {
      setWatchlists([]);
    }
  }, [apiWatchlists]);

  useEffect(() => {
    if (apiPortfolios && apiPortfolios.length > 0) {
      const mapped: Portfolio[] = apiPortfolios.map(p => ({
        id: p.id.toString(),
        name: p.name,
        holdings: apiHoldings.filter(h => h.portfolioId === p.id).map(h => ({
          symbol: h.symbol,
          quantity: h.quantity,
          costPrice: h.averageCost
        }))
      }));
      setPortfolios(mapped);
      if (mapped.length > 0 && activePortfolioId === 'port-1') {
        setActivePortfolioId(mapped[0].id);
      }
    } else {
      setPortfolios([]);
    }
  }, [apiPortfolios, apiHoldings, activePortfolioId]);


  // Derived Active Portfolio object
  const activePortfolio = useMemo<Portfolio | null>(() => {
    return portfolios.find((p) => p.id === activePortfolioId) || portfolios[0] || null;
  }, [portfolios, activePortfolioId]);

  const saveActivePortfolioIdState = (id: string) => {
    setActivePortfolioId(id);
  };

  // 4. Watchlist handlers
  const handleAddStockToWatchlist = async (watchlistId: string, symbol: string) => {
    const normalizedSymbol = symbol.trim().toUpperCase();
    const numericWatchlistId = Number(watchlistId);
    if (!normalizedSymbol || !Number.isFinite(numericWatchlistId)) return;

    if (!assets.some((asset) => asset.symbol === normalizedSymbol)) {
      await addAssets([normalizedSymbol]);
    }

    await addApiWatchlistSymbol(numericWatchlistId, normalizedSymbol);
  };

  const handleAddWatchlist = async (name: string) => {
    const created = await createApiWatchlist(name);
    return created.id.toString();
  };

  const handleRemoveStockFromWatchlist = async (watchlistId: string, symbol: string) => {
    const numericWatchlistId = Number(watchlistId);
    if (!Number.isFinite(numericWatchlistId)) return;
    await removeApiWatchlistSymbol(numericWatchlistId, symbol.trim().toUpperCase());
  };

  const handleCreatePortfolio = async (name: string) => {
    const created = await createApiPortfolio({
      name,
      baseCurrency: 'USD',
      defaultPortfolio: portfolios.length === 0,
    });
    const id = String(created.id);
    setPortfolios(prev => [
      { id, name: created.name, holdings: [] },
      ...prev.filter((portfolio) => portfolio.id !== id),
    ]);
    setApiPortfolioId(created.id);
    setActivePortfolioId(id);
    return id;
  };

  const handleDeletePortfolio = async (id: string) => {
    const numericId = numericPortfolioId(id);
    if (!numericId) {
      throw new Error('Portfolio cannot be deleted because its identifier is invalid.');
    }
    const nextPortfolio = portfolios.find((portfolio) => portfolio.id !== id) ?? null;
    await deleteInvestmentPortfolio(numericId);
    setPortfolios(prev => prev.filter((portfolio) => portfolio.id !== id));
    if (nextPortfolio) {
      const nextId = numericPortfolioId(nextPortfolio.id);
      if (nextId) {
        setApiPortfolioId(nextId);
      }
      setActivePortfolioId(nextPortfolio.id);
    } else {
      setActivePortfolioId('');
    }
    await reloadInvestmentPortfolio();
  };
  const handleLedgerChanged = async () => {
    await Promise.all([reloadInvestmentPortfolio(), reloadJournalTrades()]);
  };

  // 5. Ledger & Transaction execution coordinates (API-backed journal)
  const handleExecuteTrade = async (newTrade: Omit<Trade, 'id' | 'date'>) => {
    const targetPortfolioId = newTrade.portfolioId || activePortfolioId;
    const numericTargetPortfolioId = numericPortfolioId(targetPortfolioId);
    const tradeDate = new Date().toISOString().slice(0, 10);
    const journalNotes = newTrade.notes?.trim() || `${newTrade.symbol} ${newTrade.type} trade`;

    if (numericTargetPortfolioId) {
      await createPortfolioTransaction(numericTargetPortfolioId, {
        symbol: newTrade.symbol,
        action: newTrade.type,
        quantity: newTrade.quantity,
        price: newTrade.price,
        tradeDate,
        source: 'MANUAL',
        notes: newTrade.notes,
        journalNotes,
      });
      await Promise.all([reloadInvestmentPortfolio(), reloadJournalTrades()]);
    } else {
      await addJournalTradeRecord({
        symbol: newTrade.symbol,
        type: newTrade.type,
        quantity: newTrade.quantity,
        purchasePrice: newTrade.price,
        currentPrice: newTrade.price,
        openedAt: tradeDate,
        status: newTrade.type === 'SELL' ? 'CLOSED' : 'OPEN',
        notes: journalNotes,
        portfolioId: undefined,
      });
      await reloadJournalTrades();
    }
  };

  const handleRemoveTrade = async (id: string) => {
    const tradeToRemove = trades.find((t) => t.id === id);
    if (!tradeToRemove) return;

    const tradeId = Number(id);
    if (!Number.isFinite(tradeId)) return;

    const targetPortfolioId = tradeToRemove.portfolioId || activePortfolioId;
    const numericTargetPortfolioId = numericPortfolioId(targetPortfolioId);
    const transactionId = tradeToRemove.transactionId ? Number(tradeToRemove.transactionId) : undefined;

    if (numericTargetPortfolioId && transactionId && Number.isFinite(transactionId)) {
      await deletePortfolioTransaction(numericTargetPortfolioId, transactionId);
      await Promise.all([reloadInvestmentPortfolio(), reloadJournalTrades()]);
    } else {
      await removeJournalTradeRecord(tradeId);
      await reloadJournalTrades();
    }
  };
  // renderView is replaced by Routes

  return (
    <div className={`desk-app ${focusMode ? 'desk-focus-mode' : ''}`}>
      <a className="desk-skip" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content')?.focus();}}>İçeriğe geç</a>

      {/* 2. Main Workspace Layout */}
      <div className="desk-app-layout">
        {/* Left Nav menu */}
        <LeftNav
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenManageAssets={() => setIsManageAssetsOpen(true)}
        />

        <div className="desk-shell">
      {/* 1. Global Terminal Top Header */}
      <TopBar
        pageTitle={pageTitle}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode(value => !value)}
        stocks={stocks}
        logoSources={logoSources}
        assets={assets}
        onSelectStock={(s) => navigate(`/workspace/${encodeURIComponent(s.symbol)}`)}
        onSelectAsset={(asset) => navigate(`/workspace/${encodeURIComponent(asset.symbol)}`)}
        onOpenTradingJournal={() => setIsTradingJournalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

        {/* Dynamic active view panel */}
        <main id="main-content" tabIndex={-1} className="desk-main">
          <Suspense fallback={<div role="status" className="p-8 text-text-secondary">Sayfa yükleniyor…</div>}><Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <DashboardHome
                stocks={stocks}
                logoSources={logoSources}
                portfolios={portfolios}
                activePortfolioId={activePortfolioId}
                onSelectPortfolioId={saveActivePortfolioIdState}
                onSelectStock={(s) => openStockDetails(s)}
                onOpenTradingJournal={() => setIsTradingJournalOpen(true)}
                onNavigateToNews={() => navigate('/news')}
                onNavigateToResearch={() => navigate('/workspace')}
                news={news}
                calendarEvents={calendarEvents}
              />
            } />
            <Route path="/charts" element={<Navigate to="/workspace" replace />} />
            <Route path="/workspace" element={
              <ResearchRoute
                assets={assets}
                watchlists={watchlists}
                onAddToWatchlist={handleAddStockToWatchlist}
                stocks={stocks}
                onSelectStock={(s) => openStockDetails(s)}
              />
            } />
            <Route path="/workspace/:symbol" element={
              <ResearchRoute
                assets={assets}
                watchlists={watchlists}
                onAddToWatchlist={handleAddStockToWatchlist}
                stocks={stocks}
                onSelectStock={(s) => openStockDetails(s)}
              />
            } />
            <Route path="/watchlist" element={
              <WatchlistsView
                stocks={stocks}
                logoSources={logoSources}
                watchlists={watchlists}
                onAddStockToWatchlist={handleAddStockToWatchlist}
                onRemoveStockFromWatchlist={handleRemoveStockFromWatchlist}
                onAddWatchlist={handleAddWatchlist}
                onOpenTradeModal={(sym: string) => setTradeModalSymbol(sym)}
                onSelectStock={(s, symbol, name) => openStockDetails(s, symbol, name)}
              />
            } />
            <Route path="/news" element={
              <NewsFeedView
                activePortfolio={activePortfolio}
                news={news}
              />
            } />
            <Route path="/news/:symbol" element={
              <NewsFeedView
                activePortfolio={activePortfolio}
                news={news}
              />
            } />
            <Route path="/reports" element={
              <AiReportsView
                holdings={activePortfolio?.holdings ?? []}
                stocks={stocks}
              />
            } />
            <Route path="/reports/:symbol" element={
              <AiReportsView
                holdings={activePortfolio?.holdings ?? []}
                stocks={stocks}
              />
            } />
            <Route path="/journal" element={
              <TradingJournalView
                stocks={stocks}
                portfolios={portfolios}
                onOpenTradeModal={(sym: string) => setTradeModalSymbol(sym)}
              />
            } />
            <Route path="/transactions" element={
              <TradingJournalView
                stocks={stocks}
                portfolios={portfolios}
                onOpenTradeModal={(sym: string) => setTradeModalSymbol(sym)}
              />
            } />
            <Route path="/portfolio" element={
              <PortfolioRoute
                stocks={stocks}
                portfolios={portfolios}
                onCreatePortfolio={handleCreatePortfolio}
                onDeletePortfolio={handleDeletePortfolio}
                activePortfolioId={activePortfolioId}
                onSelectPortfolioId={saveActivePortfolioIdState}
                onExecuteTrade={handleExecuteTrade}
                onOpenTradingJournal={() => setIsTradingJournalOpen(true)}
                onLedgerChanged={handleLedgerChanged}
                pricingStatus={apiPortfolioSummary?.pricingStatus}
              />
            } />
            <Route path="/portfolio/:portfolioId" element={
              <PortfolioRoute
                stocks={stocks}
                portfolios={portfolios}
                onCreatePortfolio={handleCreatePortfolio}
                onDeletePortfolio={handleDeletePortfolio}
                activePortfolioId={activePortfolioId}
                onSelectPortfolioId={saveActivePortfolioIdState}
                onExecuteTrade={handleExecuteTrade}
                onOpenTradingJournal={() => setIsTradingJournalOpen(true)}
                onLedgerChanged={handleLedgerChanged}
                pricingStatus={apiPortfolioSummary?.pricingStatus}
              />
            } />
            <Route path="/portfolios" element={<Navigate to="/portfolio" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes></Suspense>
        </main>
        </div>
      </div>

      {/* --- Overlays & Modals --- */}

      {/* Stock Detailed Modal */}
      <Suspense fallback={null}>{(selectedStock || selectedDetailSymbol) && (
        <StockDetailModal
          stock={selectedStock}
          symbol={selectedDetailSymbol}
          name={selectedDetailName}
          onClose={() => {
            setSelectedStock(null);
            setSelectedDetailSymbol(null);
            setSelectedDetailName(null);
          }}
          onOpenTradeModal={(sym) => setTradeModalSymbol(sym)}
          position={activePortfolio?.holdings.find((holding) => holding.symbol === (selectedStock?.symbol ?? selectedDetailSymbol ?? '')) ?? null}
        />
      )}</Suspense>

      {/* Manage Portfolio Assets slide-drawer */}
      <Suspense fallback={null}><ManageAssetsDrawer
        isOpen={isManageAssetsOpen}
        onClose={() => setIsManageAssetsOpen(false)}
        stocks={stocks}
        holdings={activePortfolio ? activePortfolio.holdings : []}
        portfolioId={activePortfolio?.id}
        onExecuteTrade={handleExecuteTrade}
      /></Suspense>

      {/* Transaction order input modal */}
      <Suspense fallback={null}>{tradeModalSymbol && (
        <TradeActionModal
          isOpen={!!tradeModalSymbol}
          onClose={() => setTradeModalSymbol(null)}
          symbol={tradeModalSymbol}
          stocks={stocks}
          holdings={activePortfolio ? activePortfolio.holdings : []}
          onExecuteTrade={handleExecuteTrade}
        />
      )}</Suspense>

      {/* Settings configuration modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Pop-up Trading Journal Ledger Modal */}
      <Suspense fallback={null}><TradingJournalModal
        isOpen={isTradingJournalOpen}
        onClose={() => setIsTradingJournalOpen(false)}
        trades={trades}
        stocks={stocks}
        portfolios={portfolios}
        onRemoveTrade={handleRemoveTrade}
        onOpenTradeModal={(sym) => setTradeModalSymbol(sym)}
      /></Suspense>

    </div>
  );
}

