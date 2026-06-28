from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel


def run_bull_researcher(
    llm: BaseChatModel, ticker: str, context: str
) -> tuple[str, int]:
    messages = [
        SystemMessage(
            content=(
                "You are a bull researcher. Use ONLY the provided analysis context. "
                "Never fetch data or recalculate metrics. Build the bull thesis."
            )
        ),
        HumanMessage(content=f"Ticker: {ticker}\nContext:\n{context}"),
    ]
    response = llm.invoke(messages)
    return _content(response), _tokens(response)


def _content(response) -> str:
    return (getattr(response, "content", str(response)) or "").strip()


def _tokens(response) -> int:
    meta = getattr(response, "response_metadata", None) or {}
    usage = meta.get("token_usage") or meta.get("usage") or {}
    return int(usage.get("total_tokens", 0)) if isinstance(usage, dict) else 0
