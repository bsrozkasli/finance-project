import { useState, useEffect } from 'react';
import type { Asset } from '../api/types';
import { fetchAssets, addAssetBatch } from '../api/client';

export const useAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        setLoading(true);
        const data = await fetchAssets();
        setAssets(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch assets');
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, []);

  const addAssets = async (symbols: string[]) => {
    try {
      setLoading(true);
      const newAssets = await addAssetBatch(symbols);
      setAssets((prev) => {
        // avoid duplicates
        const existingSymbols = new Set(prev.map(a => a.symbol));
        const filteredNew = newAssets.filter(a => !existingSymbols.has(a.symbol));
        return [...prev, ...filteredNew];
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to add assets');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { assets, loading, error, addAssets };
};
