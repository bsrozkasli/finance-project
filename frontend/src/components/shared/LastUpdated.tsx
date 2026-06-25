import { useMemo } from 'react';

interface LastUpdatedProps {
  timestamp: Date | null;
  onRefresh?: () => void;
  loading?: boolean;
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'Az önce';
  if (secs < 3600) return `${Math.floor(secs / 60)} dk önce`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} sa önce`;
  return `${Math.floor(secs / 86400)} gün önce`;
}

export const LastUpdated = ({ timestamp, onRefresh, loading = false }: LastUpdatedProps) => {
  const timeStr = useMemo(() => {
    if (!timestamp) return null;
    return timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }, [timestamp]);

  const agoStr = useMemo(() => {
    if (!timestamp) return null;
    return timeAgo(timestamp);
  }, [timestamp]);

  const fullStr = timestamp?.toLocaleString('tr-TR') ?? '';

  return (
    <div className="flex items-center gap-2">
      {timestamp ? (
        <span
          className="text-[10px] cursor-default"
          style={{ color: 'var(--color-text-muted)' }}
          title={fullStr}
        >
          {timeStr} · {agoStr}
        </span>
      ) : (
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          Yüklenmedi
        </span>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Yenile"
          className="flex items-center justify-center w-5 h-5 rounded transition-all hover:bg-white/10 active:scale-90 cursor-pointer disabled:opacity-40"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <svg
            className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
          </svg>
        </button>
      )}
    </div>
  );
};
