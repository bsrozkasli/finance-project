import React, { useState } from 'react';
import type { Asset } from '../api/types';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAssets: (symbols: string[]) => Promise<void>;
  watchedAssets: Asset[];
  onSelectAsset: (asset: Asset) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  onClose,
  onAddAssets,
  watchedAssets,
  onSelectAsset,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSymbol = () => {
    const symbol = inputValue.trim().toUpperCase();
    if (symbol && !symbols.includes(symbol)) {
      setSymbols([...symbols, symbol]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddSymbol();
    }
  };

  const handleRemoveSymbol = (symToRemove: string) => {
    setSymbols(symbols.filter((s) => s !== symToRemove));
  };

  const handleSave = async () => {
    if (symbols.length === 0) return;
    setIsSubmitting(true);
    try {
      await onAddAssets(symbols);
      setSymbols([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-white/10 p-6 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-wide">Manage Assets</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add Assets Section */}
        <div className="mb-8">
          <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Add New Assets</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. AAPL, FROTO.IS"
              className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={handleAddSymbol}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded transition-colors"
            >
              +
            </button>
          </div>

          {/* Pending symbols */}
          {symbols.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {symbols.map((sym) => (
                <div
                  key={sym}
                  className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded text-sm flex items-center gap-2"
                >
                  {sym}
                  <button
                    onClick={() => handleRemoveSymbol(sym)}
                    className="hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={symbols.length === 0 || isSubmitting}
            className={`w-full py-2 rounded font-medium transition-all ${
              symbols.length === 0 || isSubmitting
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save to Database'}
          </button>
        </div>

        {/* Watchlist Section */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Your Watchlist</h3>
          {watchedAssets.length === 0 ? (
            <p className="text-slate-500 text-sm">No assets saved yet.</p>
          ) : (
            <div className="space-y-2">
              {watchedAssets.map((asset) => (
                <div
                  key={asset.symbol}
                  onClick={() => onSelectAsset(asset)}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 rounded p-3 cursor-pointer transition-colors group flex justify-between items-center"
                >
                  <div>
                    <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {asset.symbol}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[150px]">
                      {asset.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-500 uppercase">
                      {asset.type || 'ASSET'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
