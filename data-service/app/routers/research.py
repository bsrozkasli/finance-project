from fastapi import APIRouter, HTTPException

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


@router.get("/fundamental/{symbol}", response_model=FundamentalAnalysisResponse)
def get_fundamental_analysis(symbol: str) -> FundamentalAnalysisResponse:
    try:
        return FundamentalAnalysisService.analyze(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/valuation/{symbol}", response_model=ValuationResponse)
def get_valuation(symbol: str) -> ValuationResponse:
    try:
        return ValuationService.analyze(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/risk/{symbol}", response_model=RiskAnalyticsResponse)
def get_risk_analytics(symbol: str) -> RiskAnalyticsResponse:
    try:
        return RiskAnalyticsService.analyze(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/earnings/{symbol}", response_model=EarningsAnalysisResponse)
async def get_earnings_analysis(symbol: str) -> EarningsAnalysisResponse:
    try:
        return await EarningsAnalysisService.analyze(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/factors/{symbol}", response_model=FactorAnalysisResponse)
def get_factors(symbol: str) -> FactorAnalysisResponse:
    try:
        return FactorAnalysisService.analyze_factors(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/institutional-scores/{symbol}", response_model=InstitutionalScoreResponse)
def get_institutional_scores(symbol: str) -> InstitutionalScoreResponse:
    try:
        return FactorAnalysisService.analyze_institutional(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/composite/{symbol}", response_model=CompositeInvestmentScore)
async def get_composite_score(symbol: str) -> CompositeInvestmentScore:
    try:
        return await CompositeScoreService.analyze(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
