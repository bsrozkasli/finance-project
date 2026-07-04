import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import {
  PORTFOLIO_RISK_ALERTS_EVENT,
  readPortfolioRiskAlerts,
} from '../portfolio/portfolioRisk';
import type { PortfolioRiskAlert } from '../portfolio/portfolioRisk';

const riskTone = (severity: PortfolioRiskAlert['severity']) => severity === 'danger'
  ? { bg: 'var(--color-bear-dim)', color: 'var(--color-bear)', score: 'RISK' }
  : { bg: 'rgba(245,158,11,0.14)', color: 'var(--color-warning)', score: 'WARN' };

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [riskAlerts, setRiskAlerts] = useState<PortfolioRiskAlert[]>(() => readPortfolioRiskAlerts());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const totalCount = unreadCount + riskAlerts.length;
  const sortedRiskAlerts = useMemo(
    () => [...riskAlerts].sort((a, b) => b.allocation - a.allocation),
    [riskAlerts]
  );

  useEffect(() => {
    const handleRiskAlerts = () => setRiskAlerts(readPortfolioRiskAlerts());
    window.addEventListener(PORTFOLIO_RISK_ALERTS_EVENT, handleRiskAlerts);
    window.addEventListener('storage', handleRiskAlerts);
    return () => {
      window.removeEventListener(PORTFOLIO_RISK_ALERTS_EVENT, handleRiskAlerts);
      window.removeEventListener('storage', handleRiskAlerts);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="p-2 rounded-full hover:bg-gray-800 transition-colors relative"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {totalCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white font-bold">
            {totalCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Bildirimler</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-blue-400 hover:text-blue-300">
                Tumunu okundu isaretle
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="p-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Su an yeni bildirim yok.
              </div>
            ) : (
              <>
                {sortedRiskAlerts.map(alert => {
                  const tone = riskTone(alert.severity);
                  return (
                    <div key={alert.id} className="p-4 border-b flex flex-col gap-1 transition-colors" style={{ borderColor: 'var(--color-border)', background: tone.bg }}>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                          <span className="px-2 py-0.5 rounded text-xs" style={{ background: tone.bg, color: tone.color }}>{tone.score}</span>
                          {alert.target}
                        </span>
                        <span className="text-[10px]" style={{ color: tone.color }}>
                          {alert.allocation.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>{alert.message}</p>
                    </div>
                  );
                })}

                {notifications.map(notif => (
                  <div key={notif.id} className={`p-4 border-b flex flex-col gap-1 transition-colors ${!notif.read ? 'bg-blue-900/10' : ''}`} style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs">{notif.score}/100</span>
                        {notif.symbol}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(notif.createdAt).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {notif.message}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
