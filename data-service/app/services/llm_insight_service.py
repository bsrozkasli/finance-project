import httpx
from datetime import datetime, timezone
import pandas as pd
import yfinance as yf
from typing import Optional, Any

from app.config import settings
from app.models.analysis import LlmInsightRequest, LlmInsightResponse
from app.services.technical_analysis_service import TechnicalAnalysisService


class LlmInsightService:
    @classmethod
    async def _fetch_technical_summary(cls, symbol: str) -> Optional[dict]:
        try:
            # Load 3 months of 1d historical data
            ticker = yf.Ticker(symbol)
            history = ticker.history(interval="1d", period="3mo", auto_adjust=False, actions=False)
            if history is None or history.empty:
                return None
            
            history_reset = history.reset_index()
            indicators = TechnicalAnalysisService.compute_indicators(history_reset)
            
            # Extract latest values
            return {
                "rsi": indicators.rsi,
                "macd": indicators.macd,
                "macd_signal": indicators.macd_signal,
                "macd_histogram": indicators.macd_histogram,
                "bb_upper": indicators.bb_upper,
                "bb_middle": indicators.bb_middle,
                "bb_lower": indicators.bb_lower,
                "atr": indicators.atr,
                "sma": indicators.sma,
                "ema": indicators.ema,
                "last_close": float(history_reset["Close"].iloc[-1])
            }
        except Exception:
            return None

    @classmethod
    async def _fetch_sentiment_summary(cls, symbol: str) -> Optional[dict]:
        if not settings.FINNHUB_API_KEY:
            return None
        try:
            from app.services.sentiment_service import SentimentService
            sentiment = SentimentService.analyze_sentiment(symbol)
            return {
                "score": sentiment.score,
                "label": sentiment.label,
                "article_count": sentiment.article_count
            }
        except Exception:
            return None

    @classmethod
    async def generate_insight(cls, request: LlmInsightRequest) -> LlmInsightResponse:
        symbol = request.symbol.strip().upper()
        
        # 1. Gather context data in parallel or sequentially
        tech_summary = None
        if request.include_technical:
            tech_summary = await cls._fetch_technical_summary(symbol)
            
        sentiment_summary = None
        if request.include_sentiment:
            sentiment_summary = await cls._fetch_sentiment_summary(symbol)
            
        # 2. Build the LLM prompt
        prompt = f"Please provide a professional financial market analysis and insight for the asset: {symbol}.\n\n"
        
        data_sources = []
        if tech_summary:
            data_sources.append("technical")
            prompt += (
                f"### Technical Analysis Data (Daily, 3 Months):\n"
                f"- Latest Closing Price: {tech_summary['last_close']:.2f}\n"
                f"- RSI (Relative Strength Index): {tech_summary['rsi']:.2f if tech_summary['rsi'] is not None else 'N/A'}\n"
                f"- MACD: {tech_summary['macd']:.4f if tech_summary['macd'] is not None else 'N/A'} (Signal: {tech_summary['macd_signal']:.4f if tech_summary['macd_signal'] is not None else 'N/A'})\n"
                f"- Bollinger Bands: Upper {tech_summary['bb_upper']:.2f if tech_summary['bb_upper'] is not None else 'N/A'}, Middle {tech_summary['bb_middle']:.2f if tech_summary['bb_middle'] is not None else 'N/A'}, Lower {tech_summary['bb_lower']:.2f if tech_summary['bb_lower'] is not None else 'N/A'}\n"
                f"- ATR (Average True Range): {tech_summary['atr']:.2f if tech_summary['atr'] is not None else 'N/A'}\n"
                f"- SMA: {tech_summary['sma']:.2f if tech_summary['sma'] is not None else 'N/A'}, EMA: {tech_summary['ema']:.2f if tech_summary['ema'] is not None else 'N/A'}\n\n"
            )
            
        if sentiment_summary:
            data_sources.append("sentiment")
            prompt += (
                f"### Market News Sentiment Data:\n"
                f"- Aggregated Sentiment Score: {sentiment_summary['score']:.2f} (-1.0 Bearish to 1.0 Bullish)\n"
                f"- Label: {sentiment_summary['label']}\n"
                f"- Articles Analyzed: {sentiment_summary['article_count']}\n\n"
            )
            
        if request.scenario:
            prompt += f"### Additional Request Scenario/Context:\n{request.scenario}\n\n"
            
        prompt += (
            "Provide a concise, professional financial evaluation of this asset based on the above data. "
            "Explain technical trends, volatile boundaries, and overall sentiment impact. "
            "Keep the analysis to a maximum of 3-4 highly informative sentences."
        )

        # 3. Call Azure OpenAI API
        url = (
            f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/"
            f"{settings.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions"
            f"?api-version={settings.AZURE_OPENAI_API_VERSION}"
        )
        
        headers = {
            "api-key": settings.AZURE_OPENAI_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a professional financial market advisor specializing in quantitative analysis and technical indicators."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": settings.LLM_MAX_TOKENS,
            "temperature": 0.3
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()
            response_json = response.json()
            insight_text = response_json["choices"][0]["message"]["content"].strip()
            
        return LlmInsightResponse(
            symbol=symbol,
            insight=insight_text,
            data_sources_used=data_sources,
            model_used=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            generated_at=datetime.now(timezone.utc)
        )

    @classmethod
    async def generate_portfolio_stress_test(
        cls,
        symbols: list[str],
        weights: dict[str, float],
        scenario: str,
    ) -> str:
        # Build scenario-based portfolio stress test prompt
        portfolio_str = ", ".join([f"{sym}: {weight*100:.2f}%" for sym, weight in weights.items()])
        prompt = (
            f"You are a Senior Risk Manager performing a portfolio stress test analysis.\n\n"
            f"### Portfolio Composition:\n"
            f"{portfolio_str}\n\n"
            f"### Stress Test Scenario Context:\n"
            f"{scenario}\n\n"
            f"Evaluate how this specific portfolio allocation is expected to perform in this scenario. "
            f"Identify which assets carry the most vulnerability, how the diversification helps or hurts, "
            f"and estimate qualitative risk impact (e.g. expected drawdowns, volatility surge). "
            f"Keep your response strictly professional, actionable, and under 150 words."
        )

        url = (
            f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/"
            f"{settings.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions"
            f"?api-version={settings.AZURE_OPENAI_API_VERSION}"
        )
        
        headers = {
            "api-key": settings.AZURE_OPENAI_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a professional risk officer and mathematical finance expert."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": settings.LLM_MAX_TOKENS,
            "temperature": 0.3
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()
            response_json = response.json()
            return response_json["choices"][0]["message"]["content"].strip()
