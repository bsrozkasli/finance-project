interface NavItem {
  id: string;
  label: string;
  active?: boolean;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    active: true,
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10v10h14V10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 20v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'workspace',
    label: 'Workplace',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 15l3-4 3 2 4-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M6 3h9l3 3v15H6z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12h6M9 16h4M14 3v4h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'watchlist',
    label: 'Watchlist',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: 'news',
    label: 'News',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M4 19V5h14a2 2 0 012 2v12H4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 9h8M8 13h6M4 19a2 2 0 01-2-2v-7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'AI Reports',
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
        <path d="M12 3v3M12 18v3M4.6 5.6l2.1 2.1M17.3 16.3l2.1 2.1M3 12h3M18 12h3M4.6 18.4l2.1-2.1M17.3 7.7l2.1-2.1" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3" />
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
