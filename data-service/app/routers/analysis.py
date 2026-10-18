import logging
from datetime import datetime, timezone
import asyncio

import pandas as pd
from fastapi import APIRouter, HTTPException, Query, status

from app.dependencies import get_resolver
from app.models.analysis import (
    AnalysisSummaryResponse,
    TechnicalAnalysisResponse,
    TechnicalWorkspaceResponse,
    TechnicalCopilotRequest,
    TechnicalCopilotResponse,
    SentimentAnalysisResponse,
    LlmInsightRequest,
    LlmInsightResponse,
    FullAnalysisResponse,
    PatternDetectionResponse,
    DecisionSupportRequest,
    DecisionSupportResponse,
)
from app.services.price_history import DAILY_OR_LONGER_INTERVALS, bars_to_frame
from app.services.technical_analysis_service import TechnicalAnalysisService
from app.services.technical_workspace_service import TechnicalWorkspaceService
from app.services.technical_copilot_service import TechnicalCopilotService
from app.services.pattern_detection_service import PatternDetectionService
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["analysis"])
logger = logging.getLogger(__name__)


def _log_unavailable_section(section: str, symbol: str, exc: Exception) -> None:
    logger.warning(
        "event=full_analysis_section_unavailable section=%s symbol=%s error_type=%s",
        section, symbol, type(exc).__name__,
    )


def _to_utc_z(value: object) -> str:
    if value is None:
        return ""
    ts = pd.Timestamp(value)
    if ts.tzinfo is None:
        ts = ts.tz_localize(timezone.utc)
    else:
        ts = ts.tz_convert(timezone.utc)
    return ts.isoformat().replace("+00:00", "Z")


# Limit concurrent provider-chain history loads to protect provider rate limits.
history_semaphore = asyncio.Semaphore(5)


async def _load_history(symbol: str, interval: str, range_value: str) -> pd.DataFrame:
    async with history_semaphore:
        bars = await asyncio.to_thread(get_resolver().get_ohlcv, symbol, interval, range_value)

    if not bars:
        raise HTTPException(status_code=404, detail=f"No historical data found for symbol '{symbol}'")

    history = bars_to_frame(bars)
    history.index.name = "Date" if interval in DAILY_OR_LONGER_INTERVALS else "Datetime"
    return history.reset_index()


@router.get("/technical/{symbol}", response_model=TechnicalAnalysisResponse)
async def get_technical_analysis(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("3mo"),
) -> TechnicalAnalysisResponse:
    history = await _load_history(symbol, interval, range)

    try:
        indicators = TechnicalAnalysisService.compute_indicators(history)
    except ValueError as exc:
        code = status.HTTP_422_UNPROCESSABLE_CONTENT if str(exc).startswith("At least") else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=str(exc)) from exc

    date_col = "Datetime" if "Datetime" in history.columns else "Date"
    timestamp = _to_utc_z(history.iloc[-1].get(date_col))

    return TechnicalAnalysisResponse(symbol=symbol, timestamp=timestamp, indicators=indicators)


@router.get("/technical/{symbol}/workspace", response_model=TechnicalWorkspaceResponse)
async def get_technical_workspace(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("1y"),
) -> TechnicalWorkspaceResponse:
    history = await _load_history(symbol, interval, range)
    try:
        return TechnicalWorkspaceService.build(history, symbol, interval, range)
    except ValueError as exc:
        code = status.HTTP_422_UNPROCESSABLE_CONTENT if str(exc).startswith("At least") else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=str(exc)) from exc


@router.post("/technical/{symbol}/copilot", response_model=TechnicalCopilotResponse)
async def technical_copilot(symbol: str, request: TechnicalCopilotRequest) -> TechnicalCopilotResponse:
    if request.symbol.upper() != symbol.upper():
        raise HTTPException(status_code=400, detail="Request symbol does not match path symbol")
    if not settings.AZURE_OPENAI_API_KEY or not settings.AZURE_OPENAI_DEPLOYMENT_NAME:
        return TechnicalCopilotResponse(
            symbol=symbol.upper(),
            answer="AI technical copilot is not configured; deterministic indicators and levels are available.",
            caveats=["Configure AZURE_OPENAI_API_KEY and AZURE_OPENAI_DEPLOYMENT_NAME to enable AI interpretation."],
            generated_at=datetime.now(timezone.utc),
        )
    return await TechnicalCopilotService.answer(request)

