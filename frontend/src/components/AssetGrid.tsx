import type { Asset } from '../api/types';

interface AssetGridProps {
  assets: Asset[];
  loading: boolean;
  onSelectAsset: (symbol: string) => void;
}

export const AssetGrid = ({ assets, loading, onSelectAsset }: AssetGridProps) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--color-accent)' }}></div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No assets available. Make sure the database is populated.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assets.map((asset) => (
        <div
          key={asset.symbol}
          onClick={() => onSelectAsset(asset.symbol)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:-translate-y-1"
          style={{
            background: 'linear-gradient(145deg, var(--color-bg-card), var(--color-bg-secondary))',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Glass highlight effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{asset.symbol}</h3>
              <p className="text-sm font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {asset.name}
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-white/5 border border-white/10 text-white/80">
              {asset.type}
            </span>
          </div>
          
          <div className="mt-6 flex items-center gap-2 text-sm" style={{ color: 'var(--color-accent-light)' }}>
            <span className="material-symbols-outlined text-sm">View Chart &rarr;</span>
          </div>
        </div>
      ))}
    </div>
  );
};
