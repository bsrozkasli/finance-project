import React, { useState, useMemo } from 'react';
import { X, Filter, Trash2, Calendar, BookOpen, PlusCircle, ArrowUpRight, ArrowDownRight, Briefcase } from 'lucide-react';
import { Trade, Stock, Portfolio } from '../types';

interface TradingJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  stocks: Stock[];
  portfolios: Portfolio[];
  onRemoveTrade: (id: string) => void;
  onOpenTradeModal: (symbol: string) => void;
}

export default function TradingJournalModal({
  isOpen,
  onClose,
  trades,
  stocks,
  portfolios,
  onRemoveTrade,
  onOpenTradeModal,
}: TradingJournalModalProps) {
  const [selectedType, setSelectedType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Build list of symbols for filter
  const symbols = useMemo(() => {
    const list = new Set<string>();
    trades.forEach((t) => list.add(t.symbol));
    stocks.forEach((s) => list.add(s.symbol));
    return Array.from(list);
  }, [trades, stocks]);

  // Map portfolios by ID for labels
  const portfolioMap = useMemo(() => {
    const map: Record<string, string> = {};
    portfolios.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [portfolios]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades
      .filter((t) => {
        const matchesType = selectedType === 'ALL' || t.type === selectedType;
        const matchesSymbol = selectedSymbol === 'ALL' || t.symbol === selectedSymbol;
        const matchesPortfolio = selectedPortfolio === 'ALL' || t.portfolioId === selectedPortfolio;
        const matchesQuery =
          !searchQuery.trim() ||
          t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.notes.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSymbol && matchesPortfolio && matchesQuery;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades, selectedType, selectedSymbol, selectedPortfolio, searchQuery]);

  // Trade Statistics
  const stats = useMemo(() => {
    let totalBuys = 0;
    let totalSells = 0;
    let buyCount = 0;
    let sellCount = 0;

    filteredTrades.forEach((t) => {
      const amt = t.quantity * t.price;
      if (t.type === 'BUY') {
        totalBuys += amt;
        buyCount++;
      } else {
        totalSells += amt;
        sellCount++;
      }
    });

    return {
      totalBuys,
      totalSells,
      buyCount,
      sellCount,
      totalCount: filteredTrades.length,
    };
  }, [filteredTrades]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-bg-primary border border-outline-variant rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-outline-variant bg-bg-card/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-container/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-text-primary uppercase tracking-wide">
                Borsa İşlem Defteri (Transaction Ledger)
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Portföylerinizde gerçekleştirdiğiniz tüm alım ve satım emirlerini filtreleyin, analiz edin ve yönetin.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-card rounded-lg border border-outline-variant/60 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aggregate statistics row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 border-b border-outline-variant/35 bg-bg-card/15 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/30 shrink-0 text-xs">
          <div className="p-4 flex flex-col justify-between">
            <span className="text-text-muted text-[10px] uppercase font-label-caps tracking-wider">İşlem Sayısı</span>
            <span className="font-data-mono text-lg font-bold text-text-primary mt-1">{stats.totalCount} Adet</span>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <span className="text-text-muted text-[10px] uppercase font-label-caps tracking-wider">Toplam Alım Tutarı</span>
            <span className="font-data-mono text-lg font-bold text-bull-green mt-1">
              ${stats.totalBuys.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <span className="text-text-muted text-[10px] uppercase font-label-caps tracking-wider">Toplam Satım Tutarı</span>
            <span className="font-data-mono text-lg font-bold text-bear-red mt-1">
              ${stats.totalSells.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-4 flex flex-col justify-between">
            <span className="text-text-muted text-[10px] uppercase font-label-caps tracking-wider">Hızlı İşlem Girişi</span>
            <div className="flex gap-2 mt-1">
              <select
                onChange={(e) => {
                  if (e.target.value !== 'SELECT') {
                    onOpenTradeModal(e.target.value);
                    e.target.value = 'SELECT';
                  }
                }}
                defaultValue="SELECT"
                className="w-full bg-bg-base border border-outline-variant rounded px-2 py-1 text-[11px] font-bold text-primary focus:outline-none focus:border-primary"
              >
                <option value="SELECT" disabled>Enstrüman Seç...</option>
                {stocks.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="p-4 bg-bg-base/40 border-b border-outline-variant/30 flex flex-col sm:flex-row gap-3 items-center shrink-0 text-xs">
          {/* Portfolio filter */}
          <div className="w-full sm:w-auto">
            <label className="block text-[9px] text-text-muted font-label-caps uppercase mb-1">Portföy Seçimi</label>
            <select
              value={selectedPortfolio}
              onChange={(e) => setSelectedPortfolio(e.target.value)}
              className="w-full sm:w-44 bg-bg-card border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary font-sans text-xs text-text-primary font-medium"
            >
              <option value="ALL">Tüm Portföyler</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div className="w-full sm:w-auto">
            <label className="block text-[9px] text-text-muted font-label-caps uppercase mb-1">İşlem Yönü</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full sm:w-32 bg-bg-card border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary font-sans text-xs text-text-primary font-medium"
            >
              <option value="ALL">Tümü (AL/SAT)</option>
              <option value="BUY">Alışlar (BUY)</option>
              <option value="SELL">Satışlar (SELL)</option>
            </select>
          </div>

          {/* Symbol filter */}
          <div className="w-full sm:w-auto">
            <label className="block text-[9px] text-text-muted font-label-caps uppercase mb-1">Enstrüman</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full sm:w-32 bg-bg-card border border-outline-variant rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary font-sans text-xs text-text-primary font-medium"
            >
              <option value="ALL">Tüm Hisseler</option>
              {symbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="w-full sm:flex-1 sm:ml-auto">
            <label className="block text-[9px] text-text-muted font-label-caps uppercase mb-1">Notlarda Arama</label>
            <input
              type="text"
              placeholder="Tez, not veya açıklama ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-card border border-outline-variant rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary font-sans text-xs text-text-primary placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Trades Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="border border-outline-variant rounded-xl overflow-hidden bg-bg-card/30">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-bg-base border-b border-outline-variant/40 text-[9px] font-label-caps text-text-muted tracking-wider uppercase">
                  <th className="py-2.5 px-4">Tarih</th>
                  <th className="py-2.5 px-4">Portföy</th>
                  <th className="py-2.5 px-4">Sembol</th>
                  <th className="py-2.5 px-4">İşlem Yönü</th>
                  <th className="py-2.5 px-4 text-right">Adet</th>
                  <th className="py-2.5 px-4 text-right">İşlem Fiyatı</th>
                  <th className="py-2.5 px-4 text-right">Toplam Tutar</th>
                  <th className="py-2.5 px-4">Yatırım Tezi / Açıklama</th>
                  <th className="py-2.5 px-4 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-text-muted font-sans text-xs">
                      Aranan kriterlere uygun işlem kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map((trade) => {
                    const totalCost = trade.quantity * trade.price;
                    const dateFormatted = new Date(trade.date).toLocaleString('tr-TR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={trade.id} className="hover:bg-bg-base/30 transition-colors font-sans">
                        {/* Date */}
                        <td className="py-3 px-4 font-data-mono text-text-secondary whitespace-nowrap">
                          {dateFormatted}
                        </td>

                        {/* Portfolio */}
                        <td className="py-3 px-4 font-bold text-text-secondary whitespace-nowrap">
                          {portfolioMap[trade.portfolioId || ''] || 'Teknoloji Portföyüm'}
                        </td>

                        {/* Symbol */}
                        <td className="py-3 px-4 font-data-mono font-bold text-primary">
                          {trade.symbol}
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded ${
                              trade.type === 'BUY'
                                ? 'bg-bull-green/10 text-bull-green'
                                : 'bg-bear-red/10 text-bear-red'
                            }`}
                          >
                            {trade.type === 'BUY' ? 'ALIŞ' : 'SATIŞ'}
                          </span>
                        </td>

                        {/* Qty */}
                        <td className="py-3 px-4 text-right font-data-mono font-bold text-text-primary">
                          {trade.quantity.toFixed(4)}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-4 text-right font-data-mono text-text-secondary">
                          ${trade.price.toFixed(2)}
                        </td>

                        {/* Total Cost */}
                        <td className="py-3 px-4 text-right font-data-mono font-bold text-text-primary">
                          ${totalCost.toFixed(2)}
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-4 text-text-secondary max-w-xs truncate" title={trade.notes}>
                          {trade.notes}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              if (confirm('Bu işlemi silmek istediğinize emin misiniz? Portföy pozisyonunuz otomatik olarak geri hesaplanacaktır.')) {
                                onRemoveTrade(trade.id);
                              }
                            }}
                            className="p-1 hover:bg-bear-red/10 border border-transparent hover:border-bear-red/25 rounded text-text-muted hover:text-bear-red transition-all"
                            title="İşlemi Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant bg-bg-card/45 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary-container text-on-primary-container hover:opacity-95 text-xs font-bold rounded-lg shadow-md transition-all uppercase"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
