export const MacroCalendarWidget = () => {
  const events = [
    { date: 'Today, 14:30', title: 'CPI Data (MoM)', impact: 'Critical', color: 'var(--color-bear)' },
    { date: 'Tomorrow, 16:00', title: 'NVDA Earnings Call', impact: 'High', color: 'var(--color-warning)' },
    { date: 'Wed, 20:00', title: 'Fed Rate Decision', impact: 'Critical', color: 'var(--color-bear)' }
  ];

  return (
    <div className="rounded-lg border p-4 h-full" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Macro Calendar</h2>
      <div className="mt-4 space-y-4">
        {events.map((event, i) => (
          <div key={i} className="flex justify-between items-start gap-2">
            <div>
              <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{event.date}</div>
              <div className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>{event.title}</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--color-bg-base)', color: event.color, border: `1px solid ${event.color}` }}>
              {event.impact}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
