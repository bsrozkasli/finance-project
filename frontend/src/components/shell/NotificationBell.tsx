import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

const BADGE_CAP = 99;

export default function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label = unreadCount > 0 ? `Bildirimler, ${unreadCount} okunmamış` : 'Bildirimler';
  const recent = notifications.slice(0, 8);

  return (
    <div className="desk-bell" ref={root}>
      <button
        type="button"
        className="desk-icon-tile"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="desk-bell-badge" data-testid="unread-badge" aria-hidden="true">
            {unreadCount > BADGE_CAP ? `${BADGE_CAP}+` : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="desk-bell-pop" role="region" aria-label="Bildirim listesi">
          {recent.length === 0 ? (
            <p className="desk-bell-empty">Bildirim yok.</p>
          ) : (
            <ul>
              {recent.map((notification) => (
                <li key={notification.id} data-read={notification.read}>
                  <strong>{notification.symbol}</strong>
                  <span>{notification.message}</span>
                </li>
              ))}
            </ul>
          )}
          {unreadCount > 0 && (
            <button type="button" className="desk-bell-readall" onClick={() => void markAllAsRead()}>
              Tümünü okundu işaretle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
