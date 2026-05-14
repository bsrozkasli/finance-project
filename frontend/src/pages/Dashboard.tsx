import { useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { AssetGrid } from '../components/AssetGrid';
import { ChartOverlay } from '../components/ChartOverlay';
import { RightSidebar } from '../components/RightSidebar';

export const Dashboard = () => {
  const { assets, loading, error, addAssets } = useAssets();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col sm:flex-row items-center justify-between">
        <div className="text-center sm:text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
            Market <span style={{ color: 'var(--color-accent-light)' }}>Overview</span>
          </h1>
          <p className="text-lg text-white/50">
            Real-time insights and premium financial data analysis.
          </p>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="mt-4 sm:mt-0 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold tracking-wide flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Manage Assets
        </button>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8">
          <strong>Error loading dashboard:</strong> {error}
        </div>
      )}

      <main>
        <AssetGrid 
          assets={assets} 
          loading={loading} 
          onSelectAsset={(symbol) => setSelectedAsset(symbol)} 
        />
      </main>

      {selectedAsset && (
        <ChartOverlay 
          symbol={selectedAsset} 
          onClose={() => setSelectedAsset(null)} 
        />
      )}

      <RightSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onAddAssets={addAssets}
        watchedAssets={assets}
        onSelectAsset={(asset) => setSelectedAsset(asset.symbol)}
      />
    </div>
  );
};