@router.get("/technical/{symbol}/signals", response_model=AnalysisSummaryResponse)
async def get_technical_signals(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("3mo"),
) -> AnalysisSummaryResponse:
    history = await _load_history(symbol, interval, range)

    try:
        indicators = TechnicalAnalysisService.compute_indicators(history)
    except ValueError as exc:
        code = status.HTTP_422_UNPROCESSABLE_CONTENT if str(exc).startswith("At least") else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=str(exc)) from exc

    date_col = "Datetime" if "Datetime" in history.columns else "Date"
    timestamp = _to_utc_z(history.iloc[-1].get(date_col))

    return AnalysisSummaryResponse(
        symbol=symbol,
        timestamp=timestamp,
        signal=TechnicalAnalysisService.signal(indicators),
    )


@router.get("/sentiment/{symbol}", response_model=SentimentAnalysisResponse)
async def get_sentiment_analysis(symbol: str) -> SentimentAnalysisResponse:
    if not settings.FINNHUB_API_KEY:
        raise HTTPException(status_code=503, detail="FINNHUB_API_KEY is not configured")
    
    try:
        from app.services.sentiment_service import SentimentService
        return await SentimentService.analyze_sentiment(symbol)
    except ImportError:
        raise HTTPException(status_code=503, detail="Sentiment service not available")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Sentiment analysis failed: {str(e)}")


@router.post("/insight", response_model=LlmInsightResponse)
async def generate_insight(request: LlmInsightRequest) -> LlmInsightResponse:
    if not settings.AZURE_OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AZURE_OPENAI_API_KEY is not configured")
    
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
                return await get_technical_analysis(symbol, interval="1d", range="3mo")
            except Exception as exc:
                _log_unavailable_section("technical", symbol, exc)
                return None

        async def fetch_sentiment():
            try:
                if not settings.FINNHUB_API_KEY:
                    return None
                from app.services.sentiment_service import SentimentService
                return await SentimentService.analyze_sentiment(symbol)
            except Exception as exc:
                _log_unavailable_section("sentiment", symbol, exc)
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
        
        # Generate LLM insight if Azure OpenAI key is available
        llm_insight = None
        if settings.AZURE_OPENAI_API_KEY:
            try:
                from app.services.llm_insight_service import LlmInsightService
                insight_request = LlmInsightRequest(
                    symbol=symbol,
                    include_technical=True,
                    include_sentiment=True,
                )
                llm_insight = await LlmInsightService.generate_insight(insight_request)
            except Exception as exc:
                _log_unavailable_section("llm_insight", symbol, exc)
        
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
async def get_patterns(
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
    history = await _load_history(symbol, interval, range)
    
    # Extract OHLCV columns
    closes = history["Close"].values
    highs = history["High"].values
    lows = history["Low"].values
    
    llm_context = None
    if include_llm_context and settings.AZURE_OPENAI_API_KEY:
        try:
            from app.services.llm_insight_service import LlmInsightService

            insight_request = LlmInsightRequest(
                symbol=symbol,
                include_technical=False,
                include_sentiment=False,
                scenario="Provide a brief 2-sentence market context for pattern analysis.",
            )
            result = await LlmInsightService.generate_insight(insight_request)
            llm_context = result.insight if result else None
        except Exception as exc:
            logger.warning(
                "event=pattern_llm_context_unavailable symbol=%s error_type=%s", symbol, type(exc).__name__
            )

    return PatternDetectionService.detect(
        symbol=symbol,
        interval=interval,
        closes=closes,
        highs=highs,
        lows=lows,
        llm_context=llm_context,
    )


@router.post("/decision-support", response_model=DecisionSupportResponse)
async def get_decision_support(request: DecisionSupportRequest) -> DecisionSupportResponse:
    if not settings.AZURE_OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AZURE_OPENAI_API_KEY is not configured")
    
    try:
        from app.services.llm_insight_service import LlmInsightService
        return await LlmInsightService.generate_decision_support_report(request)
    except ImportError:
        raise HTTPException(status_code=503, detail="LLM insight service not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decision support report generation failed: {str(e)}")
