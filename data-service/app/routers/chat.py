from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings

class ChatRequest(BaseModel):
    symbol: str
    message: str

class ChatResponse(BaseModel):
    response: str

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

@router.post("", response_model=ChatResponse)
async def ask_chat(request: ChatRequest) -> ChatResponse:
    if not settings.AZURE_OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AZURE_OPENAI_API_KEY is not configured")
    
    try:
        from app.services.llm_insight_service import LlmInsightService
        response_text = await LlmInsightService.chat_with_report(request.symbol, request.message)
        return ChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
