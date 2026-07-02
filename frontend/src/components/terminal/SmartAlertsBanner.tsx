export const SmartAlertsBanner = () => {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex items-center gap-3 rounded-lg border p-3" style={{ background: 'rgba(0, 195, 114, 0.1)', borderColor: 'var(--color-bull)' }}>
        <svg width="20" height="20" fill="none" stroke="var(--color-bull)" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--color-bull)' }}>AAPL reached the target price of $150.</span>
      </div>
      <div className="flex items-center gap-3 rounded-lg border p-3" style={{ background: 'rgba(255, 176, 32, 0.1)', borderColor: 'var(--color-warning)' }}>
        <svg width="20" height="20" fill="none" stroke="var(--color-warning)" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-sm font-medium" style={{ color: 'var(--color-warning)' }}>Risk Agent: Technology weight exceeded 60%. Increasing cash ratio is recommended.</span>
      </div>
    </div>
  );
};
