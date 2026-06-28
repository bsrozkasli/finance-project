import json
import httpx
from datetime import datetime, timezone, timedelta
import finnhub

from app.config import settings
from app.models.analysis import SentimentAnalysisResponse, NewsArticle


class SentimentService:
    @classmethod
    async def analyze_sentiment(cls, symbol: str) -> SentimentAnalysisResponse:
        if not settings.FINNHUB_API_KEY:
            raise ValueError("FINNHUB_API_KEY is not configured")
        if not settings.AZURE_OPENAI_API_KEY:
            raise ValueError("AZURE_OPENAI_API_KEY is not configured")

        symbol = symbol.strip().upper()
        finnhub_client = finnhub.Client(api_key=settings.FINNHUB_API_KEY)
        
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(hours=settings.NEWS_LOOKBACK_HOURS)
        
        _from = start_time.strftime("%Y-%m-%d")
        _to = now.strftime("%Y-%m-%d")
        
        # finnhub_client.company_news is synchronous
        news_data = finnhub_client.company_news(symbol, _from=_from, to=_to)
        
        # Filter news strictly within the exact lookback hours
        filtered_news = []
        for item in news_data:
            dt_timestamp = item.get("datetime", 0)
            if not dt_timestamp:
                continue
            dt = datetime.fromtimestamp(dt_timestamp, tz=timezone.utc)
            if start_time <= dt <= now:
                filtered_news.append(item)
                
        # Limit to the latest 20 articles to avoid token limits
        filtered_news = sorted(filtered_news, key=lambda x: x.get("datetime", 0), reverse=True)[:20]
        
        if not filtered_news:
            return SentimentAnalysisResponse(
                symbol=symbol,
                score=0.0,
                label="NEUTRAL",
                key_themes=[],
                risk_factors=[],
                opportunity_factors=[],
                article_count=0,
                articles_analyzed=[],
                calculated_at=now
            )
            
        articles_text = ""
        articles_analyzed = []
        for idx, item in enumerate(filtered_news):
            headline = item.get("headline", "")
            summary = item.get("summary", "")
            source = item.get("source", "")
            url = item.get("url", "")
            dt = datetime.fromtimestamp(item.get("datetime", 0), tz=timezone.utc)
            
            articles_text += f"Article {idx+1}:\nHeadline: {headline}\nSummary: {summary}\nSource: {source}\nDate: {dt.isoformat()}\n\n"
            
            articles_analyzed.append(NewsArticle(
                headline=headline,
                summary=summary,
                source=source,
                datetime=dt,
                url=url
            ))
            
        system_prompt = (
            "You are a financial news sentiment analyst. Given a list of news headlines and summaries about a publicly traded asset, "
            "return a sentiment analysis. Be objective, concise, and data-driven. Focus only on information relevant to the asset's "
            "financial performance, market position, and risk profile. Ignore political opinions unless they directly affect the company.\n\n"
            "Ensure you return a valid JSON object only."
        )
        
        user_prompt = (
            f"Analyze the sentiment of the following {len(filtered_news)} news articles about {symbol} from the last {settings.NEWS_LOOKBACK_HOURS} hours. "
            "Return a JSON object with: score (float -1.0 to 1.0), label (VERY_BEARISH / BEARISH / NEUTRAL / BULLISH / VERY_BULLISH), "
            "key_themes (list of 3 max), risk_factors (list of 2 max), opportunity_factors (list of 2 max).\n\n"
            f"Articles:\n{articles_text}"
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
            "max_tokens": 1000,
            "temperature": 0.2
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()
            response_json = response.json()
            content = response_json["choices"][0]["message"]["content"].strip()
            
        # Strip potential markdown code block for JSON
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
            
        try:
            parsed = json.loads(content)
            score = float(parsed.get("score", 0.0))
            label = parsed.get("label", "NEUTRAL")
            key_themes = parsed.get("key_themes", [])
            risk_factors = parsed.get("risk_factors", [])
            opportunity_factors = parsed.get("opportunity_factors", [])
        except (json.JSONDecodeError, ValueError):
            score = 0.0
            label = "NEUTRAL"
            key_themes = []
            risk_factors = []
            opportunity_factors = []
            
        return SentimentAnalysisResponse(
            symbol=symbol,
            score=score,
            label=label,
            key_themes=key_themes[:3],
            risk_factors=risk_factors[:2],
            opportunity_factors=opportunity_factors[:2],
            article_count=len(filtered_news),
            articles_analyzed=articles_analyzed,
            calculated_at=now
        )
