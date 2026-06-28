import pandas as pd
import pandas_ta as ta
import numpy as np
from typing import Dict, Any

from app.dependencies import get_resolver

class BacktestService:
    @classmethod
    def analyze(cls, symbol: str) -> Dict[str, Any]:
        """
        Calculates simple RSI-based historical pattern.
        If current RSI is X, finds past dates where RSI crossed below X.
        Calculates the average 30-day forward return.
        """
        symbol = symbol.upper().strip()
        resolver = get_resolver()
        # Fetch up to 5 years of data
        bars = resolver.get_ohlcv(symbol, interval="1d", period="5y")
        
        if not bars or len(bars) < 60:
            return cls._empty_response(symbol)
            
        df = pd.DataFrame([
            {"date": b.timestamp, "close": b.close}
            for b in bars
        ])
        df.set_index("date", inplace=True)
        
        # Calculate RSI(14)
        df["rsi"] = ta.rsi(df["close"], length=14)
        df.dropna(inplace=True)
        
        if len(df) < 30:
            return cls._empty_response(symbol)
            
        current_rsi = df["rsi"].iloc[-1]
        
        # Determine the condition based on current RSI
        # If current RSI is oversold (< 45), look for oversold conditions.
        # If overbought (> 55), look for overbought conditions.
        # Otherwise look for neutral zones.
        
        if current_rsi < 45:
            # Look for instances where RSI crossed below current_rsi + 5
            threshold = current_rsi + 5
            condition = df["rsi"] < threshold
            scenario = f"RSI < {threshold:.1f} (Aşırı Satım Bölgesi)"
            direction = "BULLISH" # We expect bounce
        elif current_rsi > 55:
            threshold = current_rsi - 5
            condition = df["rsi"] > threshold
            scenario = f"RSI > {threshold:.1f} (Aşırı Alım Bölgesi)"
            direction = "BEARISH"
        else:
            threshold_low = current_rsi - 5
            threshold_high = current_rsi + 5
            condition = (df["rsi"] >= threshold_low) & (df["rsi"] <= threshold_high)
            scenario = f"RSI {threshold_low:.1f} - {threshold_high:.1f} (Nötr Bölge)"
            direction = "NEUTRAL"

        # Calculate 30-day forward returns (approx 21 trading days)
        df["forward_return_30d"] = df["close"].shift(-21) / df["close"] - 1.0
        
        # Find signal dates (avoid overlapping 21-day periods to not double count)
        signal_dates = []
        last_signal_idx = -100
        
        for i in range(len(df) - 21): # Exclude last 21 days as they don't have forward return
            if condition.iloc[i]:
                if i - last_signal_idx >= 21: # Ensure events are independent
                    signal_dates.append(i)
                    last_signal_idx = i
                    
        total_occurrences = len(signal_dates)
        
        if total_occurrences == 0:
            return cls._empty_response(symbol, scenario=scenario)
            
        returns = df.iloc[signal_dates]["forward_return_30d"]
        
        avg_return = returns.mean() * 100
        
        if direction == "BEARISH":
            # For bearish, a "win" is if the stock went DOWN
            wins = (returns < 0).sum()
        else:
            # For bullish/neutral, a "win" is if the stock went UP
            wins = (returns > 0).sum()
            
        win_rate = (wins / total_occurrences) * 100
        
        return {
            "symbol": symbol,
            "current_rsi": float(current_rsi),
            "scenario_description": scenario,
            "total_occurrences": int(total_occurrences),
            "win_rate": float(win_rate),
            "average_return_pct": float(avg_return),
            "is_meaningful": total_occurrences >= 3
        }

    @classmethod
    def _empty_response(cls, symbol: str, scenario: str = "Yetersiz Veri") -> Dict[str, Any]:
        return {
            "symbol": symbol,
            "current_rsi": 0.0,
            "scenario_description": scenario,
            "total_occurrences": 0,
            "win_rate": 0.0,
            "average_return_pct": 0.0,
            "is_meaningful": False
        }
