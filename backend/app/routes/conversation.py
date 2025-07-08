"""
Conversation API routes.

This module defines the API endpoints for managing conversations, including
sending messages, retrieving conversation history, and managing conversation metadata.
"""

from app.repositories.conversation import (
    change_conversation_title,
    delete_conversation_by_id,
    delete_conversation_by_user_id,
    find_conversation_by_user_id,
    find_related_documents_by_conversation_id,
    find_related_document_by_id,
    update_feedback,
)
from app.repositories.models.conversation import FeedbackModel
from app.routes.schemas.conversation import (
    ChatInput,
    ChatOutput,
    Conversation,
    ConversationMetaOutput,
    FeedbackInput,
    FeedbackOutput,
    NewTitleInput,
    ProposedTitle,
    RelatedDocument,
)
from app.usecases.chat import (
    chat,
    chat_output_from_message,
    fetch_conversation,
    propose_conversation_title,
)
from app.user import User
from fastapi import APIRouter, Request

router = APIRouter(tags=["conversation"])


@router.get("/health")
def health():
    """
    Health check endpoint.

    This endpoint provides a simple way to verify the API is running.

    Returns:
        dict: A status message indicating the API is operational
    """
    return {"status": "ok"}


@router.post("/conversation", response_model=ChatOutput)
def post_message(request: Request, chat_input: ChatInput):
    """
    Send a chat message.

    This endpoint processes a new message in a conversation, generating a response
    from the AI model and updating the conversation state.

    Args:
        request: The HTTP request
        chat_input: The chat input containing message and conversation details

    Returns:
        ChatOutput: The generated response and updated conversation information
    """
    current_user: User = request.state.current_user

    conversation, message = chat(user_id=current_user.id, chat_input=chat_input)
    output = chat_output_from_message(conversation=conversation, message=message)
    return output


@router.get(
    "/conversation/{conversation_id}/related-documents",
    response_model=list[RelatedDocument],
)
def get_related_documents(
    request: Request, conversation_id: str
) -> list[RelatedDocument]:
    """
    Get documents related to a conversation.

    This endpoint retrieves all documents that were used as context
    during the conversation.

    Args:
        request: The HTTP request
        conversation_id: The ID of the conversation

    Returns:
        list[RelatedDocument]: A list of related documents
    """
    current_user: User = request.state.current_user

    related_documents = find_related_documents_by_conversation_id(
        user_id=current_user.id,
        conversation_id=conversation_id,
    )
    return [related_document.to_schema() for related_document in related_documents]


@router.get(
    "/conversation/{conversation_id}/related-documents/{source_id}",
    response_model=RelatedDocument,
)
def get_related_document(
    request: Request, conversation_id: str, source_id: str
) -> RelatedDocument:
    """
    Get a specific related document.

    This endpoint retrieves a single document that was used as context
    during the conversation.

    Args:
        request: The HTTP request
        conversation_id: The ID of the conversation
        source_id: The ID of the source document

    Returns:
        RelatedDocument: The requested document
    """
    current_user: User = request.state.current_user

    related_document = find_related_document_by_id(
        user_id=current_user.id,
        conversation_id=conversation_id,
        source_id=source_id,
    )
    return related_document.to_schema()


@router.get("/conversation/{conversation_id}", response_model=Conversation)
def get_conversation(request: Request, conversation_id: str):
    """Get a conversation history"""
    current_user: User = request.state.current_user

    output = fetch_conversation(current_user.id, conversation_id)
    return output


@router.delete("/conversation/{conversation_id}")
def remove_conversation(request: Request, conversation_id: str):
    """Delete conversation"""
    current_user: User = request.state.current_user

    delete_conversation_by_id(current_user.id, conversation_id)


@router.get("/conversations", response_model=list[ConversationMetaOutput])
def get_all_conversations(
    request: Request,
):
    """Get all conversation metadata"""
    current_user: User = request.state.current_user

    conversations = find_conversation_by_user_id(current_user.id)
    output = [
        ConversationMetaOutput(
            id=conversation.id,
            title=conversation.title,
            create_time=conversation.create_time,
            model=conversation.model,
            bot_id=conversation.bot_id,
        )
        for conversation in conversations
    ]
    return output


@router.delete("/conversations")
def remove_all_conversations(
    request: Request,
):
    """Delete all conversations"""
    delete_conversation_by_user_id(request.state.current_user.id)


@router.patch("/conversation/{conversation_id}/title")
def patch_conversation_title(
    request: Request, conversation_id: str, new_title_input: NewTitleInput
):
    """Update conversation title"""
    current_user: User = request.state.current_user

    change_conversation_title(
        current_user.id, conversation_id, new_title_input.new_title
    )


@router.get(
    "/conversation/{conversation_id}/proposed-title", response_model=ProposedTitle
)
def get_proposed_title(request: Request, conversation_id: str):
    """Suggest conversation title"""
    current_user: User = request.state.current_user

    title = propose_conversation_title(current_user.id, conversation_id)
    return ProposedTitle(title=title)


@router.put(
    "/conversation/{conversation_id}/{message_id}/feedback",
    response_model=FeedbackOutput,
)
def put_feedback(
    request: Request,
    conversation_id: str,
    message_id: str,
    feedback_input: FeedbackInput,
):
    """Send feedback."""
    current_user: User = request.state.current_user

    update_feedback(
        user_id=current_user.id,
        conversation_id=conversation_id,
        message_id=message_id,
        feedback=FeedbackModel(
            thumbs_up=feedback_input.thumbs_up,
            category=feedback_input.category if feedback_input.category else "",
            comment=feedback_input.comment if feedback_input.comment else "",
        ),
    )
    return FeedbackOutput(
        thumbs_up=feedback_input.thumbs_up,
        category=feedback_input.category if feedback_input.category else "",
        comment=feedback_input.comment if feedback_input.comment else "",
    )
