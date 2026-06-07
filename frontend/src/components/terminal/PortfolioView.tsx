import type { Asset } from '../../api/types';
import { useLivePrice } from '../../hooks/useLivePrice';

const PortfolioItem = ({ asset }: { asset: Asset }) => {
  const { data, loading } = useLivePrice(asset.symbol);
  
  const positive = data ? data.changePct >= 0 : true;
  const changeColor = positive ? 'var(--color-bull)' : 'var(--color-bear)';

  return (
    <div className="p-4 rounded-xl border border-white/10" style={{ background: 'var(--color-bg-card)' }}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-bold text-lg text-white">{asset.symbol}</div>
          <div className="text-xs text-white/50">{asset.name}</div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-xs font-medium text-slate-500 uppercase bg-slate-500/10 px-2 py-1 rounded mb-1">
            {asset.type}
          </div>
          {loading ? (
            <div className="skeleton rounded w-12 h-4 mt-1"></div>
          ) : data ? (
            <div 
              className="text-xs font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{ color: changeColor, background: positive ? 'var(--color-bull-dim)' : 'var(--color-bear-dim)' }}
            >
              <span>{positive ? '▲' : '▼'}</span>
              <span>{Math.abs(data.changePct).toFixed(2)}%</span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
        <div>
          <div className="text-xs text-white/50">Son Fiyat</div>
          <div className="font-mono text-white text-sm">
            {loading ? '...' : data ? `$${data.price.toFixed(2)}` : '—'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/50">Miktar (Lot)</div>
          <div className="font-mono text-white text-sm">—</div>
        </div>
      </div>
    </div>
  );
};

export const PortfolioView = ({ assets }: { assets: Asset[] }) => {
  return (
    <div className="terminal-main overflow-y-auto p-6" style={{ background: 'var(--color-bg-primary)' }}>
      <h2 className="text-xl font-bold mb-6 text-white">Portföy Analizi</h2>
      
      {assets.length === 0 ? (
        <div className="text-white/50">
          İzleme listenizde hiç varlık yok. Sağ üstteki + butonundan varlık ekleyebilirsiniz.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {assets.map(asset => (
            <PortfolioItem key={asset.symbol} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
};
