import { useState } from 'react';
import { useAssets } from '../hooks/useAssets';
import { AssetGrid } from '../components/AssetGrid';
import { ChartOverlay } from '../components/ChartOverlay';

export const Dashboard = () => {
  const { assets, loading, error } = useAssets();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      <header className="mb-10 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">
          Market <span style={{ color: 'var(--color-accent-light)' }}>Overview</span>
        </h1>
        <p className="text-lg text-white/50">
          Real-time insights and premium financial data analysis.
        </p>
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
    </div>
  );
};
