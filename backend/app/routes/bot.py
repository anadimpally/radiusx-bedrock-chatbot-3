from typing import Any, Dict, Literal

from app.dependencies import check_creating_bot_allowed
from app.repositories.custom_bot import (
    find_private_bot_by_id,
    find_private_bots_by_user_id,
    update_bot_visibility,
)
from app.routes.schemas.bot import (
    ActiveModelsOutput,
    Agent,
    AgentTool,
    BedrockGuardrailsOutput,
    BedrockKnowledgeBaseOutput,
    BotInput,
    BotMetaOutput,
    BotModifyInput,
    BotOutput,
    BotPinnedInput,
    BotPresignedUrlOutput,
    BotSummaryOutput,
    BotSwitchVisibilityInput,
    ConversationQuickStarter,
    GenerationParams,
    Knowledge,
)
from app.routes.schemas.conversation import type_model_name
from app.usecases.bot import (
    create_new_bot,
    fetch_all_bots,
    fetch_all_bots_by_user_id,
    fetch_available_agent_tools,
    fetch_bot_summary,
    issue_presigned_url,
    modify_owned_bot,
    modify_pin_status,
    remove_bot_by_id,
    remove_uploaded_file,
)
from app.user import User
from fastapi import APIRouter, Depends, Request

router = APIRouter(tags=["bot"])

"""
Bot API routes.

This module defines the API endpoints for managing bots, including creation,
modification, retrieval, and deletion. It handles the HTTP interface for the bot usecase functions.
"""

@router.post("/bot", response_model=BotOutput)
def post_bot(
    request: Request,
    bot_input: BotInput,
    create_bot_check=Depends(check_creating_bot_allowed),
):
    """
    Create a new private owned bot.

    This endpoint handles bot creation requests, validating user permissions
    and passing the request to the usecase layer.

    Args:
        request: The HTTP request
        bot_input: The bot creation data
        create_bot_check: Dependency to check if the user is allowed to create bots

    Returns:
        BotOutput: The created bot
    """
    current_user: User = request.state.current_user
    return create_new_bot(current_user.id, bot_input)


@router.patch("/bot/{bot_id}")
def patch_bot(request: Request, bot_id: str, modify_input: BotModifyInput):
    """
    Modify an owned bot.

    This endpoint updates a bot's configuration, including its title,
    instruction, description, and other attributes.

    Args:
        request: The HTTP request
        bot_id: The ID of the bot to modify
        modify_input: The data for modifying the bot

    Returns:
        BotModifyOutput: The updated bot configuration
    """
    return modify_owned_bot(request.state.current_user.id, bot_id, modify_input)


@router.patch("/bot/{bot_id}/pinned")
def patch_bot_pin_status(request: Request, bot_id: str, pinned_input: BotPinnedInput):
    """
    Update a bot's pinned status.

    This endpoint allows users to pin or unpin a bot for easier access.

    Args:
        request: The HTTP request
        bot_id: The ID of the bot to update
        pinned_input: Data containing the new pinned status

    Returns:
        None
    """
    current_user: User = request.state.current_user
    return modify_pin_status(current_user.id, bot_id, pinned=pinned_input.pinned)


@router.patch("/bot/{bot_id}/visibility")
def patch_bot_visibility(
    request: Request, bot_id: str, visibility_input: BotSwitchVisibilityInput
):
    """
    Change a bot's visibility between private and public.

    This endpoint toggles whether a bot is shared with other users.

    Args:
        request: The HTTP request
        bot_id: The ID of the bot to update
        visibility_input: Data containing the new visibility status

    Returns:
        None
    """
    current_user: User = request.state.current_user
    update_bot_visibility(current_user.id, bot_id, visibility_input.to_public)


@router.get("/bot", response_model=list[BotMetaOutput])
def get_all_bots(
    request: Request,
    kind: Literal["private", "mixed"] = "private",
    pinned: bool = False,
    limit: int | None = None,
):
    """
    Get all bots for the current user.

    This endpoint retrieves bot metadata with options for filtering and limiting results.
    Results are sorted by last used time in descending order.

    Args:
        request: The HTTP request
        kind: Type of bots to retrieve ("private" or "mixed")
        pinned: Whether to retrieve only pinned bots
        limit: Maximum number of bots to return

    Returns:
        list[BotMetaOutput]: A list of bot metadata
    """
    current_user: User = request.state.current_user

    bots = fetch_all_bots(current_user.id, limit, pinned, kind)
    return bots


