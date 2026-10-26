import logging
from typing import NoReturn

from fastapi import APIRouter, HTTPException

from app.errors import DependencyUnavailableError, InsufficientDataError, RateLimitedError

from app.models.fundamental import FundamentalAnalysisResponse
from app.models.valuation import ValuationResponse
from app.models.risk import RiskAnalyticsResponse
from app.models.earnings import EarningsAnalysisResponse
from app.models.factors import FactorAnalysisResponse, InstitutionalScoreResponse
from app.models.composite import CompositeInvestmentScore

from app.services.fundamental_analysis_service import FundamentalAnalysisService
from app.services.valuation_service import ValuationService
from app.services.risk_analytics_service import RiskAnalyticsService
from app.services.earnings_analysis_service import EarningsAnalysisService
from app.services.factor_analysis_service import FactorAnalysisService
from app.services.composite_score_service import CompositeScoreService

router = APIRouter(prefix="/api/v1/research", tags=["research"])
logger = logging.getLogger(__name__)


def _raise_research_error(section: str, symbol: str, exc: Exception) -> NoReturn:
    if isinstance(exc, RateLimitedError):
        raise exc  # translated to 429 by the app-level handler
    if isinstance(exc, InsufficientDataError):
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if isinstance(exc, DependencyUnavailableError):
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    logger.error(
        "event=research_failed section=%s symbol=%s error_type=%s",
        section, symbol, type(exc).__name__,
    )
    raise HTTPException(status_code=500, detail=f"{section} research failed") from exc


@router.get("/fundamental/{symbol}", response_model=FundamentalAnalysisResponse)
def get_fundamental_analysis(symbol: str) -> FundamentalAnalysisResponse:
    try:
        return FundamentalAnalysisService.analyze(symbol)
    except Exception as exc:
        _raise_research_error("fundamental", symbol, exc)


@router.get("/valuation/{symbol}", response_model=ValuationResponse)
def get_valuation(symbol: str) -> ValuationResponse:
    try:
        return ValuationService.analyze(symbol)
    except Exception as exc:
        _raise_research_error("valuation", symbol, exc)


@router.get("/risk/{symbol}", response_model=RiskAnalyticsResponse)
def get_risk_analytics(symbol: str) -> RiskAnalyticsResponse:
    try:
        return RiskAnalyticsService.analyze(symbol)
    except Exception as exc:
        _raise_research_error("risk", symbol, exc)


@router.get("/earnings/{symbol}", response_model=EarningsAnalysisResponse)
async def get_earnings_analysis(symbol: str) -> EarningsAnalysisResponse:
    try:
        return await EarningsAnalysisService.analyze(symbol)
    except Exception as exc:
        _raise_research_error("earnings", symbol, exc)


@router.get("/factors/{symbol}", response_model=FactorAnalysisResponse)
def get_factors(symbol: str) -> FactorAnalysisResponse:
    try:
        return FactorAnalysisService.analyze_factors(symbol)
    except Exception as exc:
        _raise_research_error("factor", symbol, exc)


@router.get("/institutional-scores/{symbol}", response_model=InstitutionalScoreResponse)
def get_institutional_scores(symbol: str) -> InstitutionalScoreResponse:
    try:
        return FactorAnalysisService.analyze_institutional(symbol)
    except Exception as exc:
        _raise_research_error("institutional", symbol, exc)


@router.get("/composite/{symbol}", response_model=CompositeInvestmentScore)
async def get_composite_score(symbol: str) -> CompositeInvestmentScore:
    try:
        return await CompositeScoreService.analyze(symbol)
    except Exception as exc:
        _raise_research_error("composite", symbol, exc)
