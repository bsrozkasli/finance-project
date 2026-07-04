import type { OHLCVData } from '../types/chart.types';

export const calculateSMA = (data: OHLCVData[], period: number) => {
  const smaData = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      continue; // Not enough data for this period
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    
    smaData.push({
      time: data[i].time,
      value: sum / period
    });
  }
  
  return smaData;
};
