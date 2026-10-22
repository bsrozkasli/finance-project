export const formatCurrency = (value: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatVolume = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

export const formatDate = (timestamp: string) => {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  STOCK: 'Hisse senedi',
  ETF: 'ETF',
  CRYPTO: 'Kripto para',
  FOREX: 'Döviz',
  INDEX: 'Endeks',
  UNRESOLVED: 'Tür bilinmiyor',
};

// The backend sends UNRESOLVED when no provider or trusted mapping established the type.
export const assetTypeLabel = (type: string | null | undefined) => {
  if (!type) return 'Tür bilinmiyor';
  return ASSET_TYPE_LABELS[type.toUpperCase()] ?? type;
};
