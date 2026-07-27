import { useCallback, useEffect, useState } from 'react';
import { fetchAssetResearchDetail, type AssetResearchDetail } from '../api/client';

export function useAssetResearchDetail(symbol: string | null) {
  const [data, setData] = useState<AssetResearchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (ticker: string) => {
    setLoading(true);
    try {
      const detail = await fetchAssetResearchDetail(ticker);
      setData(detail);
      setError(null);
    } catch (reason) {
      setData(null);
      setError(reason instanceof Error ? reason.message : 'Company detail is unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      setError(null);
      return;
    }
    void load(symbol);
  }, [load, symbol]);


  return { data, loading, error, reload: () => symbol ? load(symbol) : undefined };
}