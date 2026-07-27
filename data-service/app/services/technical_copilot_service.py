from __future__ import annotations

import json
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.models.analysis import TechnicalCopilotRequest, TechnicalCopilotResponse, TechnicalOverlay


class TechnicalCopilotService:
    """Interprets a prepared technical workspace; it never fetches market data."""

    @classmethod
    async def answer(cls, request: TechnicalCopilotRequest) -> TechnicalCopilotResponse:
        workspace = request.workspace.model_dump(mode="json")
        prompt = (
            "You are a technical-analysis copilot. Use only the supplied workspace JSON. "
            "Do not invent prices, timestamps, indicators, or support/resistance levels. "
            "Answer in the same language as the user. Return JSON with keys answer, overlays, caveats. "
            "overlays must contain only levels present in workspace.levels and use kind, label, price.\n\n"
            f"USER REQUEST:\n{request.prompt}\n\nWORKSPACE:\n{json.dumps(workspace, ensure_ascii=True)}"
        )
        url = f"{settings.AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{settings.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version={settings.AZURE_OPENAI_API_VERSION}"
        payload = {"messages": [{"role": "system", "content": "You are precise, cautious, and evidence-bound."}, {"role": "user", "content": prompt}], "max_tokens": settings.LLM_MAX_TOKENS, "temperature": 0.2}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=payload, headers={"api-key": settings.AZURE_OPENAI_API_KEY, "Content-Type": "application/json"})
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"].strip()
            content = content.removeprefix("```json").removesuffix("```").strip()
            parsed = json.loads(content)
            allowed_prices = {round(level["price"], 4) for level in workspace.get("levels", [])}
            overlays = []
            for item in parsed.get("overlays", []):
                try:
                    price = float(item.get("price")) if item.get("price") is not None else None
                    if price is not None and round(price, 4) not in allowed_prices:
                        continue
                    overlays.append(TechnicalOverlay(kind=str(item.get("kind", "LEVEL")), label=str(item.get("label", "Technical level")), price=price))
                except (TypeError, ValueError):
                    continue
            answer = str(parsed.get("answer", "Technical interpretation unavailable."))
            caveats = [str(value) for value in parsed.get("caveats", [])][:5]
            return TechnicalCopilotResponse(symbol=request.symbol.upper(), answer=answer, overlays=overlays, caveats=caveats, generated_at=datetime.now(timezone.utc))
        except Exception:
            return TechnicalCopilotResponse(symbol=request.symbol.upper(), answer="AI technical copilot is unavailable. The deterministic indicators and levels remain available.", overlays=[], caveats=["AI provider response was unavailable or invalid."], generated_at=datetime.now(timezone.utc))