import { useEffect, useState } from 'react';

interface CompanyLogoProps {
  symbol: string;
  logoUrl?: string | null;
  website?: string | null;
  className?: string;
}

const httpsUrl = (value?: string | null): URL | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
};

const websiteFavicon = (website?: string | null): string | null => {
  const url = httpsUrl(website);
  if (!url || !url.hostname.includes('.') || url.hostname.endsWith('.local')
    || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname) || url.hostname.startsWith('[')) return null;
  return new URL('/favicon.ico', url).href;
};

export default function CompanyLogo({ symbol, logoUrl, website, className = 'h-8 w-8' }: CompanyLogoProps) {
  const [failedIndex, setFailedIndex] = useState(0);
  useEffect(() => setFailedIndex(0), [logoUrl, website]);

  const sources = [httpsUrl(logoUrl)?.href, websiteFavicon(website)].filter((value): value is string => Boolean(value));
  const source = [...new Set(sources)][failedIndex];

  if (source) {
    return (
      <img
        src={source}
        alt={`${symbol} logo`}
        referrerPolicy="no-referrer"
        onError={() => setFailedIndex((index) => index + 1)}
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
