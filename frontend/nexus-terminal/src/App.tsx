import React, { useState, useEffect, useMemo } from 'react';
import { Stock, Holding, Trade, Watchlist, Portfolio } from './types';
import {
  INITIAL_STOCKS,
  INITIAL_HOLDINGS,
  INITIAL_WATCHLISTS,
  INITIAL_TRADES,
  INITIAL_PORTFOLIOS,
} from './mockData';

// Component Imports
import TopBar from './components/TopBar';
import LeftNav, { ViewType } from './components/LeftNav';
import DashboardHome from './components/DashboardHome';
import ChartWorkspace from './components/ChartWorkspace';
import WatchlistsView from './components/WatchlistsView';
import NewsFeedView from './components/NewsFeedView';
import AiReportsView from './components/AiReportsView';
import PortfolioManagerView from './components/PortfolioManagerView';

// Modals & Drawers
import StockDetailModal from './components/StockDetailModal';
import ManageAssetsDrawer from './components/ManageAssetsDrawer';
import TradeActionModal from './components/TradeActionModal';
import SettingsModal from './components/SettingsModal';
import TradingJournalModal from './components/TradingJournalModal';

export default function App() {
  // Navigation & UI States
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [volatility, setVolatility] = useState<'low' | 'normal' | 'high'>('normal');

  // Core Persistent States
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('port-1');

  // Modal Open/Close States
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isManageAssetsOpen, setIsManageAssetsOpen] = useState(false);
  const [tradeModalSymbol, setTradeModalSymbol] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTradingJournalOpen, setIsTradingJournalOpen] = useState(false);

  // 1. Initial State Loading from LocalStorage or seed files
  useEffect(() => {
    try {
      const savedStocks = localStorage.getItem('nexus_stocks');
      const savedWatchlists = localStorage.getItem('nexus_watchlists');
      const savedTrades = localStorage.getItem('nexus_trades');
      const savedPortfolios = localStorage.getItem('nexus_portfolios');
      const savedActiveId = localStorage.getItem('nexus_active_portfolio_id');
      const savedVolatility = localStorage.getItem('nexus_volatility');

      if (savedStocks && savedStocks.includes('THYAO')) {
        setStocks(JSON.parse(savedStocks));
      } else {
        setStocks(INITIAL_STOCKS);
        localStorage.setItem('nexus_stocks', JSON.stringify(INITIAL_STOCKS));
      }

      if (savedWatchlists && savedWatchlists.includes('BIST')) {
        setWatchlists(JSON.parse(savedWatchlists));
      } else {
        setWatchlists(INITIAL_WATCHLISTS);
        localStorage.setItem('nexus_watchlists', JSON.stringify(INITIAL_WATCHLISTS));
      }

      if (savedTrades) setTrades(JSON.parse(savedTrades));
      else {
        setTrades(INITIAL_TRADES);
        localStorage.setItem('nexus_trades', JSON.stringify(INITIAL_TRADES));
      }

      if (savedPortfolios) setPortfolios(JSON.parse(savedPortfolios));
      else {
        setPortfolios(INITIAL_PORTFOLIOS);
        localStorage.setItem('nexus_portfolios', JSON.stringify(INITIAL_PORTFOLIOS));
      }

      if (savedActiveId) setActivePortfolioId(savedActiveId);
      else {
        setActivePortfolioId('port-1');
        localStorage.setItem('nexus_active_portfolio_id', 'port-1');
      }

      if (savedVolatility) setVolatility(savedVolatility as any);
    } catch (error) {
      console.error('Failed to load borsa local storage:', error);
      // Fallbacks
      setStocks(INITIAL_STOCKS);
      setWatchlists(INITIAL_WATCHLISTS);
      setTrades(INITIAL_TRADES);
      setPortfolios(INITIAL_PORTFOLIOS);
      setActivePortfolioId('port-1');
    }
  }, []);

  // 2. State persistence helper triggers
  const saveStocksState = (updated: Stock[]) => {
    setStocks(updated);
    localStorage.setItem('nexus_stocks', JSON.stringify(updated));
  };

  const saveWatchlistsState = (updated: Watchlist[]) => {
    setWatchlists(updated);
    localStorage.setItem('nexus_watchlists', JSON.stringify(updated));
  };

  const saveTradesState = (updated: Trade[]) => {
    setTrades(updated);
    localStorage.setItem('nexus_trades', JSON.stringify(updated));
  };

  const savePortfoliosState = (updated: Portfolio[]) => {
    setPortfolios(updated);
    localStorage.setItem('nexus_portfolios', JSON.stringify(updated));
  };

  const saveActivePortfolioIdState = (id: string) => {
    setActivePortfolioId(id);
    localStorage.setItem('nexus_active_portfolio_id', id);
  };

  const saveVolatilityState = (v: 'low' | 'normal' | 'high') => {
    setVolatility(v);
    localStorage.setItem('nexus_volatility', v);
  };

  // Derived Active Portfolio object
  const activePortfolio = useMemo(() => {
    return portfolios.find((p) => p.id === activePortfolioId) || portfolios[0] || INITIAL_PORTFOLIOS[0];
  }, [portfolios, activePortfolioId]);

  // 3. Price Refresher Trigger (simulates borsa live updates)
  const handleRefreshPrices = () => {
    setIsRefreshing(true);
    
    // Simulate short network delay for visual impact
    setTimeout(() => {
      const coeff = volatility === 'low' ? 0.008 : volatility === 'high' ? 0.035 : 0.016;
      
      const updated = stocks.map((s) => {
        const percentChange = (Math.random() - 0.5) * coeff;
        const delta = s.price * percentChange;
        const nextPrice = Math.max(1, s.price + delta);
        const overallPercent = s.changePercent + (percentChange * 100);

        // Update sparkline trail by shifting items
        const nextSparkline = [...s.sparkline.slice(1), nextPrice];
        
        // Update history price data
        const nextHistory = s.history.map((h, i) => {
          if (i === s.history.length - 1) {
            return { ...h, price: Math.round(nextPrice * 100) / 100 };
          }
          return h;
        });

        return {
          ...s,
          price: Math.round(nextPrice * 100) / 100,
          change: Math.round((s.change + delta) * 100) / 100,
          changePercent: Math.round(overallPercent * 100) / 100,
          sparkline: nextSparkline,
          history: nextHistory,
        };
      });

      saveStocksState(updated);
      setIsRefreshing(false);
    }, 500);
  };

  // 4. Watchlist Handlers
  const handleAddStockToWatchlist = (watchlistId: string, symbol: string) => {
    const updated = watchlists.map((w) => {
      if (w.id === watchlistId) {
        return {
          ...w,
          symbols: [...w.symbols, symbol],
        };
      }
      return w;
    });
    saveWatchlistsState(updated);
  };

  const handleAddWatchlist = (name: string) => {
    const newW: Watchlist = {
      id: `w-${Date.now()}`,
      name,
      symbols: [],
    };
    saveWatchlistsState([...watchlists, newW]);
  };

  // 5. Ledger & Transaction execution coordinates (Dynamic Portfolio Weight Integration)
  const handleExecuteTrade = (newTrade: Omit<Trade, 'id' | 'date'>) => {
    const targetPortfolioId = newTrade.portfolioId || activePortfolioId;

    // Generate trade ID
    const completedTrade: Trade = {
      ...newTrade,
      portfolioId: targetPortfolioId,
      id: `t-${Date.now()}`,
      date: new Date().toISOString(),
    };

    const updatedTrades = [...trades, completedTrade];
    saveTradesState(updatedTrades);

    // Update corresponding portfolio's holdings list automatically
    const updatedPortfolios = portfolios.map((p) => {
      if (p.id !== targetPortfolioId) return p;

      const updatedHoldings = [...p.holdings];
      const index = updatedHoldings.findIndex((h) => h.symbol === newTrade.symbol);

      if (newTrade.type === 'BUY') {
        if (index >= 0) {
          const existing = updatedHoldings[index];
          const nextQty = existing.quantity + newTrade.quantity;
          // Compute average cost basis
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
      } else {
        // SELL trade
        if (index >= 0) {
          const existing = updatedHoldings[index];
          const nextQty = existing.quantity - newTrade.quantity;
          if (nextQty <= 0) {
            // Remove position if fully sold
            updatedHoldings.splice(index, 1);
          } else {
            updatedHoldings[index] = {
              ...existing,
              quantity: nextQty,
            };
          }
        }
      }

      return {
        ...p,
        holdings: updatedHoldings,
      };
    });

    savePortfoliosState(updatedPortfolios);
  };

  const handleRemoveTrade = (id: string) => {
    const tradeToRemove = trades.find((t) => t.id === id);
    if (!tradeToRemove) return;

    const updatedTrades = trades.filter((t) => t.id !== id);
    saveTradesState(updatedTrades);

    const targetPortfolioId = tradeToRemove.portfolioId || activePortfolioId;

    // Reverse trade impact on holdings
    const updatedPortfolios = portfolios.map((p) => {
      if (p.id !== targetPortfolioId) return p;

      const updatedHoldings = [...p.holdings];
      const index = updatedHoldings.findIndex((h) => h.symbol === tradeToRemove.symbol);

      if (index >= 0) {
        const existing = updatedHoldings[index];
        if (tradeToRemove.type === 'BUY') {
          // Reverting buy means subtracting quantities
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
          // Reverting sell means adding quantities back
          const nextQty = existing.quantity + tradeToRemove.quantity;
          updatedHoldings[index] = {
            ...existing,
            quantity: nextQty,
          };
        }
      } else if (tradeToRemove.type === 'SELL') {
        // Reverting sell that had emptied holdings: add it back
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

    savePortfoliosState(updatedPortfolios);
  };

  // 6. Hard Reset to defaults
  const handleResetDatabase = () => {
    localStorage.removeItem('nexus_stocks');
    localStorage.removeItem('nexus_watchlists');
    localStorage.removeItem('nexus_trades');
    localStorage.removeItem('nexus_portfolios');
    localStorage.removeItem('nexus_active_portfolio_id');
    localStorage.removeItem('nexus_volatility');
    
    setStocks(INITIAL_STOCKS);
    setWatchlists(INITIAL_WATCHLISTS);
    setTrades(INITIAL_TRADES);
    setPortfolios(INITIAL_PORTFOLIOS);
    setActivePortfolioId('port-1');
    setVolatility('normal');
    
    localStorage.setItem('nexus_stocks', JSON.stringify(INITIAL_STOCKS));
    localStorage.setItem('nexus_watchlists', JSON.stringify(INITIAL_WATCHLISTS));
    localStorage.setItem('nexus_trades', JSON.stringify(INITIAL_TRADES));
    localStorage.setItem('nexus_portfolios', JSON.stringify(INITIAL_PORTFOLIOS));
    localStorage.setItem('nexus_active_portfolio_id', 'port-1');
    localStorage.setItem('nexus_volatility', 'normal');

    alert('Sistem başarıyla fabrika ayarlarına sıfırlandı.');
  };

  // Render view router helper
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardHome
            stocks={stocks}
            portfolios={portfolios}
            activePortfolioId={activePortfolioId}
            onSelectPortfolioId={saveActivePortfolioIdState}
            onSelectStock={(s) => setSelectedStock(s)}
            onOpenTradeModal={(sym) => setTradeModalSymbol(sym)}
            onOpenTradingJournal={() => setIsTradingJournalOpen(true)}
            onNavigateToNews={() => setCurrentView('news')}
          />
        );
      case 'charts':
        return (
          <ChartWorkspace
            stocks={stocks}
            onSelectStock={(s) => setSelectedStock(s)}
          />
        );
      case 'watchlist':
        return (
          <WatchlistsView
            stocks={stocks}
            watchlists={watchlists}
            onAddStockToWatchlist={handleAddStockToWatchlist}
            onAddWatchlist={handleAddWatchlist}
            onOpenTradeModal={(sym) => setTradeModalSymbol(sym)}
            onSelectStock={(s) => setSelectedStock(s)}
          />
        );
      case 'news':
        return (
          <NewsFeedView
            activePortfolio={activePortfolio}
            stocks={stocks}
          />
        );
      case 'reports':
        return (
          <AiReportsView
            holdings={activePortfolio ? activePortfolio.holdings : []}
            stocks={stocks}
          />
        );
      case 'portfolios':
        return (
          <PortfolioManagerView
            stocks={stocks}
            portfolios={portfolios}
            onUpdatePortfolios={savePortfoliosState}
            activePortfolioId={activePortfolioId}
            onSelectPortfolioId={saveActivePortfolioIdState}
            onExecuteTrade={handleExecuteTrade}
            onOpenTradingJournal={() => setIsTradingJournalOpen(true)}
            onOpenTradeModal={(sym) => setTradeModalSymbol(sym)}
          />
        );
      default:
        return <div className="p-6 text-xs text-text-secondary">View not found.</div>;
    }
  };

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
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Dynamic active view panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {renderView()}
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
        onUpdateHoldings={(updatedHoldings) => {
          const updatedPortfolios = portfolios.map((p) => {
            if (p.id === activePortfolioId) {
              return { ...p, holdings: updatedHoldings };
            }
            return p;
          });
          savePortfoliosState(updatedPortfolios);
        }}
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
