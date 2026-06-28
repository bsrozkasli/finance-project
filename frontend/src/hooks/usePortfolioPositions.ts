import { useState, useEffect, useCallback } from 'react';
import type { PortfolioPosition, AddPositionRequest } from '../api/client';
import {
  fetchPortfolioPositions,
  addPortfolioPosition,
  updatePortfolioPosition,
  deletePortfolioPosition,
} from '../api/client';

export function usePortfolioPositions() {
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPortfolioPositions();
      setPositions(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addPosition = useCallback(async (req: AddPositionRequest) => {
    const created = await addPortfolioPosition(req);
    setPositions(prev => [created, ...prev]);
    return created;
  }, []);

  const updatePosition = useCallback(async (id: number, req: AddPositionRequest) => {
    const updated = await updatePortfolioPosition(id, req);
    setPositions(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }, []);

  const removePosition = useCallback(async (id: number) => {
    await deletePortfolioPosition(id);
    setPositions(prev => prev.filter(p => p.id !== id));
  }, []);

  return { positions, loading, error, addPosition, updatePosition, removePosition, reload: load };
}
