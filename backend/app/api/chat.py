"""Chat API routes for AI assistant."""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.chat import ChatConversation
from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryResponse, ChatMessage
from app.utils.security import get_optional_user
from app.services.chat_service import get_chat_response

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def send_message(
    data: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the PhytoVision AI Assistant. Open to registered users and guest farmers."""
    conversation = None
    messages = []

    # Get or create conversation if authenticated
    if current_user:
        if data.conversation_id:
            result = await db.execute(
                select(ChatConversation).where(
                    ChatConversation.id == data.conversation_id,
                    ChatConversation.user_id == current_user.id,
                )
            )
            conversation = result.scalar_one_or_none()

        if not conversation:
            conversation = ChatConversation(
                user_id=current_user.id,
                language=data.language,
                messages="[]",
                context=json.dumps(data.context) if data.context else None,
            )
            db.add(conversation)
            await db.flush()
            await db.refresh(conversation)

        messages = json.loads(str(getattr(conversation, "messages", "[]") or "[]"))

    # Add farmer message
    messages.append({
        "role": "farmer",
        "content": data.message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "language": data.language,
    })

    # Get AI response
    raw_ctx = getattr(conversation, "context", None) if conversation else None
    context = json.loads(str(raw_ctx)) if raw_ctx else data.context
    response_text, is_demo = await get_chat_response(
        message=data.message,
        language=data.language,
        context=context,
        history=messages,
    )

    # Add assistant response
    messages.append({
        "role": "assistant",
        "content": response_text,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "language": data.language,
    })

    # Update conversation if in database
    conv_id = data.conversation_id or 1
    if conversation:
        setattr(conversation, "messages", json.dumps(messages))
        setattr(conversation, "language", data.language)
        if data.context:
            setattr(conversation, "context", json.dumps(data.context))
        await db.flush()
        conv_id = int(getattr(conversation, "id"))

    return ChatResponse(
        conversation_id=conv_id,
        response=response_text,
        language=data.language,
        is_demo=is_demo,
    )


@router.get("/history", response_model=list[ChatHistoryResponse])
async def get_chat_history(
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all chat conversations for the current user."""
    if not current_user:
        return []

    result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.user_id == current_user.id)
        .order_by(ChatConversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    return [
        ChatHistoryResponse(
            conversation_id=int(getattr(conv, "id")),
            messages=[ChatMessage(**m) for m in json.loads(str(getattr(conv, "messages", "[]") or "[]"))],
            language=str(getattr(conv, "language", "en") or "en"),
            created_at=getattr(conv, "created_at"),
        )
        for conv in conversations
    ]
