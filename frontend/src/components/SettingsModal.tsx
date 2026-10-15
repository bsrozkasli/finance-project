import { Settings, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 p-4 backdrop-blur-md">
      <section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-md rounded-xl border border-outline bg-bg-primary shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-outline-variant p-4">
          <h2 id="settings-title" className="flex items-center gap-2 font-headline text-base font-semibold text-text-primary">
            <Settings className="h-5 w-5 text-primary" aria-hidden="true" /> Nexus Terminal System Settings
          </h2>
          <button type="button" onClick={onClose} aria-label="Dismiss settings" className="rounded-lg p-2 text-text-secondary hover:bg-bg-card focus-visible:outline-2 focus-visible:outline-primary">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="space-y-3 p-5 text-sm text-text-secondary">
          <p>Prices and research come from the configured backend providers. Their availability can change by symbol and time.</p>
          <p>Open a symbol to see its latest available evidence. Missing prices and reports are shown as unavailable.</p>
          <p>Portfolio transactions, watchlists, and journal entries are stored by the backend.</p>
        </div>
        <footer className="flex justify-end border-t border-outline-variant p-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container focus-visible:outline-2 focus-visible:outline-primary">
            Close Settings
          </button>
        </footer>
      </section>
    </div>
  );
}
