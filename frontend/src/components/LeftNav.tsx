import { Link, useLocation } from 'react-router-dom';
import { HelpCircle, Settings, SlidersHorizontal } from 'lucide-react';
import { NAV_GROUPS, matchesPath } from './shell/navigation';

interface LeftNavProps {
  onOpenSettings: () => void;
  onOpenManageAssets: () => void;
}

export default function LeftNav({ onOpenSettings, onOpenManageAssets }: LeftNavProps) {
  const { pathname } = useLocation();
  return (
    <aside className="desk-sidebar" aria-label="Ana gezinme">
      <div>
        <Link to="/dashboard" className="desk-brand" aria-label="Mercek ana sayfa"><span aria-hidden="true">m</span>mercek<span className="desk-brand-dot">.</span></Link>
        <div className="desk-nav-caption">YATIRIM ARAŞTIRMA ALANI</div>
        <nav className="desk-nav" aria-label="Ana menü">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="desk-nav-group">
              <div className="desk-nav-group-label" aria-hidden="true">{group.label}</div>
              {group.items.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  aria-current={matchesPath(pathname, path) ? 'page' : undefined}
                  className="desk-nav-item"
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className="desk-sidebar-tools">
        <p>Kanıtı incele.<br/>Kararını kendin ver.</p>
        <button type="button" onClick={onOpenManageAssets} aria-label="Varlıkları yönet" className="flex items-center gap-3 min-h-11 px-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card text-sm text-left focus-visible:outline-2 focus-visible:outline-primary"><SlidersHorizontal className="w-5 h-5" />Varlıkları yönet</button>
        <button type="button" onClick={onOpenSettings} aria-label="Ayarlar" className="flex items-center gap-3 min-h-11 px-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card text-sm text-left focus-visible:outline-2 focus-visible:outline-primary"><Settings className="w-5 h-5" />Ayarlar</button>
        <a href="https://github.com/bsrozkasli/finance-project" target="_blank" rel="noreferrer" aria-label="Kaynak kodu (GitHub)" className="flex items-center gap-3 min-h-11 px-3 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card text-sm focus-visible:outline-2 focus-visible:outline-primary"><HelpCircle className="w-5 h-5" />Kaynak kodu</a>
      </div>
    </aside>
  );
}
