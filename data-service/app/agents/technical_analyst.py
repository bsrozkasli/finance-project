"""Metrics-only technical analyst (platform integration)."""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel


METRICS_ONLY_SYSTEM = (
    "You are a financial analyst. "
    "Use ONLY the provided pre-calculated metrics. "
    "Never fetch external data. Never call external tools. Never recalculate metrics. "
    "Interpret technical indicators and provide concise analysis."
)


def run_technical_analyst(llm: BaseChatModel, ticker: str, metrics_json: str) -> tuple[str, int]:
    messages = [
        SystemMessage(content=METRICS_ONLY_SYSTEM),
        HumanMessage(
            content=f"Ticker: {ticker}\nPre-calculated metrics JSON:\n{metrics_json}\n"
            "Focus on RSI, MACD, SMA, ATR, and price vs SMA."
        ),
    ]
    response = llm.invoke(messages)
    usage = _extract_token_usage(response)
    return (getattr(response, "content", str(response)) or "").strip(), usage


def _extract_token_usage(response) -> int:
    meta = getattr(response, "response_metadata", None) or {}
    usage = meta.get("token_usage") or meta.get("usage") or {}
    if isinstance(usage, dict):
        return int(usage.get("total_tokens") or usage.get("total") or 0)
    return 0
