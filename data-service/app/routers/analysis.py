from datetime import datetime, timezone
import asyncio

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from app.models.analysis import (
    AnalysisSummaryResponse,
    TechnicalAnalysisResponse,
    SentimentAnalysisResponse,
    LlmInsightRequest,
    LlmInsightResponse,
    FullAnalysisResponse,
    PatternDetectionResponse,
)
from app.services.technical_analysis_service import TechnicalAnalysisService
from app.services.pattern_detection_service import PatternDetectionService
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["analysis"])


def _to_utc_z(value: object) -> str:
    if value is None:
        return ""
    ts = pd.Timestamp(value)
    if ts.tzinfo is None:
        ts = ts.tz_localize(timezone.utc)
    else:
        ts = ts.tz_convert(timezone.utc)
    return ts.isoformat().replace("+00:00", "Z")


def _load_history(symbol: str, interval: str, range_value: str) -> pd.DataFrame:
    ticker = yf.Ticker(symbol)
    history = ticker.history(interval=interval, period=range_value, auto_adjust=False, actions=False)

    if history is None or history.empty:
        raise HTTPException(status_code=404, detail=f"No historical data found for symbol '{symbol}'")

    return history.reset_index()


@router.get("/technical/{symbol}", response_model=TechnicalAnalysisResponse)
def get_technical_analysis(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("3mo"),
) -> TechnicalAnalysisResponse:
    history = _load_history(symbol, interval, range)

    try:
        indicators = TechnicalAnalysisService.compute_indicators(history)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    date_col = "Datetime" if "Datetime" in history.columns else "Date"
    timestamp = _to_utc_z(history.iloc[-1].get(date_col))

    return TechnicalAnalysisResponse(symbol=symbol, timestamp=timestamp, indicators=indicators)


@router.get("/technical/{symbol}/signals", response_model=AnalysisSummaryResponse)
def get_technical_signals(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("3mo"),
) -> AnalysisSummaryResponse:
    history = _load_history(symbol, interval, range)

    try:
        indicators = TechnicalAnalysisService.compute_indicators(history)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    date_col = "Datetime" if "Datetime" in history.columns else "Date"
    timestamp = _to_utc_z(history.iloc[-1].get(date_col))

    return AnalysisSummaryResponse(
        symbol=symbol,
        timestamp=timestamp,
        signal=TechnicalAnalysisService.signal(indicators),
    )


@router.get("/sentiment/{symbol}", response_model=SentimentAnalysisResponse)
def get_sentiment_analysis(symbol: str) -> SentimentAnalysisResponse:
    if not settings.FINNHUB_API_KEY:
        raise HTTPException(status_code=503, detail="FINNHUB_API_KEY is not configured")
    
    try:
        from app.services.sentiment_service import SentimentService
        return SentimentService.analyze_sentiment(symbol)
    except ImportError:
        raise HTTPException(status_code=503, detail="Sentiment service not available")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Sentiment analysis failed: {str(e)}")


@router.post("/insight", response_model=LlmInsightResponse)
async def generate_insight(request: LlmInsightRequest) -> LlmInsightResponse:
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY is not configured")
    
    try:
        from app.services.llm_insight_service import LlmInsightService
        return await LlmInsightService.generate_insight(request)
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM insight service not available")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Insight generation failed: {str(e)}")


@router.get("/full/{symbol}", response_model=FullAnalysisResponse)
async def get_full_analysis(symbol: str) -> FullAnalysisResponse:
    """
    Aggregates technical analysis and sentiment data in parallel,
    then passes results to the insight service for a consolidated response.
    """
    try:
        async def fetch_technical():
            try:
                return get_technical_analysis(symbol)
            except Exception:
                return None
        
        async def fetch_sentiment():
            try:
                if not settings.FINNHUB_API_KEY:
                    return None
                from app.services.sentiment_service import SentimentService
                return SentimentService.analyze_sentiment(symbol)
            except Exception:
                return None
        
        # Execute technical and sentiment analysis in parallel
        tech_task = asyncio.create_task(fetch_technical())
        sentiment_task = asyncio.create_task(fetch_sentiment())
        
        technical_result = await tech_task
        sentiment_result = await sentiment_task
        
        # Prepare technical data as dict
        technical_dict = None
        if technical_result:
            technical_dict = {
                "symbol": technical_result.symbol,
                "timestamp": technical_result.timestamp,
                "indicators": technical_result.indicators.model_dump(),
            }
        
        # Generate LLM insight if Anthropic key is available
        llm_insight = None
        if settings.ANTHROPIC_API_KEY:
            try:
                from app.services.llm_insight_service import LlmInsightService
                insight_request = LlmInsightRequest(
                    symbol=symbol,
                    include_technical=True,
                    include_sentiment=True,
                )
                llm_insight = await LlmInsightService.generate_insight(insight_request)
            except Exception:
                pass
        
        return FullAnalysisResponse(
            symbol=symbol,
            technical=technical_dict,
            sentiment=sentiment_result,
            llm_insight=llm_insight,
            generated_at=datetime.now(timezone.utc),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full analysis failed: {str(e)}")


@router.get("/patterns/{symbol}", response_model=PatternDetectionResponse)
def get_patterns(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("3mo"),
    include_llm_context: bool = Query(False),
) -> PatternDetectionResponse:
    """
    Detect classical price patterns from historical OHLCV data.
    
    Optionally queries the LLM service for a 2-sentence context if include_llm_context is true.
    
    Args:
        symbol: Trading symbol (e.g., 'AAPL')
        interval: Candlestick interval (e.g., '1d', '1h', default='1d')
        range: Historical data range (e.g., '3mo', '1y', default='3mo')
        include_llm_context: Whether to include LLM-generated context (default=False)
        
    Returns:
        PatternDetectionResponse with detected patterns and dominant pattern
    """
    history = _load_history(symbol, interval, range)
    
    # Extract OHLCV columns
    closes = history["Close"].values
    highs = history["High"].values
    lows = history["Low"].values
    
    # Get LLM context if requested
    llm_context = None
    if include_llm_context and settings.ANTHROPIC_API_KEY:
        try:
            from app.services.llm_insight_service import LlmInsightService
            import asyncio
            
            async def get_llm_insight():
                insight_request = LlmInsightRequest(
                    symbol=symbol,
                    include_technical=False,
                    include_sentiment=False,
                    scenario="Provide a brief 2-sentence market context for pattern analysis.",
                )
                return await LlmInsightService.generate_insight(insight_request)
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(get_llm_insight())
            loop.close()
            llm_context = result.insight if result else None
        except Exception:
            pass
    
    return PatternDetectionService.detect(
        symbol=symbol,
        interval=interval,
        closes=closes,
        highs=highs,
        lows=lows,
        llm_context=llm_context,
    )

