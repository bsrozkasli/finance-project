import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { Stock, Trade, Watchlist, Portfolio } from './types';
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
import DashboardHome from './components/DashboardHome';
import ChartWorkspace from './components/ChartWorkspace';
import WatchlistsView from './components/WatchlistsView';
import NewsFeedView from './components/NewsFeedView';
import AiReportsView from './components/AiReportsView';
import PortfolioManagerView from './components/PortfolioManagerView';
import TradingJournalView from './components/TradingJournalView';

// Modals & Drawers
import StockDetailModal from './components/StockDetailModal';
import ManageAssetsDrawer from './components/ManageAssetsDrawer';
import TradeActionModal from './components/TradeActionModal';
import SettingsModal from './components/SettingsModal';
import TradingJournalModal from './components/TradingJournalModal';

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
  stocks,
}: {
  portfolios: Portfolio[];
  activePortfolioId: string;
  onSelectPortfolioId: (id: string) => void;
  onCreatePortfolio: (name: string) => Promise<string>;
  onDeletePortfolio: (id: string) => Promise<void>;
  onExecuteTrade: (trade: Omit<Trade, 'id' | 'date'>) => Promise<void>;
  onOpenTradingJournal: () => void;
  stocks: Stock[];
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
    />
  );
}
export default function App() {
  const navigate = useNavigate();

  // Core Persistent States
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('port-1');
  const [volatility, setVolatility] = useState<'low' | 'normal' | 'high'>('normal');

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
  const profileSymbols = useMemo(
    () => assets.map((asset) => asset.symbol.trim().toUpperCase()).filter(Boolean).sort(),
    [assets],
  );
  const { quotes: liveQuoteSections, profiles: companyProfileSections } = useMarketOverviewData(
    liveMarketSymbols,
    profileSymbols,
  );

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

  const saveVolatilityState = (v: 'low' | 'normal' | 'high') => {
    setVolatility(v);
    localStorage.setItem('nexus_volatility', v);
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
  // 5. Ledger & Transaction execution coordinates (API-backed journal)
  const handleExecuteTrade = async (newTrade: Omit<Trade, 'id' | 'date'>) => {
    const targetPortfolioId = newTrade.portfolioId || activePortfolioId;
    const numericTargetPortfolioId = numericPortfolioId(targetPortfolioId);
    const tradeDate = new Date().toISOString().slice(0, 10);
    const journalNotes = newTrade.notes?.trim() || `${newTrade.symbol} ${newTrade.type} trade`;

    try {
      if (numericTargetPortfolioId) {
        await createPortfolioTransaction(numericTargetPortfolioId, {
          symbol: newTrade.symbol,
          action: newTrade.type,
          quantity: newTrade.quantity,
          price: newTrade.price,
          tradeDate,
          source: newTrade.source ?? 'MANUAL',
          notes: newTrade.notes,
          journalNotes,
        });
        await Promise.allSettled([reloadInvestmentPortfolio(), reloadJournalTrades()]);
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
        void reloadJournalTrades();
      }
    } catch (error) {
      console.error('Failed to save trade transaction', error);
      return;
    }

    const updatedPortfolios = portfolios.map((p) => {
      if (p.id !== targetPortfolioId) return p;

      const updatedHoldings = [...p.holdings];
      const index = updatedHoldings.findIndex((h) => h.symbol === newTrade.symbol);

      if (newTrade.type === 'BUY') {
        if (index >= 0) {
          const existing = updatedHoldings[index];
          const nextQty = existing.quantity + newTrade.quantity;
          const nextCost = (existing.quantity * existing.costPrice + newTrade.quantity * newTrade.price) / nextQty;
          updatedHoldings[index] = {
            symbol: newTrade.symbol,
            quantity: nextQty,
            costPrice: Math.round(nextCost * 100) / 100,
          };
        } else {
          updatedHoldings.push({
            symbol: newTrade.symbol,
            quantity: newTrade.quantity,
            costPrice: newTrade.price,
          });
        }
      } else if (index >= 0) {
        const existing = updatedHoldings[index];
        const nextQty = existing.quantity - newTrade.quantity;
        if (nextQty <= 0) {
          updatedHoldings.splice(index, 1);
        } else {
          updatedHoldings[index] = {
            ...existing,
            quantity: nextQty,
          };
        }
      }

      return {
        ...p,
        holdings: updatedHoldings,
      };
    });

    setPortfolios(updatedPortfolios);
  };

  const handleRemoveTrade = async (id: string) => {
    const tradeToRemove = trades.find((t) => t.id === id);
    if (!tradeToRemove) return;

    const tradeId = Number(id);
    if (!Number.isFinite(tradeId)) return;

    const targetPortfolioId = tradeToRemove.portfolioId || activePortfolioId;
    const numericTargetPortfolioId = numericPortfolioId(targetPortfolioId);
    const transactionId = tradeToRemove.transactionId ? Number(tradeToRemove.transactionId) : undefined;

    try {
      if (numericTargetPortfolioId && transactionId && Number.isFinite(transactionId)) {
        await deletePortfolioTransaction(numericTargetPortfolioId, transactionId);
        await Promise.allSettled([reloadInvestmentPortfolio(), reloadJournalTrades()]);
      } else {
        await removeJournalTradeRecord(tradeId);
        void reloadJournalTrades();
      }
    } catch (error) {
      console.error('Failed to remove journal trade', error);
      return;
    }


    const updatedPortfolios = portfolios.map((p) => {
      if (p.id !== targetPortfolioId) return p;

      const updatedHoldings = [...p.holdings];
      const index = updatedHoldings.findIndex((h) => h.symbol === tradeToRemove.symbol);

      if (index >= 0) {
        const existing = updatedHoldings[index];
        if (tradeToRemove.type === 'BUY') {
          const nextQty = existing.quantity - tradeToRemove.quantity;
          if (nextQty <= 0) {
            updatedHoldings.splice(index, 1);
          } else {
            updatedHoldings[index] = {
              ...existing,
              quantity: nextQty,
            };
          }
        } else {
          const nextQty = existing.quantity + tradeToRemove.quantity;
          updatedHoldings[index] = {
            ...existing,
            quantity: nextQty,
          };
        }
      } else if (tradeToRemove.type === 'SELL') {
        updatedHoldings.push({
          symbol: tradeToRemove.symbol,
          quantity: tradeToRemove.quantity,
          costPrice: tradeToRemove.price,
        });
      }

      return {
        ...p,
        holdings: updatedHoldings,
      };
    });

    setPortfolios(updatedPortfolios);
  };
  // 6. Reset local UI preferences only. Backend portfolio, journal, and watchlist data is not deleted.
  const handleResetDatabase = () => {
    localStorage.removeItem('nexus_volatility');
    setVolatility('normal');
    localStorage.setItem('nexus_volatility', 'normal');
    alert('Local UI preferences were reset. Backend data was not deleted.');
  };

  // renderView is replaced by Routes

  return (
    <div className="min-h-screen bg-bg-base flex flex-col text-text-primary antialiased selection:bg-primary/20 select-none overflow-hidden">

      {/* 1. Global Terminal Top Header */}
      <TopBar
        stocks={stocks}
        onSelectStock={(s) => openStockDetails(s)}
        onOpenTradingJournal={() => setIsTradingJournalOpen(true)}
      />

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Nav menu */}
        <LeftNav
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenManageAssets={() => setIsManageAssetsOpen(true)}
        />

        {/* Dynamic active view panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <DashboardHome
                stocks={stocks}
                portfolios={portfolios}
                activePortfolioId={activePortfolioId}
                onSelectPortfolioId={saveActivePortfolioIdState}
                onSelectStock={(s) => openStockDetails(s)}
                onOpenTradingJournal={() => setIsTradingJournalOpen(true)}
                onNavigateToNews={() => navigate('/news')}
                news={news}
                calendarEvents={calendarEvents}
              />
            } />
            <Route path="/charts" element={<Navigate to="/workspace" replace />} />
            <Route path="/workspace" element={
              <ChartWorkspace
                stocks={stocks}
                onSelectStock={(s) => openStockDetails(s)}
              />
            } />
            <Route path="/workspace/:symbol" element={
              <ChartWorkspace
                stocks={stocks}
                onSelectStock={(s) => openStockDetails(s)}
              />
            } />
            <Route path="/watchlist" element={
              <WatchlistsView
                stocks={stocks}
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
              />
            } />
            <Route path="/portfolios" element={<Navigate to="/portfolio" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* --- Overlays & Modals --- */}

      {/* Stock Detailed Modal */}
      {(selectedStock || selectedDetailSymbol) && (
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
      )}

      {/* Manage Portfolio Assets slide-drawer */}
      <ManageAssetsDrawer
        isOpen={isManageAssetsOpen}
        onClose={() => setIsManageAssetsOpen(false)}
        stocks={stocks}
        holdings={activePortfolio ? activePortfolio.holdings : []}
        portfolioId={activePortfolio?.id}
        onExecuteTrade={handleExecuteTrade}
      />

      {/* Transaction order input modal */}
      {tradeModalSymbol && (
        <TradeActionModal
          isOpen={!!tradeModalSymbol}
          onClose={() => setTradeModalSymbol(null)}
          symbol={tradeModalSymbol}
          stocks={stocks}
          holdings={activePortfolio ? activePortfolio.holdings : []}
          onExecuteTrade={handleExecuteTrade}
        />
      )}

      {/* Settings configuration modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        volatility={volatility}
        onUpdateVolatility={saveVolatilityState}
        onResetDatabase={handleResetDatabase}
      />

      {/* Pop-up Trading Journal Ledger Modal */}
      <TradingJournalModal
        isOpen={isTradingJournalOpen}
        onClose={() => setIsTradingJournalOpen(false)}
        trades={trades}
        stocks={stocks}
        portfolios={portfolios}
        onRemoveTrade={handleRemoveTrade}
        onOpenTradeModal={(sym) => setTradeModalSymbol(sym)}
      />

    </div>
  );
}

