from __future__ import annotations

import json
import re

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel


def run_portfolio_manager(
    llm: BaseChatModel, ticker: str, debate_context: str
) -> tuple[str, str, int, int]:
    """Returns decision, reasoning, confidence, token_usage."""
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
    tokens = _tokens(response)
    decision, confidence, reasoning = _parse_pm_response(text)
    return decision, reasoning, confidence, tokens


def _parse_pm_response(text: str) -> tuple[str, int, str]:
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            decision = str(data.get("decision", "HOLD")).upper()
            confidence = int(data.get("confidence", 50))
            reasoning = str(data.get("reasoning", text))
            return decision, max(0, min(100, confidence)), reasoning
    except (json.JSONDecodeError, ValueError, TypeError):
        pass
    upper = text.upper()
    if "BUY" in upper and "SELL" not in upper:
        return "BUY", 70, text
    if "SELL" in upper:
        return "SELL", 70, text
    return "HOLD", 50, text


def _tokens(response) -> int:
    meta = getattr(response, "response_metadata", None) or {}
    usage = meta.get("token_usage") or meta.get("usage") or {}
    return int(usage.get("total_tokens", 0)) if isinstance(usage, dict) else 0
