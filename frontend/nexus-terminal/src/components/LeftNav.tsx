import React from 'react';
import {
  BarChart3,
  TrendingUp,
  LayoutList,
  Newspaper,
  Sparkles,
  Settings,
  HelpCircle,
  Activity,
  Briefcase
} from 'lucide-react';

export type ViewType = 'dashboard' | 'charts' | 'watchlist' | 'news' | 'reports' | 'portfolios';

interface LeftNavProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onOpenSettings: () => void;
}

export default function LeftNav({ currentView, onViewChange, onOpenSettings }: LeftNavProps) {
  const menuItems = [
    {
      id: 'dashboard' as ViewType,
      label: 'Genel Bakış',
      icon: BarChart3,
    },
    {
      id: 'portfolios' as ViewType,
      label: 'Portföy Yönetimi',
      icon: Briefcase,
    },
    {
      id: 'charts' as ViewType,
      label: 'Teknik Grafik',
      icon: TrendingUp,
    },
    {
      id: 'watchlist' as ViewType,
      label: 'İzleme Listeleri',
      icon: LayoutList,
    },
    {
      id: 'news' as ViewType,
      label: 'Haber Akışı',
      icon: Newspaper,
    },
    {
      id: 'reports' as ViewType,
      label: 'AI Analiz',
      icon: Sparkles,
    },
  ];

  return (
    <aside className="w-16 md:w-56 bg-bg-base border-r border-outline-variant flex flex-col justify-between shrink-0 z-10">
      {/* Primary Navigation Items */}
      <div className="py-6 flex flex-col gap-1 px-2 md:px-3">
        <div className="hidden md:block text-[10px] text-text-muted font-label-caps uppercase tracking-wider px-3 mb-2">
          Workspace
        </div>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all group ${
                isActive
                  ? 'bg-primary-container/15 text-primary border-l-4 border-primary font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card/50'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-primary transition-colors'}`} />
              <span className="hidden md:inline text-sm truncate font-sans">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Support/Settings */}
      <div className="py-6 px-2 md:px-3 border-t border-outline-variant/30 flex flex-col gap-1">
        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card/50 text-left transition-all group"
        >
          <Settings className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
          <span className="hidden md:inline text-xs font-sans">Sistem Ayarları</span>
        </button>

        {/* Documentation / Help */}
        <a
          href="https://github.com/bsrozkasli/finance-project"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card/50 text-left transition-all group"
        >
          <HelpCircle className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
          <span className="hidden md:inline text-xs font-sans">GitHub Kaynak</span>
        </a>
      </div>
    </aside>
  );
}
