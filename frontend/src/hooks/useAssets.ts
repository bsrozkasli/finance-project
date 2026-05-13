import { useState, useEffect } from 'react';
import { Asset } from '../api/types';
import { fetchAssets } from '../api/client';

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

  return { assets, loading, error };
};
