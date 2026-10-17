import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Search, Settings } from 'lucide-react';
import type { Asset } from '../api/types';
import type { Stock } from '../types';

interface TopBarProps {
  stocks: Stock[];
  assets?: Asset[];
  onSelectStock: (stock: Stock) => void;
  onSelectAsset?: (asset: Asset) => void;
  onOpenTradingJournal: () => void;
  onOpenSettings?: () => void;
  pageTitle?: string;
  focusMode?: boolean;
  onToggleFocus?: () => void;
}

export default function TopBar({
  stocks,
  assets = [],
  onSelectStock,
  onSelectAsset,
  onOpenTradingJournal,
  onOpenSettings,
  pageTitle='Araştır',
  focusMode=false,
  onToggleFocus,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex,setActiveIndex]=useState(0);
  const searchRef=useRef<HTMLInputElement>(null);
  const searchArea=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const shortcut=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){if(document.querySelector('dialog[open],[role="dialog"][aria-modal="true"]'))return;event.preventDefault();searchRef.current?.focus();}};
    const outside=(event:PointerEvent)=>{if(!searchArea.current?.contains(event.target as Node))setSearchQuery('');};
    document.addEventListener('keydown',shortcut);document.addEventListener('pointerdown',outside);
    return ()=>{document.removeEventListener('keydown',shortcut);document.removeEventListener('pointerdown',outside);};
  },[]);
  const stockBySymbol = useMemo(() => new Map(stocks.map((stock) => [stock.symbol, stock])), [stocks]);
  const searchable = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...assets.map((asset) => ({ ...asset, stock: stockBySymbol.get(asset.symbol) })),
      ...stocks.filter((stock) => !assets.some((asset) => asset.symbol === stock.symbol))
        .map((stock) => ({ symbol: stock.symbol, name: stock.name, type: stock.sector, stock })),
    ].filter((asset) => {
      if (seen.has(asset.symbol)) return false;
      seen.add(asset.symbol);
      return true;
    });
  }, [assets, stocks, stockBySymbol]);

  const results = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return [];
    return searchable.filter((asset) =>
      [asset.symbol, asset.name, asset.type].some((value) => value.toLocaleLowerCase('tr-TR').includes(query))
    ).slice(0, 8);
  }, [searchQuery, searchable]);

  return (
    <header className="desk-topbar">
      <div className="desk-header-brand">
        <span className="w-9 h-9 rounded-lg bg-primary-container text-bg-base grid place-items-center font-bold text-lg" aria-hidden="true">M</span>
        <div className="hidden sm:block">
          <div className="font-headline text-lg font-bold leading-tight tracking-tight text-text-primary">Mercek</div>
          <div className="text-[10px] uppercase tracking-[.12em] text-text-muted">Araştırma alanı</div>
        </div>
      </div>

      <p className="desk-breadcrumb">Çalışma alanı <span>/</span> <strong>{pageTitle}</strong></p>
      <div className="desk-search relative min-w-0" ref={searchArea}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
        <input
          type="search"
          role="combobox"
          aria-autocomplete="list"
          ref={searchRef}
          aria-label="Kayıtlı varlıklarda ara"
          placeholder="Kayıtlı varlıklarda ara"
          aria-controls={searchQuery.trim()?'saved-asset-results':undefined}
          aria-expanded={Boolean(searchQuery.trim())}
          aria-activedescendant={results[activeIndex]?`search-result-${results[activeIndex].symbol}`:undefined}
          value={searchQuery}
          onChange={(event) => {setSearchQuery(event.target.value);setActiveIndex(0);}}
          onKeyDown={event=>{
            if(event.key==='Escape'){setSearchQuery('');return;}
            if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setActiveIndex(index=>results.length?(index+(event.key==='ArrowDown'?1:results.length-1))%results.length:0);}
            if(event.key==='Enter'&&results[activeIndex]){event.preventDefault();const asset=results[activeIndex];if(asset.stock)onSelectStock(asset.stock);else onSelectAsset?.(asset);setSearchQuery('');}
          }}
          className="w-full h-10 rounded-lg border border-outline-variant bg-bg-card pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        />
        {searchQuery.trim() && (
          <div className="desk-search-results">
            <div className="px-3 py-1 text-xs font-medium text-text-muted" role="status">Eşleşen varlıklar · {results.length} sonuç</div>
            <div id="saved-asset-results" role="listbox" aria-label="Eşleşen kayıtlı varlıklar">{results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-text-secondary">Eşleşen kayıt bulunamadı.</p>
            ) : results.map((asset,index) => (
              <button
                key={asset.symbol}
                id={`search-result-${asset.symbol}`}
                type="button"
                role="option"
                aria-selected={index===activeIndex}
                onClick={() => {
                  if (asset.stock) onSelectStock(asset.stock);
                  else onSelectAsset?.(asset);
                  setSearchQuery('');
                }}
                className={`desk-search-result ${index===activeIndex?'is-active':''}`}
              >
                <span className="min-w-0"><strong className="font-data-mono text-primary mr-2">{asset.symbol}</strong><span className="text-text-secondary text-sm truncate">{asset.name}</span></span>
                <span className="shrink-0 font-data-mono text-xs text-text-muted">{asset.stock ? `$${asset.stock.price.toFixed(2)}` : 'Fiyat yok'}</span>
              </button>
            ))}</div>
          </div>
        )}
      </div>
      {onToggleFocus&&<button className="desk-focus-button" type="button" aria-pressed={focusMode} onClick={onToggleFocus}>{focusMode?'Odaktan çık':'Odak modu'}</button>}

      <button type="button" onClick={onOpenTradingJournal} aria-label="Günlük" className="hidden sm:flex items-center gap-2 min-h-10 px-3 rounded-lg border border-outline-variant text-text-secondary hover:text-text-primary hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-primary text-sm">
        <BookOpen className="w-4 h-4" /> Günlük
      </button>
      {onOpenSettings && <button type="button" onClick={onOpenSettings} aria-label="Ayarlar" className="md:hidden min-w-10 min-h-10 grid place-items-center rounded-lg border border-outline-variant text-text-secondary"><Settings className="w-4 h-4" /></button>}
    </header>
  );
}
