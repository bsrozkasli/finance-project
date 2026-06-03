import json
import httpx
from datetime import datetime, timezone
import asyncio
from typing import Optional, Any

from app.config import settings
from app.models.analysis import LlmInsightRequest, LlmInsightResponse, DecisionSupportResponse

# Import all new institutional services
from app.services.fundamental_analysis_service import FundamentalAnalysisService
from app.services.valuation_service import ValuationService
from app.services.risk_analytics_service import RiskAnalyticsService
from app.services.earnings_analysis_service import EarningsAnalysisService
from app.services.factor_analysis_service import FactorAnalysisService
from app.services.enhanced_sentiment_service import EnhancedSentimentService
from app.services.composite_score_service import CompositeScoreService


class LlmInsightService:
    @classmethod
    async def _gather_context(cls, symbol: str) -> dict[str, Any]:
        """Fetch all data from the institutional services in parallel to build context."""
        try:
            results = await asyncio.gather(
                asyncio.to_thread(FundamentalAnalysisService.analyze, symbol),
                asyncio.to_thread(ValuationService.analyze, symbol),
                asyncio.to_thread(RiskAnalyticsService.analyze, symbol),
                EarningsAnalysisService.analyze(symbol),
                asyncio.to_thread(FactorAnalysisService.analyze_factors, symbol),
                asyncio.to_thread(FactorAnalysisService.analyze_institutional, symbol),
                EnhancedSentimentService.analyze(symbol),
                CompositeScoreService.analyze(symbol),
                return_exceptions=True
            )
            
            return {
                "fundamental": results[0] if not isinstance(results[0], Exception) else None,
                "valuation": results[1] if not isinstance(results[1], Exception) else None,
                "risk": results[2] if not isinstance(results[2], Exception) else None,
                "earnings": results[3] if not isinstance(results[3], Exception) else None,
                "factors": results[4] if not isinstance(results[4], Exception) else None,
                "institutional": results[5] if not isinstance(results[5], Exception) else None,
                "sentiment": results[6] if not isinstance(results[6], Exception) else None,
                "composite": results[7] if not isinstance(results[7], Exception) else None,
            }
        except Exception:
            return {}

    @classmethod
    def _build_context_prompt(cls, context: dict[str, Any]) -> str:
        lines = []
        
        comp = context.get("composite")
        if comp:
            lines.append(f"=== COMPOSITE SCORE: {comp.overall_score}/100 | Grade: {comp.grade.value} | Rec: {comp.recommendation} ===")
            lines.append(f"Breakdown: Fundamental {comp.breakdown.fundamental_score}, Valuation {comp.breakdown.valuation_score}, Quality {comp.breakdown.quality_score}, Growth {comp.breakdown.growth_score}, Momentum {comp.breakdown.momentum_score}, Risk {comp.breakdown.risk_score}, Sentiment {comp.breakdown.sentiment_score}\n")

        fund = context.get("fundamental")
        if fund:
            m = fund.metrics
            lines.append("=== FUNDAMENTAL & FINANCIAL HEALTH ===")
            lines.append(f"ROE: {m.roe*100:.1f}%" if m.roe else "ROE: N/A")
            lines.append(f"Operating Margin: {m.operating_margin*100:.1f}%" if m.operating_margin else "Op Margin: N/A")
            lines.append(f"Debt/Equity: {m.debt_to_equity:.2f}" if m.debt_to_equity else "D/E: N/A")
            lines.append(f"Revenue Growth (YoY): {m.revenue_growth*100:.1f}%" if m.revenue_growth else "Rev Growth: N/A")
            lines.append("")

        val = context.get("valuation")
        if val:
            m = val.metrics
            lines.append("=== VALUATION ===")
            lines.append(f"Grade: {m.valuation_grade.value}")
            lines.append(f"P/E: {m.pe:.2f}" if m.pe else "P/E: N/A")
            lines.append(f"Forward P/E: {m.forward_pe:.2f}" if m.forward_pe else "Fwd P/E: N/A")
            lines.append(f"PEG: {m.peg:.2f}" if m.peg else "PEG: N/A")
            lines.append(f"P/B: {m.price_to_book:.2f}" if m.price_to_book else "P/B: N/A")
            lines.append("")

        risk = context.get("risk")
        if risk:
            lines.append("=== RISK & VOLATILITY ===")
            lines.append(f"Max Drawdown: {risk.max_drawdown*100:.1f}%")
            d = risk.daily
            if d:
                lines.append(f"Volatility (Ann.): {d.volatility*100:.1f}%")
                lines.append(f"Beta vs SPY: {d.beta:.2f}" if d.beta else "Beta: N/A")
                lines.append(f"Sortino Ratio: {d.sortino_ratio:.2f}" if d.sortino_ratio else "Sortino: N/A")
                lines.append(f"Historical 95% VaR: {d.var.historical_var_95*100:.2f}%")
            lines.append("")

        ear = context.get("earnings")
        if ear:
            m = ear.metrics
            lines.append("=== EARNINGS SURPRISE ===")
            lines.append(f"Score: {m.earnings_score}/100")
            lines.append(f"Beat Ratio: {m.beat_ratio*100:.0f}%")
            lines.append(f"Avg Surprise: {m.average_surprise_pct:.1f}%")
            lines.append(f"Streak: {m.consecutive_beats} beats")
            lines.append("")

        sent = context.get("sentiment")
        if sent:
            lines.append("=== ENHANCED SENTIMENT ===")
            lines.append(f"Score: {sent.sentiment_score}/100")
            lines.append(f"News: {sent.news_label} ({sent.news_score:.2f})")
            lines.append(f"Analyst Consensus: {sent.analyst_consensus} ({sent.analyst_score:.2f})")
            lines.append(f"Insider Transactions: {sent.insider_summary}")
            lines.append("")

        inst = context.get("institutional")
        if inst:
            m = inst.scores
            lines.append("=== INSTITUTIONAL SCORES ===")
            lines.append(f"Piotroski F-Score: {m.piotroski_f_score}/9" if m.piotroski_f_score is not None else "Piotroski: N/A")
            lines.append(f"Altman Z-Score: {m.altman_z_score:.2f} ({inst.interpretations.get('altman_z_score', '')})" if m.altman_z_score else "Altman Z: N/A")
            lines.append(f"Beneish M-Score: {m.beneish_m_score:.2f} ({inst.interpretations.get('beneish_m_score', '')})" if m.beneish_m_score else "Beneish M: N/A")
            lines.append(f"Economic Moat: {m.economic_moat}" if m.economic_moat else "Moat: N/A")
            lines.append("")

        return "\n".join(lines)

    @classmethod
    async def generate_insight(cls, request: LlmInsightRequest) -> LlmInsightResponse:
        symbol = request.symbol.strip().upper()
        
        context = await cls._gather_context(symbol)
        context_str = cls._build_context_prompt(context)
        
        if not context_str.strip():
            context_str = "Data unavailable for this symbol."

        scenario_section = ""
        if request.scenario:
            scenario_section = f"USER SCENARIO / ADDITIONAL CONTEXT:\n{request.scenario}\n"

        system_prompt = (
            "You are a senior quantitative analyst and portfolio manager with 20+ years of experience in equity markets. "
            "You provide actionable, evidence-based investment insights grounded strictly in the data provided. "
            "You never speculate beyond the data. You always acknowledge uncertainty. "
            "You write for a sophisticated investor who wants analysis, not reassurance."
        )

        user_prompt = (
            f"Analyze {symbol} based on the following comprehensive institutional data and provide a structured investment insight.\n\n"
            f"{context_str}\n"
            f"{scenario_section}\n"
            "Provide your analysis in the following structure:\n"
            "1. SIGNAL: BUY / SELL / HOLD / WATCH (one word)\n"
            "2. CONVICTION: HIGH / MEDIUM / LOW\n"
            "3. TIMEFRAME: SHORT (days) / MEDIUM (weeks) / LONG (months)\n"
            "4. TECHNICAL_SUMMARY: 2 sentences summarizing the overall setup and health\n"
            "5. SENTIMENT_IMPACT: 1 sentence on how sentiment and insider action affects the outlook\n"
            "6. KEY_RISK: The single most important risk to monitor based on the data\n"
            "7. KEY_OPPORTUNITY: The single most important opportunity if thesis is correct\n"
            "8. INSIGHT: 3-4 sentence professional narrative combining all factors\n\n"
            "Respond in JSON format only with keys: signal, conviction, timeframe, technical_summary, sentiment_impact, key_risk, key_opportunity, insight."
        )

        url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{settings.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version={settings.AZURE_OPENAI_API_VERSION}"
        headers = {"api-key": settings.AZURE_OPENAI_API_KEY, "Content-Type": "application/json"}
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": settings.LLM_MAX_TOKENS,
            "temperature": 0.3
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                response_json = response.json()
                content = response_json["choices"][0]["message"]["content"].strip()
            except Exception as e:
                content = "{}"

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
            technical_summary = parsed.get("technical_summary", "N/A")
            sentiment_impact = parsed.get("sentiment_impact", "N/A")
            key_risk = parsed.get("key_risk", "N/A")
            key_opportunity = parsed.get("key_opportunity", "N/A")
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
            data_sources_used=["institutional", "composite"],
            model_used=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
            generated_at=datetime.now(timezone.utc)
        )

    @classmethod
    async def generate_portfolio_stress_test(
        cls,
        symbols: list[str],
        weights: dict[str, float],
        scenario: str,
        returns: float = 0.0,
        volatility: float = 0.0,
        sharpe: float = 0.0,
        drawdown: float = 0.0,
    ) -> dict[str, Any]:
        
        portfolio_str = "\n".join([f"- {sym}: {weight*100:.2f}%" for sym, weight in weights.items()])
        
        system_prompt = (
            "You are a Chief Risk Officer at a major asset management firm. You specialize in portfolio stress testing, "
            "drawdown analysis, and tail risk scenarios. You provide rigorous, quantitative reasoning backed by historical precedent. "
            "You never sugarcoat risks."
        )

        user_prompt = (
            "Perform a portfolio stress test for the following allocation:\n\n"
            "PORTFOLIO COMPOSITION:\n"
            f"{portfolio_str}\n\n"
            "PORTFOLIO METRICS:\n"
            f"- Expected Annual Return: {returns * 100:.2f}%\n"
            f"- Annual Volatility: {volatility * 100:.2f}%\n"
            f"- Sharpe Ratio: {sharpe:.2f}\n"
            f"- Max Drawdown (historical): {drawdown * 100:.2f}%\n\n"
            "STRESS SCENARIO:\n"
            f"{scenario}\n\n"
            "Analyze and respond with:\n"
            "1. SCENARIO_SEVERITY: MILD / MODERATE / SEVERE / EXTREME\n"
            "2. ESTIMATED_DRAWDOWN: Expected portfolio drawdown percentage in this scenario\n"
            "3. MOST_VULNERABLE: Top 2 positions most at risk and why\n"
            "4. NATURAL_HEDGES: Any positions that would benefit or remain stable\n"
            "5. CORRELATION_RISK: Whether assets would converge in correlation during this scenario\n"
            "6. RECOMMENDED_ACTIONS: 2-3 specific, actionable steps (reduce X, hedge with Y, rebalance to Z)\n"
            "7. RECOVERY_ESTIMATE: Estimated recovery time if scenario materializes\n"
            "8. NARRATIVE: 3-4 sentence executive summary\n\n"
            "Respond in JSON format only with lowercase keys (scenario_severity, estimated_drawdown, most_vulnerable, natural_hedges, correlation_risk, recommended_actions, recovery_estimate, narrative)."
        )

        url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{settings.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version={settings.AZURE_OPENAI_API_VERSION}"
        headers = {"api-key": settings.AZURE_OPENAI_API_KEY, "Content-Type": "application/json"}
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": settings.LLM_MAX_TOKENS,
            "temperature": 0.3
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=30.0)
                response.raise_for_status()
                response_json = response.json()
                content = response_json["choices"][0]["message"]["content"].strip()
            except Exception as e:
                content = "{}"

        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        try:
            parsed = json.loads(content)
            ed = parsed.get("estimated_drawdown")
            if isinstance(ed, str):
                import re
                match = re.search(r"(\d+(\.\d+)?)", ed)
                ed = float(match.group(1)) if match else 0.0
            
            return {
                "scenario_severity": str(parsed.get("scenario_severity", "UNKNOWN")).upper(),
                "estimated_drawdown": float(ed) if ed is not None else 0.0,
                "most_vulnerable": str(parsed.get("most_vulnerable", "N/A")),
                "natural_hedges": str(parsed.get("natural_hedges", "N/A")),
                "correlation_risk": str(parsed.get("correlation_risk", "N/A")),
                "recommended_actions": str(parsed.get("recommended_actions", "N/A")),
                "recovery_estimate": str(parsed.get("recovery_estimate", "N/A")),
                "narrative": str(parsed.get("narrative", "N/A")),
            }
        except Exception:
            return {
                "scenario_severity": "UNKNOWN",
                "estimated_drawdown": 0.0,
                "most_vulnerable": "N/A",
                "natural_hedges": "N/A",
                "correlation_risk": "N/A",
                "recommended_actions": "N/A",
                "recovery_estimate": "N/A",
                "narrative": content,
            }

    @classmethod
    async def generate_decision_support_report(
        cls,
        request: Any
    ) -> DecisionSupportResponse:
        symbol = request.symbol.strip().upper()
        
        context = await cls._gather_context(symbol)
        context_str = cls._build_context_prompt(context)
        
        if not context_str.strip():
            context_str = "Data unavailable for this symbol."

        user_prompt = f"Generate a comprehensive decision support report for {symbol}.\n\n"
        user_prompt += f"{context_str}\n\n"
        
        if getattr(request, 'portfolio_context', None):
            user_prompt += "=== PORTFOLIO CONTEXT ===\n"
            user_prompt += f"Current Weight: {request.portfolio_context.current_weight * 100:.2f}%\n"
            user_prompt += f"Target Weight: {request.portfolio_context.target_weight * 100:.2f}%\n"
            user_prompt += f"Deviation: {request.portfolio_context.deviation * 100:.2f}%\n"
            user_prompt += f"Rebalance Required: {'YES' if request.portfolio_context.rebalance_needed else 'NO'}\n\n"
            
        if getattr(request, 'user_scenario', None):
            user_prompt += "=== USER SCENARIO ===\n"
            user_prompt += f"{request.user_scenario}\n\n"
            
        user_prompt += (
            "Generate a decision support report with these sections:\n"
            "1. EXECUTIVE_SUMMARY: 2 sentences, the most important thing to know right now\n"
            "2. PRIMARY_SIGNAL: BUY / ACCUMULATE / HOLD / REDUCE / SELL\n"
            "3. CONVICTION_LEVEL: 1-10 scale with justification\n"
            "4. BULL_CASE: 3 bullet points supporting a positive outcome\n"
            "5. BEAR_CASE: 3 bullet points supporting a negative outcome\n"
            "6. CRITICAL_LEVELS: key_support (price), key_resistance (price), invalidation_level (price) - Estimate based on fundamental and risk data if technicals are not fully available.\n"
            "7. RISK_REWARD: estimated risk/reward ratio and rationale\n"
            "8. TIME_HORIZON: SHORT / MEDIUM / LONG with reasoning\n"
            "9. WATCHLIST_ITEMS: 3 specific metrics or events to monitor\n"
            "10. FULL_ANALYSIS: 5-7 sentence detailed narrative analyzing the composite institutional factors\n\n"
            "Respond in JSON format only. Use lowercase keys matching the sections."
        )
        
        system_prompt = (
            "You are an AI investment advisor integrated into a professional portfolio management system. "
            "Your role is to synthesize quantitative models, fundamental sentiment, and market context into clear, "
            "actionable decision support reports. You are NOT providing financial advice — you are providing analytical "
            "synthesis. Always present both bull and bear cases. Always quantify uncertainty."
        )
        
        url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{settings.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version={settings.AZURE_OPENAI_API_VERSION}"
        headers = {"api-key": settings.AZURE_OPENAI_API_KEY, "Content-Type": "application/json"}
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": settings.LLM_MAX_TOKENS * 2,
            "temperature": 0.3,
            "response_format": {"type": "json_object"}
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers, timeout=45.0)
                response.raise_for_status()
                response_json = response.json()
                content = response_json["choices"][0]["message"]["content"].strip()
            except Exception as e:
                content = "{}"

        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        try:
            parsed = json.loads(content)
            cl = parsed.get("critical_levels", {})
            return DecisionSupportResponse(
                symbol=symbol,
                executive_summary=str(parsed.get("executive_summary", "")),
                primary_signal=str(parsed.get("primary_signal", "HOLD")),
                conviction_level=int(str(parsed.get("conviction_level", "5")).split()[0]) if isinstance(parsed.get("conviction_level"), str) else int(parsed.get("conviction_level", 5)),
                bull_case=parsed.get("bull_case", []),
                bear_case=parsed.get("bear_case", []),
                critical_levels={
                    "key_support": float(cl.get("key_support", 0.0)) if isinstance(cl, dict) else 0.0,
                    "key_resistance": float(cl.get("key_resistance", 0.0)) if isinstance(cl, dict) else 0.0,
                    "invalidation_level": float(cl.get("invalidation_level", 0.0)) if isinstance(cl, dict) else 0.0
                },
                risk_reward=str(parsed.get("risk_reward", "")),
                time_horizon=str(parsed.get("time_horizon", "")),
                watchlist_items=parsed.get("watchlist_items", []),
                full_analysis=str(parsed.get("full_analysis", "")),
                generated_at=datetime.now(timezone.utc)
            )
        except Exception as e:
            return DecisionSupportResponse(
                symbol=symbol,
                executive_summary=f"Failed to parse analysis.",
                primary_signal="HOLD",
                conviction_level=5,
                bull_case=[],
                bear_case=[],
                critical_levels={"key_support": 0.0, "key_resistance": 0.0, "invalidation_level": 0.0},
                risk_reward="N/A",
                time_horizon="MEDIUM",
                watchlist_items=[],
                full_analysis=content,
                generated_at=datetime.now(timezone.utc)
            )
