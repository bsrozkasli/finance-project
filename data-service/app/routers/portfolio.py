from __future__ import annotations

from pydantic import BaseModel, Field, validator
from fastapi import APIRouter, HTTPException, Query

from app.models.portfolio import EfficientFrontierPoint, OptimizationRequest, OptimizationResponse, RebalanceCheckResponse
from app.services.portfolio_service import PortfolioService

router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


class RebalanceCheckRequest(BaseModel):
    target_weights: dict[str, float] = Field(min_items=1)
    current_weights: dict[str, float] = Field(min_items=1)
    threshold: float = Field(default=0.05, ge=0.0, le=1.0)

    @validator("target_weights", "current_weights")
    def validate_weights(cls, value: dict[str, float]) -> dict[str, float]:
        for symbol, weight in value.items():
            if not symbol or symbol.strip() == "":
                raise ValueError("weight symbols must be non-empty")
            if weight < 0.0 or weight > 1.0:
                raise ValueError("weights must be between 0 and 1")
        return {k.strip().upper(): v for k, v in value.items()}


class RebalanceCheckResult(BaseModel):
    actions: list[RebalanceCheckResponse]


class EfficientFrontierResponse(BaseModel):
    symbols: list[str]
    efficient_frontier: list[EfficientFrontierPoint]


@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_portfolio(request: OptimizationRequest) -> OptimizationResponse:
    try:
        return await PortfolioService.optimize(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/rebalance-check", response_model=RebalanceCheckResult)
async def rebalance_check(request: RebalanceCheckRequest) -> RebalanceCheckResult:
    symbols = sorted(set(request.target_weights.keys()) | set(request.current_weights.keys()))
    actions: list[RebalanceCheckResponse] = []

    for symbol in symbols:
        target = float(request.target_weights.get(symbol, 0.0))
        current = float(request.current_weights.get(symbol, 0.0))
        deviation = current - target
        if deviation > request.threshold:
            action = "SELL"
        elif deviation < -request.threshold:
            action = "BUY"
        else:
            action = "HOLD"

        actions.append(
            RebalanceCheckResponse(
                symbol=symbol,
                target_weight=target,
                current_weight=current,
                deviation=deviation,
                requires_rebalance=action != "HOLD",
                action=action,
            )
        )

    return RebalanceCheckResult(actions=actions)


@router.get("/efficient-frontier/{symbols}", response_model=EfficientFrontierResponse)
async def get_efficient_frontier(
    symbols: str,
    lookback_period: int = Query(252, ge=30, le=3650),
    risk_free_rate: float = Query(0.02, ge=-1.0, le=1.0),
    min_weight: float = Query(0.0, ge=0.0, le=1.0),
    max_weight: float = Query(1.0, ge=0.0, le=1.0),
) -> EfficientFrontierResponse:
    symbol_list = [symbol.strip().upper() for symbol in symbols.split(",") if symbol.strip()]
    if len(symbol_list) < 2:
        raise HTTPException(status_code=400, detail="At least two symbols are required")

    try:
        frontier = await PortfolioService.efficient_frontier(
            symbols=symbol_list,
            lookback_period=lookback_period,
            risk_free_rate=risk_free_rate,
            min_weight=min_weight,
            max_weight=max_weight,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return EfficientFrontierResponse(symbols=symbol_list, efficient_frontier=frontier)
