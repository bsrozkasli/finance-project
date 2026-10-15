from __future__ import annotations

import json
import re
from dataclasses import dataclass

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel

from app.models.availability import SectionAvailability

_VALID_DECISIONS = frozenset({"BUY", "HOLD", "SELL"})


@dataclass(frozen=True)
class PortfolioManagerVerdict:
    decision: str
    confidence: int
    reasoning: str
    token_usage: int
    availability: SectionAvailability


def run_portfolio_manager_verdict(
    llm: BaseChatModel, ticker: str, debate_context: str
) -> PortfolioManagerVerdict:
    messages = [
        SystemMessage(
            content=(
                "You are the Portfolio Manager. Use ONLY the provided debate context. "
                "Never fetch external data or tools. "
                "Respond in JSON: {\"decision\":\"BUY|HOLD|SELL\",\"confidence\":0-100,\"reasoning\":\"...\"}"
            )
        ),
        HumanMessage(content=f"Ticker: {ticker}\nDebate:\n{debate_context}"),
    ]
    response = llm.invoke(messages)
    text = (getattr(response, "content", str(response)) or "").strip()
    decision, confidence, reasoning, availability = _parse_pm_response_with_availability(text)
    return PortfolioManagerVerdict(decision, confidence, reasoning, _tokens(response), availability)


def run_portfolio_manager(
    llm: BaseChatModel, ticker: str, debate_context: str
) -> tuple[str, str, int, int]:
    """Returns decision, reasoning, confidence, token_usage."""
    verdict = run_portfolio_manager_verdict(llm, ticker, debate_context)
    return verdict.decision, verdict.reasoning, verdict.confidence, verdict.token_usage


def _parse_pm_response(text: str) -> tuple[str, int, str]:
    decision, confidence, reasoning, _ = _parse_pm_response_with_availability(text)
    return decision, confidence, reasoning


def _parse_pm_response_with_availability(text: str) -> tuple[str, int, str, SectionAvailability]:
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            decision = str(data.get("decision", "HOLD")).upper()
            confidence = int(data.get("confidence", 50))
            reasoning = str(data.get("reasoning", text))
            complete = "decision" in data and decision in _VALID_DECISIONS and "confidence" in data
            availability = (
                SectionAvailability.available()
                if complete
                else SectionAvailability.unparseable("pm_json_missing_or_invalid_fields")
            )
            return decision, max(0, min(100, confidence)), reasoning, availability
    except (json.JSONDecodeError, ValueError, TypeError):
        pass
    upper = text.upper()
    if "BUY" in upper and "SELL" not in upper:
        return "BUY", 70, text, SectionAvailability.unparseable("pm_response_not_json_keyword_fallback")
    if "SELL" in upper:
        return "SELL", 70, text, SectionAvailability.unparseable("pm_response_not_json_keyword_fallback")
    return "HOLD", 50, text, SectionAvailability.unparseable("pm_response_not_json_default_hold")


def _tokens(response) -> int:
    meta = getattr(response, "response_metadata", None) or {}
    usage = meta.get("token_usage") or meta.get("usage") or {}
    return int(usage.get("total_tokens", 0)) if isinstance(usage, dict) else 0
