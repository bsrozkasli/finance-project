import {
  Briefcase,
  ChartCandlestick,
  CirclePlus,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  /** Left navigation label and screen title (spec ui-redesign-v2 section 2). */
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Genel',
    items: [
      { path: '/dashboard', label: 'Panel', icon: LayoutDashboard },
      { path: '/compare', label: 'Karşılaştırma', icon: GitCompareArrows },
    ],
  },
  {
    label: 'Piyasa',
    items: [
      { path: '/news', label: 'Haberler', icon: Newspaper },
      { path: '/watchlist', label: 'İzleme Listeleri', icon: ListChecks },
    ],
  },
  {
    label: 'Hisseler',
    items: [
      { path: '/workspace', label: 'Şirket Analizi', icon: ChartCandlestick },
      { path: '/reports', label: 'Raporlar', icon: FileText },
    ],
  },
  {
    label: 'Portföy',
    items: [
      { path: '/portfolio', label: 'Portföylerim', icon: Briefcase },
      { path: '/journal', label: 'İşlem Ekle', icon: CirclePlus },
      { path: '/transactions', label: 'Kazanç Analizi', icon: TrendingUp },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

export const matchesPath = (pathname: string, path: string): boolean => (
  pathname === path || pathname.startsWith(`${path}/`)
);

/** Screen title for a browser path; unknown paths fall back to the dashboard title. */
export const routeTitle = (pathname: string): string => (
  ALL_ITEMS.find((item) => matchesPath(pathname, item.path))?.label ?? 'Panel'
);
