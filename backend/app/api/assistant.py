from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.api.auth import get_current_admin, AdminProfile
from app.services.assistant_router import AssistantRouter

router = APIRouter()

class ChatMessage(BaseModel):
    role: str # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ChatResponse(BaseModel):
    reply: str
    tools_called: List[Dict[str, Any]] = []
    structured_analysis: Optional[Dict[str, Any]] = None
    kpis: Optional[Dict[str, Any]] = None

@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    payload: ChatRequest,
    admin: AdminProfile = Depends(get_current_admin)
):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Empty message")

    history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]
    
    result = await AssistantRouter.process_chat(
        user_message=payload.message,
        chat_history=history_dicts,
        admin_id=admin.id,
        admin_name=admin.name,
        is_demo=admin.is_demo
    )

    return ChatResponse(
        reply=result["reply"],
        tools_called=result.get("tools_called", []),
        structured_analysis=result.get("structured_analysis"),
        kpis=result.get("kpis")
    )
