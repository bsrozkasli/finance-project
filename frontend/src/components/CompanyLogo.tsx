import { useEffect, useState } from 'react';

interface CompanyLogoProps {
  symbol: string;
  logoUrl?: string | null;
  className?: string;
}

const isSafeLogoUrl = (value?: string | null) => Boolean(value && /^https:\/\//i.test(value));

export default function CompanyLogo({ symbol, logoUrl, className = 'h-8 w-8' }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [logoUrl]);

  if (isSafeLogoUrl(logoUrl) && !failed) {
    return (
      <img
        src={logoUrl ?? undefined}
        alt={`${symbol} logo`}
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded bg-white object-contain p-1`}
      />
    );
  }

  return (
    <div className={`${className} flex shrink-0 items-center justify-center rounded border border-outline-variant/60 bg-bg-primary font-data-mono text-xs font-bold text-primary`}>
      {symbol.slice(0, 2)}
    </div>
  );
}