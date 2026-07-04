import React, { useState } from 'react';
import { X, Settings, RefreshCw, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/75 backdrop-blur-md p-4 animate-fade-in font-sans text-xs">
      <div className="bg-bg-primary border border-outline-variant rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-outline-variant bg-bg-card/45 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            <h3 className="font-headline text-sm font-bold text-text-primary uppercase tracking-wide">
              Nexus Terminal Sistem Ayarları
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-bg-card rounded-lg border border-outline-variant/60 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5">
          {/* Section 1: Price feed simulation settings */}
          <div className="space-y-2">
            <label className="block text-text-muted font-label-caps text-[10px] uppercase tracking-wider">
              Piyasa Akış Volatilitesi (Simulation Volatility)
            </label>
            <p className="text-[11px] text-text-secondary leading-normal">
              Yenile butonuna tıklandığında veya periyodik güncellemede hisse senedi fiyatlarındaki dalgalanma katsayısını ayarlar.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['low', 'normal', 'high'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onUpdateVolatility(v as any)}
                  className={`py-2 text-center rounded-lg font-bold border capitalize transition-all ${
                    volatility === v
                      ? 'bg-primary-container/20 border-primary text-primary font-extrabold'
                      : 'bg-bg-base border-outline-variant/50 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {v === 'low' ? 'Düşük' : v === 'normal' ? 'Normal' : 'Yüksek'}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full h-[1px] bg-outline-variant/30" />

          {/* Section 2: Reset database */}
          <div className="space-y-2.5">
            <label className="block text-bear-red font-label-caps text-[10px] uppercase tracking-wider">
              Tehlikeli İşlemler (Hard Reset)
            </label>
            <p className="text-[11px] text-text-secondary leading-normal">
              Tüm borsa defterini, özel izleme listelerinizi ve portföy pozisyonlarınızı sıfırlayarak varsayılan Microsoft ve Nvidia verilerini yükler.
            </p>
            <button
              onClick={() => {
                if (confirm('Tüm portföy geçmişinizi silip varsayılan verilere dönmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                  onResetDatabase();
                  onClose();
                }
              }}
              className="w-full py-2 bg-bear-red/10 border border-bear-red/35 hover:bg-bear-red/20 text-bear-red font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Veritabanını Fabrika Ayarlarına Döndür</span>
            </button>
          </div>

          <div className="w-full h-[1px] bg-outline-variant/30" />

          {/* Section 3: Diagnostic information */}
          <div className="bg-bg-base/60 p-3 rounded-xl border border-outline-variant/30 space-y-1.5 font-data-mono text-[10px]">
            <div className="flex justify-between items-center text-text-secondary">
              <span>Sistem Sürümü:</span>
              <span className="text-text-primary font-bold">v2.1.0-Release</span>
            </div>
            <div className="flex justify-between items-center text-text-secondary">
              <span>Sunucu Portu:</span>
              <span className="text-primary font-bold">3000 (Proxy Active)</span>
            </div>
            <div className="flex justify-between items-center text-text-secondary">
              <span>Local Storage Durumu:</span>
              <span className="text-bull-green font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Connected
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant bg-bg-card/45 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary-container text-on-primary-container hover:opacity-95 text-xs font-bold font-sans rounded-lg shadow-md transition-opacity"
          >
            Değişiklikleri Kaydet
          </button>
        </div>

      </div>
    </div>
  );
}
