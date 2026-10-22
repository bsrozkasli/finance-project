import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAssetResearchDetail, type AssetResearchDetail } from '../api/client';

export function useAssetResearchDetail(symbol: string | null) {
  const [data, setData] = useState<AssetResearchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const activeLoad = useRef<(() => Promise<void>) | null>(null);

  const load = useCallback(async function loadDetail(): Promise<void> {
    if (activeLoad.current !== loadDetail) return;
    const id = ++requestId.current;
    const isCurrent = () => activeLoad.current === loadDetail && id === requestId.current;
    setData(null);
    setError(null);
    if (!symbol) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const detail = await fetchAssetResearchDetail(symbol);
      if (!isCurrent()) return;
      setData(detail);
      setError(null);
    } catch (reason) {
      if (!isCurrent()) return;
      setData(null);
      setError(reason instanceof Error ? reason.message : 'Şirket ayrıntıları yüklenemedi');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    activeLoad.current = load;
    void load();
    return () => { activeLoad.current = null; };
  }, [load]);

  return { data, loading, error, reload: load };
}
