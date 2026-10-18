import { useEffect, useRef } from 'react';
import { Settings, X } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const appVersion = import.meta.env.VITE_APP_VERSION ?? '0.0.0';

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-md rounded-xl border border-outline-variant bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-outline-variant p-5">
          <h2 id="settings-title" className="flex items-center gap-2 text-lg font-semibold"><Settings className="w-5 h-5 text-primary" />Ayarlar</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Kapat" className="min-w-11 min-h-11 grid place-items-center rounded-lg text-text-secondary hover:bg-surface-container-high hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-5 text-sm">
          <div className="flex justify-between gap-4"><span className="text-text-secondary">Arayüz dili</span><strong>Türkçe</strong></div>
          <div className="flex justify-between gap-4"><span className="text-text-secondary">Sürüm</span><strong className="font-data-mono">v{appVersion}</strong></div>
          <p className="rounded-lg border border-outline-variant bg-bg-base p-4 text-text-secondary">Piyasa fiyatları yalnız bağlı sağlayıcıdan gelen kanıtlarla gösterilir. Bu ekranda fiyat akışını değiştiren bir ayar bulunmaz.</p>
        </div>
      </div>
    </div>
  );
}
