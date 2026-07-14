import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  LayoutList,
  Newspaper,
  Sparkles,
  Settings,
  HelpCircle,
  Briefcase,
  BookOpen,
  SlidersHorizontal
} from 'lucide-react';

interface LeftNavProps {
  onOpenSettings: () => void;
  onOpenManageAssets: () => void;
}

export default function LeftNav({ onOpenSettings, onOpenManageAssets }: LeftNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { path: '/', label: 'Overview', icon: BarChart3 },
    { path: '/portfolios', aliases: ['/portfolio'], label: 'Portfolio Management', icon: Briefcase },
    { path: '/charts', label: 'Technical Chart', icon: TrendingUp },
    { path: '/watchlist', label: 'Watchlists', icon: LayoutList },
    { path: '/news', label: 'News Feed', icon: Newspaper },
    { path: '/reports', label: 'AI Analysis', icon: Sparkles },
    { path: '/journal', label: 'Trading Journal', icon: BookOpen },
  ];

  return (
    <aside className="w-16 md:w-56 bg-bg-base border-r border-outline-variant flex flex-col justify-between shrink-0 z-10">
      <div className="py-6 flex flex-col gap-1 px-2 md:px-3">
        <div className="hidden md:block text-[10px] text-text-muted font-label-caps uppercase tracking-wider px-3 mb-2">
          Workspace
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || item.aliases?.includes(currentPath) || (currentPath.startsWith(item.path) && item.path !== '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all group ${
                isActive
                  ? 'bg-primary-container/15 text-primary border-l-4 border-primary font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card/50'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary transition-colors'}`} />
              <span className="hidden md:inline text-sm truncate font-sans">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="py-6 px-2 md:px-3 border-t border-outline-variant/30 flex flex-col gap-1">
        <button
          onClick={onOpenManageAssets}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card/50 text-left transition-all group"
        >
          <SlidersHorizontal className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
          <span className="hidden md:inline text-xs font-sans">Manage Assets</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card/50 text-left transition-all group"
        >
          <Settings className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
          <span className="hidden md:inline text-xs font-sans">System Settings</span>
        </button>
        <a
          href="https://github.com/bsrozkasli/finance-project"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card/50 text-left transition-all group"
        >
          <HelpCircle className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
          <span className="hidden md:inline text-xs font-sans">GitHub Source</span>
        </a>
      </div>
    </aside>
  );
}
