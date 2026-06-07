interface NavItem {
  id: string;
  label: string;
  active?: boolean;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'market',
    label: 'Piyasa Takibi',
    active: true,
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'watchlist',
    label: 'İzleme Listeleri',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'chart',
    label: 'Grafik Terminali',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <polyline points="7 16 11 10 14 14 17 9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'news',
    label: 'Haber Merkezi',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 14H12M18 10h-4M18 18h-4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'scanner',
    label: 'Tarayıcılar',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'portfolio',
    label: 'Portföy Analizi',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface LeftNavProps {
  activeId: string;
  onSelect: (id: string) => void;
}

export const LeftNav = ({ activeId, onSelect }: LeftNavProps) => {
  return (
    <nav
      className="terminal-leftnav flex flex-col items-center pt-2 pb-4 gap-1 border-r"
      style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border)' }}
    >
      {NAV_ITEMS.map((item) => (
        <div key={item.id} className="nav-item relative w-full flex justify-center">
          <button
            id={`nav-${item.id}`}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all"
            style={{
              color: item.id === activeId ? 'var(--color-accent-light)' : 'var(--color-text-secondary)',
              background: item.id === activeId ? 'var(--color-accent-dim)' : 'transparent',
            }}
            onClick={() => onSelect(item.id)}
            onMouseEnter={(e) => {
              if (item.id !== activeId) {
                e.currentTarget.style.color = 'var(--color-text-primary)';
                e.currentTarget.style.background = 'var(--color-bg-card)';
              }
            }}
            onMouseLeave={(e) => {
              if (item.id !== activeId) {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {item.icon}
          </button>

          {/* Tooltip */}
          <div
            className="nav-tooltip absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              {item.label}
            </div>
          </div>
        </div>
      ))}

      {/* Bottom: divider + version */}
      <div className="mt-auto w-full flex justify-center">
        <div className="w-6 h-px mb-3" style={{ background: 'var(--color-border)' }} />
      </div>
      <div
        className="text-center"
        style={{ fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
      >
        v2.0
      </div>
    </nav>
  );
};
