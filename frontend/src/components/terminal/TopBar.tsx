import { useState, useEffect, useRef } from 'react';
import type { Asset } from '../../api/types';

interface TopBarProps {
  assets: Asset[];
  onSelectAsset: (symbol: string) => void;
  onManageAssets: () => void;
}

function useClockTick() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function isMarketOpen(date: Date): boolean {
  // NYSE: Mon-Fri, 09:30-16:00 ET (UTC-4 / UTC-5)
  const utcH = date.getUTCHours();
  const utcM = date.getUTCMinutes();
  const utcDay = date.getUTCDay(); // 0=Sun, 6=Sat
  const totalMinutesUTC = utcH * 60 + utcM;
  // ET = UTC-4 (EDT) — approx. open=13:30 UTC, close=20:00 UTC
  const openUTC = 13 * 60 + 30;
  const closeUTC = 20 * 60;
  return utcDay >= 1 && utcDay <= 5 && totalMinutesUTC >= openUTC && totalMinutesUTC < closeUTC;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export const TopBar = ({ assets, onSelectAsset, onManageAssets }: TopBarProps) => {
  const now = useClockTick();
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const marketOpen = isMarketOpen(now);

  // Local time
  const localH = pad2(now.getHours());
  const localM = pad2(now.getMinutes());
  const localS = pad2(now.getSeconds());
  const localDate = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

  // UTC time
  const utcH = pad2(now.getUTCHours());
  const utcM = pad2(now.getUTCMinutes());

  const filtered = search.trim().length > 0
    ? assets.filter(
        (a) =>
          a.symbol.toLowerCase().includes(search.toLowerCase()) ||
          a.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 7)
    : [];

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (symbol: string) => {
    onSelectAsset(symbol);
    setSearch('');
    setShowDropdown(false);
  };

  return (
    <header
      className="terminal-topbar flex items-center gap-3 px-4 border-b"
      style={{
        background: 'var(--color-bg-primary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 shrink-0 mr-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
            fill="var(--color-accent)"
            stroke="var(--color-accent-light)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-bold text-sm tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
          APEX <span style={{ color: 'var(--color-accent-light)' }}>TERMINAL</span>
        </span>
      </div>

      <div className="w-px h-5 shrink-0" style={{ background: 'var(--color-border)' }} />

      {/* Search */}
      <div ref={wrapperRef} className="relative flex-1 max-w-md">
        <div
          className="flex items-center gap-2 rounded-lg px-3 h-8"
          style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
        >
          <svg width="13" height="13" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            id="terminal-search"
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Sembol veya şirket ara..."
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--color-text-primary)' }}
            autoComplete="off"
          />
          {search && (
            <button onClick={() => { setSearch(''); setShowDropdown(false); }} style={{ color: 'var(--color-text-secondary)' }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {showDropdown && filtered.length > 0 && (
          <div
            className="absolute top-full mt-1 left-0 right-0 rounded-lg overflow-hidden z-50 animate-fade-in"
            style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          >
            {filtered.map((a) => (
              <button
                key={a.symbol}
                onClick={() => handleSelect(a.symbol)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
                style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="font-bold text-xs w-16 shrink-0" style={{ color: 'var(--color-accent-light)', fontFamily: 'var(--font-mono)' }}>
                  {a.symbol}
                </span>
                <span className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{a.name}</span>
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent-light)' }}
                >
                  {a.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Market status */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold shrink-0"
        style={{
          background: marketOpen ? 'rgba(0,212,160,0.1)' : 'rgba(100,116,139,0.1)',
          color: marketOpen ? 'var(--color-bull)' : 'var(--color-text-secondary)',
          border: `1px solid ${marketOpen ? 'rgba(0,212,160,0.2)' : 'var(--color-border)'}`,
        }}
      >
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
            background: marketOpen ? 'var(--color-bull)' : 'var(--color-text-muted)',
            animation: marketOpen ? 'pulse-live 1.8s ease-in-out infinite' : 'none',
          }}
        />
        {marketOpen ? 'PİYASA AÇIK' : 'PİYASA KAPALI'}
      </div>

      {/* Clock */}
      <div className="shrink-0 text-right" style={{ minWidth: 140 }}>
        <div className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)', letterSpacing: '0.04em' }}>
          {localH}:{localM}:{localS}
        </div>
        <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {localDate} · UTC {utcH}:{utcM}
        </div>
      </div>

      <div className="w-px h-5 shrink-0" style={{ background: 'var(--color-border)' }} />

      {/* Manage Assets */}
      <button
        id="manage-assets-btn"
        onClick={onManageAssets}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
        style={{
          background: 'var(--color-accent-dim)',
          color: 'var(--color-accent-light)',
          border: '1px solid rgba(99,102,241,0.3)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent-dim)'; }}
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" />
        </svg>
        Varlık Yönet
      </button>

      {/* Settings */}
      <button
        id="settings-btn"
        className="p-1.5 rounded-lg transition-colors shrink-0"
        style={{ color: 'var(--color-text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--color-bg-card)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      </button>
    </header>
  );
};
