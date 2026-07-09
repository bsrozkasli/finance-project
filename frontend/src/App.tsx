import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import type { CalendarEvent, News, Stock, Trade, Watchlist, Portfolio } from './types';
import type { CategorizedNewsItem, EconomicEvent, JournalTrade } from './api/client';
import type { PriceHistory } from './api/types';
import { createPortfolioTransaction, deletePortfolioTransaction, fetchBatchPriceHistory, fetchEconomicEvents, fetchPortfolioNews } from './api/client';

import { useAssets } from './hooks/useAssets';
import { useInvestmentPortfolio } from './hooks/useInvestmentPortfolio';
import { useWatchlists } from './hooks/useWatchlists';
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

  useEffect(() => {
    if (portfolioId && portfolioId !== activePortfolioId) {
      onSelectPortfolioId(portfolioId);
    }
  }, [activePortfolioId, onSelectPortfolioId, portfolioId]);

  return (
    <PortfolioManagerView
      stocks={stocks}
      portfolios={portfolios}
      onCreatePortfolio={onCreatePortfolio}
      onDeletePortfolio={onDeletePortfolio}
      activePortfolioId={portfolioId ?? activePortfolioId}
      onSelectPortfolioId={onSelectPortfolioId}
      onExecuteTrade={onExecuteTrade}
      onOpenTradingJournal={onOpenTradingJournal}
    />
  );
}
export default function App() {
  const navigate = useNavigate();

  // Core Persistent States
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('port-1');
  const [volatility, setVolatility] = useState<'low' | 'normal' | 'high'>('normal');
  const [news, setNews] = useState<News[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Modal Open/Close States
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isManageAssetsOpen, setIsManageAssetsOpen] = useState(false);
  const [tradeModalSymbol, setTradeModalSymbol] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTradingJournalOpen, setIsTradingJournalOpen] = useState(false);

  const { assets } = useAssets();
  const {
    portfolios: apiPortfolios,
    holdings: apiHoldings,
    reload: reloadInvestmentPortfolio,
    createPortfolio: createInvestmentPortfolioRecord,
    deletePortfolio: deleteInvestmentPortfolioRecord,
  } = useInvestmentPortfolio(null);
  const {
    watchlists: apiWatchlists,
    createList: createWatchlistRecord,
    addSymbol: addWatchlistSymbolRecord,
    reload: reloadWatchlists,
  } = useWatchlists();
  const {
    trades: journalTrades,
    addTrade: addJournalTradeRecord,
    removeTrade: removeJournalTradeRecord,
    reload: reloadJournalTrades,
  } = useJournalTrades();

  const trades = useMemo<Trade[]>(
    () => journalTrades.map(mapJournalTradeToUiTrade),
    [journalTrades]
  );

  // 1. Map API data to UI State
  useEffect(() => {
    let cancelled = false;

    const mapAssetWithRealPrices = async () => {
      if (!assets || assets.length === 0) {
        setStocks([]);
        return;
      }

      const symbols = assets.map((asset) => asset.symbol);
      const historyBySymbol: Record<string, PriceHistory[]> = await fetchBatchPriceHistory(symbols, '1d', '1y')
        .catch(() => ({}));

      const mappedStocks = assets
        .map((asset): Stock | null => {
          const history = historyBySymbol[asset.symbol] ?? historyBySymbol[asset.symbol.toUpperCase()] ?? [];
          if (!history.length) return null;

          const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          const last = sorted[sorted.length - 1];
          const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
          const price = last.close;
          const change = previous ? price - previous.close : 0;
          const changePercent = previous && previous.close !== 0 ? (change / previous.close) * 100 : 0;
          const closes = sorted.map((point) => point.close);

          return {
            symbol: asset.symbol,
            name: asset.name,
            sector: asset.type,
            industry: '',
            price,
            change,
            changePercent,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            volume: last.volume.toLocaleString('en-US'),
            high52W: Math.max(...sorted.map((point) => point.high)),
            low52W: Math.min(...sorted.map((point) => point.low)),
            marketCap: null,
            pe: null,
            pb: null,
            debtEquity: null,
            roe: null,
            revenueGrowth: null,
            divYield: null,
            history: sorted.map((point) => ({
              date: point.timestamp.slice(0, 10),
              price: point.close,
              open: point.open,
              high: point.high,
              low: point.low,
              close: point.close,
              volume: point.volume,
            })),
            sparkline: closes.slice(-30),
            news: [],
            technicals: null,
            analystRating: null,
            alerts: [],
          };
        })
        .filter((stock): stock is Stock => stock !== null);

      if (!cancelled) {
        setStocks(mappedStocks);
      }
    };

    void mapAssetWithRealPrices();
    return () => { cancelled = true; };
  }, [assets]);

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


  useEffect(() => {
    let cancelled = false;

    const mapNews = (item: CategorizedNewsItem): News => ({
      id: String(item.id),
      title: item.headline,
      source: item.source,
      time: new Date((item.datetime > 10_000_000_000 ? item.datetime : item.datetime * 1000)).toLocaleString('en-US'),
      summary: item.summary || undefined,
      category: item.category === 'TECHNOLOGY' || item.category === 'AI' ? 'tech' : item.category ? 'macro' : 'market',
      symbol: item.relatedSymbols?.[0] || item.related?.split(',')[0]?.trim() || undefined,
      url: item.url,
    });

    const mapEvent = (item: EconomicEvent, index: number): CalendarEvent => ({
      id: String(index),
      title: item.event,
      date: item.date?.slice(0, 10) || '',
      time: item.date?.slice(11, 16) || '',
      importance: item.impact === 'CRITICAL' || item.impact === 'HIGH' || item.impact === 'MEDIUM' ? item.impact : undefined,
    });

    const loadMarketContext = async () => {
      const [newsResult, eventsResult] = await Promise.allSettled([
        fetchPortfolioNews(),
        fetchEconomicEvents(),
      ]);

      if (cancelled) return;
      setNews(newsResult.status === 'fulfilled' ? newsResult.value.map(mapNews) : []);
      setCalendarEvents(eventsResult.status === 'fulfilled' ? eventsResult.value.map(mapEvent) : []);
    };

    void loadMarketContext();
    return () => { cancelled = true; };
  }, []);

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

  // 4. Watchlist handlers are persisted through the backend watchlist API.
  const handleAddStockToWatchlist = async (watchlistId: string, symbol: string) => {
    const numericId = Number(watchlistId);
    if (!Number.isFinite(numericId)) return;
    await addWatchlistSymbolRecord(numericId, symbol);
    await reloadWatchlists();
  };

  const handleAddWatchlist = async (name: string) => {
    const created = await createWatchlistRecord(name);
    await reloadWatchlists();
    return created.id.toString();
  };

  const handleCreatePortfolio = async (name: string) => {
    const created = await createInvestmentPortfolioRecord({
      name,
      baseCurrency: 'USD',
      defaultPortfolio: portfolios.length === 0,
    });
    await reloadInvestmentPortfolio();
    setActivePortfolioId(created.id.toString());
    return created.id.toString();
  };

  const handleDeletePortfolio = async (id: string) => {
    const numericId = numericPortfolioId(id);
    if (!numericId) return;
    await deleteInvestmentPortfolioRecord(numericId);
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
        onSelectStock={(s) => setSelectedStock(s)}
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
                onSelectStock={(s) => setSelectedStock(s)}
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
                onSelectStock={(s) => setSelectedStock(s)}
              />
            } />
            <Route path="/workspace/:symbol" element={
              <ChartWorkspace
                stocks={stocks}
                onSelectStock={(s) => setSelectedStock(s)}
              />
            } />
            <Route path="/watchlist" element={
              <WatchlistsView
                stocks={stocks}
                watchlists={watchlists}
                onAddStockToWatchlist={handleAddStockToWatchlist}
                onAddWatchlist={handleAddWatchlist}
                onOpenTradeModal={(sym: string) => setTradeModalSymbol(sym)}
                onSelectStock={(s) => setSelectedStock(s)}
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
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
          onOpenTradeModal={(sym) => setTradeModalSymbol(sym)}
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
