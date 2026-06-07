import { useState, useEffect } from 'react';
import type { PriceHistory } from '../api/types';
import { fetchPriceHistory } from '../api/client';
import { isMarketOpen } from '../utils/market';

export interface LivePrice {
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePct: number;
  timestamp: string;
}

export const useLivePrice = (symbol: string | null) => {
  const [data, setData] = useState<LivePrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let ws: WebSocket | null = null;

    const loadHttpFallback = async () => {
      if (!symbol) return;
      setLoading(true);
      try {
        const bars: PriceHistory[] = await fetchPriceHistory(symbol, '1d', '5d');
        if (!cancelled && bars.length >= 1) {
          const latest = bars[bars.length - 1];
          const prev = bars.length >= 2 ? bars[bars.length - 2] : null;
          const prevClose = prev ? prev.close : latest.open;
          const change = latest.close - prevClose;
          const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
          setData({
            price: latest.close,
            open: latest.open,
            high: latest.high,
            low: latest.low,
            volume: latest.volume,
            change,
            changePct,
            timestamp: latest.timestamp,
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to fetch via HTTP fallback');
      } finally {
        if (!cancelled) {
          setLoading(false);
          const intervalMs = isMarketOpen() ? 30 * 1000 : 15 * 60 * 1000;
          timeoutId = window.setTimeout(loadHttpFallback, intervalMs);
        }
      }
    };

    const initWebSocket = () => {
      const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
      if (!apiKey || !symbol) {
        loadHttpFallback();
        return;
      }
      
      ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
      
      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: 'subscribe', symbol: symbol.toUpperCase() }));
        // Still fetch initial data to get OHLC and yesterday's close
        loadHttpFallback(); 
      };
      
      ws.onmessage = (event) => {
        if (cancelled) return;
        const msg = JSON.parse(event.data);
        if (msg.type === 'trade' && msg.data && msg.data.length > 0) {
          const trade = msg.data[0]; // Take first trade
          const currentPrice = trade.p;
          setData(prev => {
            if (!prev) return prev;
            const change = currentPrice - (prev.price - prev.change); // recalc change against previous day's close
            const changePct = prev.price - prev.change !== 0 ? (change / (prev.price - prev.change)) * 100 : 0;
            return {
              ...prev,
              price: currentPrice,
              change,
              changePct,
              timestamp: new Date(trade.t).toISOString()
            };
          });
        }
      };
      
      ws.onerror = () => {
        if (!cancelled) loadHttpFallback();
      };
      
      ws.onclose = () => {
        if (!cancelled && isMarketOpen()) {
           // Retry connection after 5 seconds
           setTimeout(initWebSocket, 5000);
        }
      };
    };

    if (symbol) {
      if (isMarketOpen()) {
        initWebSocket();
      } else {
        loadHttpFallback();
      }
    } else {
      setData(null);
    }

    return () => { 
      cancelled = true; 
      if (timeoutId) window.clearTimeout(timeoutId);
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'unsubscribe', symbol: symbol?.toUpperCase() }));
        }
        ws.close();
      }
    };
  }, [symbol]);

  return { data, loading, error };
};
