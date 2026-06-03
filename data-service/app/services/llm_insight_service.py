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
            sentiment = await SentimentService.analyze_sentiment(symbol)
            return {
                "score": sentiment.score,
                "label": sentiment.label,
                "article_count": sentiment.article_count,
                "key_themes": sentiment.key_themes,
                "risk_factors": sentiment.risk_factors
            }
        except Exception:
            return None

    @classmethod
    async def generate_insight(cls, request: LlmInsightRequest) -> LlmInsightResponse:
        import json
        symbol = request.symbol.strip().upper()
        
        tech_summary = None
        if request.include_technical:
            tech_summary = await cls._fetch_technical_summary(symbol)
            
        sentiment_summary = None
        if request.include_sentiment:
            sentiment_summary = await cls._fetch_sentiment_summary(symbol)
            
        data_sources = []
        if tech_summary:
            data_sources.append("technical")
            rsi = tech_summary.get("rsi")
            rsi_val = f"{rsi:.2f}" if rsi is not None else "N/A"
            if rsi is not None:
                rsi_interp = "Overbought" if rsi > 70 else "Oversold" if rsi < 30 else "Neutral"
            else:
                rsi_interp = "N/A"

            macd = f"{tech_summary.get('macd'):.4f}" if tech_summary.get("macd") is not None else "N/A"
            macd_signal = f"{tech_summary.get('macd_signal'):.4f}" if tech_summary.get("macd_signal") is not None else "N/A"
            macd_hist = f"{tech_summary.get('macd_histogram'):.4f}" if tech_summary.get("macd_histogram") is not None else "N/A"

            bb_upper = f"{tech_summary.get('bb_upper'):.2f}" if tech_summary.get("bb_upper") is not None else "N/A"
            bb_middle = f"{tech_summary.get('bb_middle'):.2f}" if tech_summary.get("bb_middle") is not None else "N/A"
            bb_lower = f"{tech_summary.get('bb_lower'):.2f}" if tech_summary.get("bb_lower") is not None else "N/A"

            last_close = tech_summary.get("last_close", 0.0)
            if tech_summary.get("bb_middle") and tech_summary.get("bb_middle") > 0:
                price_vs_bb_pct = f"{((last_close - tech_summary['bb_middle']) / tech_summary['bb_middle']) * 100:.2f}"
            else:
                price_vs_bb_pct = "0.00"

            atr = f"{tech_summary.get('atr'):.2f}" if tech_summary.get("atr") is not None else "N/A"
            sma = f"{tech_summary.get('sma'):.2f}" if tech_summary.get("sma") is not None else "N/A"
            ema = f"{tech_summary.get('ema'):.2f}" if tech_summary.get("ema") is not None else "N/A"

            if tech_summary.get("sma") and tech_summary.get("sma") > 0:
                price_vs_sma_pct = f"{((last_close - tech_summary['sma']) / tech_summary['sma']) * 100:.2f}"
            else:
                price_vs_sma_pct = "0.00"

            tech_str = (
                f"TECHNICAL DATA (1d, last 3mo):\n"
                f"- Current price: {last_close:.2f}\n"
                f"- RSI(14): {rsi_val} — {rsi_interp}\n"
                f"- MACD: {macd} / Signal: {macd_signal} / Histogram: {macd_hist}\n"
                f"- Bollinger Bands: Upper {bb_upper} / Middle {bb_middle} / Lower {bb_lower}\n"
                f"- Current price vs BB Middle: {price_vs_bb_pct}%\n"
                f"- ATR(14): {atr} (volatility measure)\n"
                f"- SMA(20): {sma} / EMA(20): {ema}\n"
                f"- Price vs SMA: {price_vs_sma_pct}%\n"
            )
        else:
            tech_str = "TECHNICAL DATA: Not available.\n"

        if sentiment_summary:
            data_sources.append("sentiment")
            score = f"{sentiment_summary.get('score', 0.0):.2f}"
            label = sentiment_summary.get('label', 'NEUTRAL')
            count = sentiment_summary.get('article_count', 0)
            themes = ", ".join(sentiment_summary.get("key_themes", [])) or "None"
            risks = ", ".join(sentiment_summary.get("risk_factors", [])) or "None"

            sent_str = (
                f"SENTIMENT DATA:\n"
                f"- Aggregated score: {score} ({label})\n"
                f"- Articles analyzed: {count}\n"
                f"- Key themes: {themes}\n"
                f"- Risk factors: {risks}\n"
            )
        else:
            sent_str = "SENTIMENT DATA: Not available.\n"

        scenario_section = ""
        if request.scenario:
            scenario_section = f"SCENARIO / ADDITIONAL CONTEXT:\n{request.scenario}\n"

        system_prompt = (
            "You are a senior quantitative analyst and portfolio manager with 20+ years of experience in equity markets. "
            "You provide actionable, evidence-based investment insights grounded strictly in the data provided. "
            "You never speculate beyond the data. You always acknowledge uncertainty. "
            "You write for a sophisticated investor who wants analysis, not reassurance."
        )

        user_prompt = (
            f"Analyze {symbol} based on the following data and provide a structured investment insight.\n\n"
            f"{tech_str}\n"
            f"{sent_str}\n"
            f"{scenario_section}\n"
            "Provide your analysis in the following structure:\n"
            "1. SIGNAL: BUY / SELL / HOLD / WATCH (one word)\n"
            "2. CONVICTION: HIGH / MEDIUM / LOW\n"
            "3. TIMEFRAME: SHORT (days) / MEDIUM (weeks) / LONG (months)\n"
            "4. TECHNICAL_SUMMARY: 2 sentences on what the indicators collectively suggest\n"
            "5. SENTIMENT_IMPACT: 1 sentence on how news sentiment affects the outlook\n"
            "6. KEY_RISK: The single most important risk to monitor\n"
            "7. KEY_OPPORTUNITY: The single most important opportunity if thesis is correct\n"
            "8. INSIGHT: 3-4 sentence professional narrative combining all factors\n\n"
            "Respond in JSON format only with keys: signal, conviction, timeframe, technical_summary, sentiment_impact, key_risk, key_opportunity, insight."
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
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "max_tokens": settings.LLM_MAX_TOKENS,
            "temperature": 0.3
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()
            response_json = response.json()
            content = response_json["choices"][0]["message"]["content"].strip()
            
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        try:
            parsed = json.loads(content)
            signal = parsed.get("signal", "WATCH")
            conviction = parsed.get("conviction", "LOW")
            timeframe = parsed.get("timeframe", "MEDIUM")
            technical_summary = parsed.get("technical_summary", "")
            sentiment_impact = parsed.get("sentiment_impact", "")
            key_risk = parsed.get("key_risk", "")
            key_opportunity = parsed.get("key_opportunity", "")
            insight = parsed.get("insight", "")
        except Exception:
            signal = "WATCH"
            conviction = "LOW"
            timeframe = "MEDIUM"
            technical_summary = "N/A"
            sentiment_impact = "N/A"
            key_risk = "N/A"
            key_opportunity = "N/A"
            insight = content
            
        return LlmInsightResponse(
            symbol=symbol,
            signal=str(signal).upper(),
            conviction=str(conviction).upper(),
            timeframe=str(timeframe).upper(),
            technical_summary=str(technical_summary),
            sentiment_impact=str(sentiment_impact),
            key_risk=str(key_risk),
            key_opportunity=str(key_opportunity),
            insight=str(insight),
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