@router.get("/bot/private/{bot_id}", response_model=BotOutput)
def get_private_bot(request: Request, bot_id: str):
    """Get private bot by id."""
    current_user: User = request.state.current_user

    bot = find_private_bot_by_id(current_user.id, bot_id)
    output = BotOutput(
        id=bot.id,
        title=bot.title,
        instruction=bot.instruction,
        description=bot.description,
        create_time=bot.create_time,
        last_used_time=bot.last_used_time,
        is_public=True if bot.public_bot_id else False,
        is_pinned=bot.is_pinned,
        owned=True,
        agent=Agent(
            tools=[
                AgentTool(name=tool.name, description=tool.description)
                for tool in bot.agent.tools
            ]
        ),
        knowledge=Knowledge(
            source_urls=bot.knowledge.source_urls,
            sitemap_urls=bot.knowledge.sitemap_urls,
            filenames=bot.knowledge.filenames,
            s3_urls=bot.knowledge.s3_urls,
        ),
        generation_params=GenerationParams(
            max_tokens=bot.generation_params.max_tokens,
            top_k=bot.generation_params.top_k,
            top_p=bot.generation_params.top_p,
            temperature=bot.generation_params.temperature,
            stop_sequences=bot.generation_params.stop_sequences,
        ),
        sync_status=bot.sync_status,
        sync_status_reason=bot.sync_status_reason,
        sync_last_exec_id=bot.sync_last_exec_id,
        display_retrieved_chunks=bot.display_retrieved_chunks,
        conversation_quick_starters=[
            ConversationQuickStarter(
                title=starter.title,
                example=starter.example,
            )
            for starter in bot.conversation_quick_starters
        ],
        bedrock_knowledge_base=(
            BedrockKnowledgeBaseOutput(**bot.bedrock_knowledge_base.model_dump())
            if bot.bedrock_knowledge_base
            else None
        ),
        bedrock_guardrails=(
            BedrockGuardrailsOutput(**bot.bedrock_guardrails.model_dump())
            if bot.bedrock_guardrails
            else None
        ),
        active_models=ActiveModelsOutput.model_validate(dict(bot.active_models)),
    )
    return output


@router.get("/bot/summary/{bot_id}", response_model=BotSummaryOutput)
def get_bot_summary(request: Request, bot_id: str):
    """Get bot summary by id."""
    current_user: User = request.state.current_user

    return fetch_bot_summary(current_user.id, bot_id)


@router.delete("/bot/{bot_id}")
def delete_bot(request: Request, bot_id: str):
    """Delete bot by id. This can be used for both owned and shared bots.
    If the bot is shared, just remove the alias.
    """
    current_user: User = request.state.current_user
    remove_bot_by_id(current_user.id, bot_id)


@router.get("/bot/{bot_id}/presigned-url", response_model=BotPresignedUrlOutput)
def get_bot_presigned_url(
    request: Request, bot_id: str, filename: str, contentType: str
):
    """Get presigned url for bot"""
    current_user: User = request.state.current_user
    url = issue_presigned_url(current_user.id, bot_id, filename, contentType)
    return BotPresignedUrlOutput(url=url)


@router.delete("/bot/{bot_id}/uploaded-file")
def delete_bot_uploaded_file(request: Request, bot_id: str, filename: str):
    """Delete uploaded file for bot"""
    current_user: User = request.state.current_user
    remove_uploaded_file(current_user.id, bot_id, filename)


@router.get("/bot/{bot_id}/agent/available-tools", response_model=list[AgentTool])
def get_bot_available_tools(request: Request, bot_id: str):
    """Get available tools for bot"""
    tools = fetch_available_agent_tools()
    return [AgentTool(name=tool.name, description=tool.description) for tool in tools]
