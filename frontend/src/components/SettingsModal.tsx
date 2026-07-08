import { X, Settings, RefreshCw, ShieldCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  volatility: 'low' | 'normal' | 'high';
  onUpdateVolatility: (v: 'low' | 'normal' | 'high') => void;
  onResetDatabase: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  volatility,
  onUpdateVolatility,
  onResetDatabase,
}: SettingsModalProps) {
  const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0';
  const frontendPort = import.meta.env.VITE_PORT ?? '5173';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 backdrop-blur-md p-4 animate-fade-in font-sans text-xs">
      <div className="bg-bg-primary border border-outline-variant rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-outline-variant bg-bg-card/45 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
              Nexus Terminal System Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-card rounded-lg border border-outline-variant/60 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="space-y-2">
            <label className="block text-text-muted font-label-caps text-[10px] uppercase tracking-wider">
              Market Feed Volatility
            </label>
            <p className="text-[11px] text-text-secondary leading-normal">
              Controls the simulated price movement factor used when prices refresh periodically or manually.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['low', 'normal', 'high'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onUpdateVolatility(v)}
                  className={`py-2 text-center rounded-lg font-bold border capitalize transition-all ${
                    volatility === v
                      ? 'bg-primary-container/20 border-primary text-primary font-extrabold'
                      : 'bg-bg-base border-outline-variant/50 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-[1px] bg-outline-variant/30" />

          <div className="space-y-2.5">
            <label className="block text-bear-red font-label-caps text-[10px] uppercase tracking-wider">
              Local Preferences
            </label>
            <p className="text-[11px] text-text-secondary leading-normal">
              Resets browser-only UI preferences. Backend portfolio, journal, and watchlist data is not deleted.
            </p>
            <button
              onClick={() => {
                if (confirm('Reset local UI preferences? Backend data will not be deleted.')) {
                  onResetDatabase();
                  onClose();
                }
              }}
              className="w-full py-2 bg-bear-red/10 border border-bear-red/35 hover:bg-bear-red/20 text-bear-red font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Local Preferences</span>
            </button>
          </div>

          <div className="w-full h-[1px] bg-outline-variant/30" />

          <div className="bg-bg-base/60 p-3 rounded-xl border border-outline-variant/30 space-y-1.5 font-data-mono text-[10px]">
            <div className="flex justify-between items-center text-text-secondary">
              <span>System Version:</span>
              <span className="text-text-primary font-bold">v{appVersion}</span>
            </div>
            <div className="flex justify-between items-center text-text-secondary">
              <span>Frontend Port:</span>
              <span className="text-primary font-bold">{frontendPort} (Vite)</span>
            </div>
            <div className="flex justify-between items-center text-text-secondary">
              <span>Browser Preferences:</span>
              <span className="text-bull-green font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Connected
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-outline-variant bg-bg-card/45 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary-container text-on-primary-container hover:opacity-95 text-xs font-bold font-sans rounded-lg shadow-md transition-opacity"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
