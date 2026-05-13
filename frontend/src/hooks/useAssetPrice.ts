import { useState, useEffect } from 'react';
import { PriceHistory } from '../api/types';
import { fetchAssetPrice } from '../api/client';

export const useAssetPrice = (symbol: string | null) => {
  const [price, setPrice] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setPrice(null);
      return;
    }

    const loadPrice = async () => {
      try {
        setLoading(true);
        const data = await fetchAssetPrice(symbol);
        setPrice(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || `Failed to fetch price for ${symbol}`);
        setPrice(null);
      } finally {
        setLoading(false);
      }
    };

    loadPrice();
  }, [symbol]);

  return { price, loading, error };
};
