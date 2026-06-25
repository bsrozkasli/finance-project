from fastapi import APIRouter
from app.services.backtest_service import BacktestService
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/backtest", tags=["backtest"])

class BacktestResponse(BaseModel):
    symbol: str
    current_rsi: float
    scenario_description: str
    total_occurrences: int
    win_rate: float
    average_return_pct: float
    is_meaningful: bool

@router.get("/{symbol}", response_model=BacktestResponse)
def get_backtest(symbol: str) -> BacktestResponse:
    res = BacktestService.analyze(symbol)
    return BacktestResponse(**res)
