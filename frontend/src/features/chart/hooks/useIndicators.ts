import { useState, useMemo } from 'react';
import type { OHLCVData } from '../types/chart.types';
import { calculateSMA } from '../utils/indicatorCalculations';

export const useIndicators = (data: OHLCVData[]) => {
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);

  const sma20Data = useMemo(() => {
    if (!showSMA20 || data.length === 0) return [];
    return calculateSMA(data, 20);
  }, [data, showSMA20]);

  const sma50Data = useMemo(() => {
    if (!showSMA50 || data.length === 0) return [];
    return calculateSMA(data, 50);
  }, [data, showSMA50]);

  return {
    showSMA20,
    setShowSMA20,
    sma20Data,
    showSMA50,
    setShowSMA50,
    sma50Data,
  };
};
