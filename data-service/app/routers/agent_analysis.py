from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models.agent_analysis import AgentAnalysisRequest, AgentAnalysisResponse
from app.services.agent_analysis_service import AgentAnalysisService

router = APIRouter(prefix="/api/v1", tags=["agent-analysis"])


@router.post("/agent-analysis", response_model=AgentAnalysisResponse)
def post_agent_analysis(request: AgentAnalysisRequest) -> AgentAnalysisResponse:
    if not settings.AZURE_OPENAI_API_KEY or not settings.AZURE_OPENAI_DEPLOYMENT_NAME:
        raise HTTPException(
            status_code=503,
            detail="Azure OpenAI is not configured (AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT_NAME)",
        )
    try:
        return AgentAnalysisService.analyze(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
