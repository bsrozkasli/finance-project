import { useEffect, useState } from 'react';
import { fetchBatchPriceHistory } from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import type { Asset, PriceHistory } from '../api/types';
import type { Stock } from '../types';
import { assetTypeLabel } from '../utils/formatters';

export const mapAssetsToStocks = (
  assets: Asset[],
  historyBySymbol: Record<string, PriceHistory[]>,
): Stock[] => assets
  .map((asset): Stock | null => {
    const history = historyBySymbol[asset.symbol] ?? historyBySymbol[asset.symbol.toUpperCase()] ?? [];
    if (!history.length) return null;

    const sorted = [...history].sort(
      (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
    );
    const last = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const price = last.close;
    const change = previous ? price - previous.close : 0;
    const changePercent = previous && previous.close !== 0 ? (change / previous.close) * 100 : 0;
    const closes = sorted.map((point) => point.close);

    return {
      symbol: asset.symbol,
      name: asset.name,
      sector: assetTypeLabel(asset.type),
      industry: '',
      price,
      change,
      changePercent,
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume.toLocaleString('en-US'),
      high52W: Math.max(...sorted.map((point) => point.high)),
      low52W: Math.min(...sorted.map((point) => point.low)),
      marketCap: null,
      pe: null,
      pb: null,
      debtEquity: null,
      roe: null,
      revenueGrowth: null,
      divYield: null,
      history: sorted.map((point) => ({
        date: point.timestamp.slice(0, 10),
        price: point.close,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume,
      })),
      sparkline: closes.slice(-30),
      news: [],
      technicals: null,
      analystRating: null,
      alerts: [],
    };
  })
  .filter((stock): stock is Stock => stock !== null);

export function useAssetMarketData(assets: Asset[]) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (assets.length === 0) {
      setStocks([]);
      setLoading(false);
      setError(null);
      return () => { cancelled = true; };
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const symbols = assets.map((asset) => asset.symbol);
        const historyBySymbol = await fetchBatchPriceHistory(symbols, '1d', '1y');
        if (!cancelled) setStocks(mapAssetsToStocks(assets, historyBySymbol));
      } catch (loadError) {
        if (!cancelled) {
          setStocks([]);
          setError(getApiErrorMessage(loadError, 'Varlık fiyatları yüklenemedi'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [assets]);

  return { stocks, loading, error };
}
