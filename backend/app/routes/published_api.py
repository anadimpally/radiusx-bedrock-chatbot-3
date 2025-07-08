import json
import os
from time import sleep
from app.repositories.conversation import find_related_documents_by_conversation_id, find_related_document_by_id
import boto3
from app.routes.schemas.conversation import ChatInput, Conversation, MessageInput, RelatedDocument
from app.routes.schemas.published_api import (
    ChatInputWithoutBotId,
    ChatOutputWithoutBotId,
    MessageRequestedResponse,
)
from app.usecases.chat import chat, fetch_conversation
from app.user import User
from fastapi import APIRouter, HTTPException, Request
from ulid import ULID

from app.routes.schemas.conversation import MessageOutput

REGION = os.environ.get("REGION", "us-east-1")
router = APIRouter(tags=["published_api"])

sqs_client = boto3.client("sqs", region_name=REGION)
QUEUE_URL = os.environ.get("QUEUE_URL", "")


@router.get("/health")
def health():
    """For health check"""
    return {"status": "ok"}


@router.post("/conversation", response_model=MessageRequestedResponse)
def post_message(request: Request, message_input: ChatInputWithoutBotId):
    """Send chat message"""
    current_user: User = request.state.current_user

    # Extract bot_id from `current_user.id`
    # NOTE: user_id naming rule is implemented on `add_current_user_to_request` method
    bot_id = (
        current_user.id.split("#")[1] if "#" in current_user.id else current_user.id
    )

    # Generate conversation id if not provided
    conversation_id = (
        str(ULID())
        if message_input.conversation_id is None
        else message_input.conversation_id
    )
    # Issue id for the response message
    response_message_id = str(ULID())

    chat_input = ChatInput(
        conversation_id=conversation_id,
        message=MessageInput(
            role="user",
            content=message_input.message.content,
            model=message_input.message.model,
            parent_message_id=None,  # Use the latest message as the parent
            message_id=response_message_id,
        ),
        bot_id=bot_id,
        continue_generate=message_input.continue_generate,
    )

    try:
        _ = sqs_client.send_message(
            QueueUrl=QUEUE_URL, MessageBody=chat_input.model_dump_json()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return MessageRequestedResponse(
        conversation_id=conversation_id, message_id=response_message_id
    )


@router.get("/conversation/{conversation_id}", response_model=Conversation)
def get_conversation(request: Request, conversation_id: str):
    """Get a conversation history. If the conversation does not exist, it will return 404."""
    current_user: User = request.state.current_user

    output = fetch_conversation(current_user.id, conversation_id)
    return output


@router.get(
    "/conversation/{conversation_id}/{message_id}",
    response_model=ChatOutputWithoutBotId,
)
def get_message(request: Request, conversation_id: str, message_id: str):
    """Get specified message in a conversation. If the message does not exist, it will return 404."""
    current_user: User = request.state.current_user

    conversation = fetch_conversation(current_user.id, conversation_id)
    input_message = conversation.message_map.get(message_id, None)
    if input_message is None:
        raise HTTPException(
            status_code=404,
            detail=f"Message {message_id} not found in conversation {conversation_id}",
        )
    output_message_id = input_message.children[0]
    output_message = conversation.message_map.get(output_message_id, None)
    if output_message is None:
        raise HTTPException(
            status_code=404,
            detail=f"Message {message_id} not found in conversation {conversation_id}",
        )

    print("Enhancing message")
    # Enhance the message with source links
    enhanced_message = enhance_message_with_source_links(
        user_id=current_user.id,
        conversation_id=conversation_id,
        message=output_message
    )

    return ChatOutputWithoutBotId(
        conversation_id=conversation_id,
        message=enhanced_message,
        create_time=conversation.create_time,
    )


@router.get(
    "/conversation/{conversation_id}/related-documents",
    response_model=list[RelatedDocument],
)
def get_related_documents(
    request: Request, conversation_id: str
) -> list[RelatedDocument]:
    """Get related documents for a conversation. If the conversation does not exist, it will return 404."""
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
    """Get a specific related document by source_id. If the document does not exist, it will return 404."""
    current_user: User = request.state.current_user

    related_document = find_related_document_by_id(
        user_id=current_user.id,
        conversation_id=conversation_id,
        source_id=source_id,
    )
    return related_document.to_schema()


def enhance_message_with_source_links(user_id: str, conversation_id: str, message: MessageOutput):
    """Add source_url to each source_id in the thinking_log."""
    try:
        # Fetch the related documents
        related_documents = find_related_documents_by_conversation_id(
            user_id=user_id,
            conversation_id=conversation_id,
        )

        print("While enhancing message: " + str(related_documents))
        print("hasattr(message, 'thinking_log') = " + str(hasattr(message, 'thinking_log')))

        # Create a mapping of source_id to source_link from related documents
        source_id_to_url = {}
        for doc in related_documents:
            if hasattr(doc, 'source_id') and hasattr(doc, 'source_link'):
                source_id_to_url[doc.source_id] = doc.source_link

        # Process thinking_log if it exists
        if hasattr(message, 'thinking_log'):
            print("Successful append related Documents")
            message_dict = message.model_dump()  # Convert Pydantic model to dictionary

            # Iterate through thinking_log messages
            if 'thinking_log' in message_dict and message_dict['thinking_log']:
                for message_entry in message_dict['thinking_log']:
                    if 'content' in message_entry:
                        for content_item in message_entry['content']:
                            # Look for toolResult contentType
                            if content_item.get('content_type') == 'toolResult':
                                if 'body' in content_item and 'content' in content_item['body']:
                                    for tool_result in content_item['body']['content']:
                                        # Look for JSON tool results with source_id
                                        if 'json_' in tool_result:
                                            json_content = tool_result['json_']
                                            if 'source_id' in json_content:
                                                source_id = json_content['source_id']
                                                if source_id in source_id_to_url:
                                                    # Add source_url to the JSON object
                                                    json_content['source_url'] = source_id_to_url[source_id]

            return MessageOutput(**message_dict)  # Convert back to MessageOutput object

        return message

    except Exception as e:
        print(f"Error enhancing message with related documents: {e}")
        return message

