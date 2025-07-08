"""
Vector search and retrieval augmented generation (RAG) module.

This module handles interactions with Bedrock knowledge bases and vector databases
for knowledge retrieval in bot conversations.
"""

import logging
from typing import TypedDict
from urllib.parse import urlparse

from app.repositories.models.conversation import (
    RelatedDocumentModel,
    TextToolResultModel,
)
from app.repositories.models.custom_bot import BotModel
from app.utils import get_bedrock_agent_runtime_client
from botocore.exceptions import ClientError
from mypy_boto3_bedrock_agent_runtime.type_defs import (
    KnowledgeBaseRetrievalResultTypeDef,
)
from mypy_boto3_bedrock_runtime.type_defs import GuardrailConverseContentBlockTypeDef

logger = logging.getLogger(__name__)
agent_client = get_bedrock_agent_runtime_client()


class SearchResult(TypedDict):
    """
    Type definition for a search result from a knowledge base.

    Attributes:
        bot_id: The ID of the bot associated with the result
        content: The text content of the result
        source_name: The name or title of the source
        source_link: The URL or location of the source
        rank: The relevance ranking of the result
    """
    bot_id: str
    content: str
    source_name: str
    source_link: str
    rank: int


def search_result_to_related_document(
    search_result: SearchResult,
    source_id_base: str,
) -> RelatedDocumentModel:
    """
    Convert a search result to a related document model.

    This function transforms a search result from the knowledge base
    into the internal document model format.

    Args:
        search_result: The search result to convert
        source_id_base: The base ID to use for the source

    Returns:
        RelatedDocumentModel: The converted document model
    """
    return RelatedDocumentModel(
        content=TextToolResultModel(
            text=search_result["content"],
        ),
        source_id=f"{source_id_base}@{search_result['rank']}",
        source_name=search_result["source_name"],
        source_link=search_result["source_link"],
    )


def to_guardrails_grounding_source(
    search_results: list[SearchResult],
) -> GuardrailConverseContentBlockTypeDef | None:
    """
    Convert search results to Guardrails Grounding source format.

    This function transforms retrieval results into the format expected by
    Bedrock Guardrails for grounding LLM responses.

    Args:
        search_results: The search results from retrieval

    Returns:
        GuardrailConverseContentBlockTypeDef | None: The formatted grounding source or None if empty
    """
    return (
        {
            "text": {
                "text": "\n\n".join(x["content"] for x in search_results),
                "qualifiers": ["grounding_source"],
            }
        }
        if len(search_results) > 0
        else None
    )


def _bedrock_knowledge_base_search(bot: BotModel, query: str) -> list[SearchResult]:
    """
    Search a Bedrock knowledge base for documents related to a query.

    This function uses the Bedrock Knowledge Base API to retrieve
    relevant documents from the bot's configured knowledge base.

    Args:
        bot: The bot model containing knowledge base configuration
        query: The user query to search for

    Returns:
        list[SearchResult]: A list of search results

    Raises:
        ValueError: If the search configuration is invalid
        ClientError: If there's an error with the Bedrock API
    """
    assert (
        bot.bedrock_knowledge_base is not None
        and bot.bedrock_knowledge_base.knowledge_base_id is not None
    )

    if bot.bedrock_knowledge_base.search_params.search_type == "semantic":
        search_type = "SEMANTIC"
    elif bot.bedrock_knowledge_base.search_params.search_type == "hybrid":
        search_type = "HYBRID"
    else:
        raise ValueError("Invalid search type")

    limit = bot.bedrock_knowledge_base.search_params.max_results
    # Use exist_knowledge_base_id if available, otherwise use knowledge_base_id
    knowledge_base_id = (
        bot.bedrock_knowledge_base.exist_knowledge_base_id
        if bot.bedrock_knowledge_base.exist_knowledge_base_id is not None
        else bot.bedrock_knowledge_base.knowledge_base_id
    )

    try:
        response = agent_client.retrieve(
            knowledgeBaseId=knowledge_base_id,
            retrievalQuery={"text": query},
            retrievalConfiguration={
                "vectorSearchConfiguration": {
                    "numberOfResults": limit,
                    "overrideSearchType": search_type,
                }
            },
        )

        def extract_source_from_retrieval_result(
            retrieval_result: KnowledgeBaseRetrievalResultTypeDef,
        ) -> tuple[str, str] | None:
            """Extract source URL/URI from retrieval result based on location type."""
            location = retrieval_result.get("location", {})
            location_type = location.get("type")

            if location_type == "WEB":
                url = location.get("webLocation", {}).get("url", "")
                return (url, url)

            elif location_type == "S3":
                uri = location.get("s3Location", {}).get("uri", "")
                source_name = urlparse(url=uri).path.split("/")[-1]
                return (source_name, uri)

            return None

        search_results = []
        for i, retrieval_result in enumerate(response.get("retrievalResults", [])):
            content = retrieval_result.get("content", {}).get("text", "")
            source = extract_source_from_retrieval_result(retrieval_result)

            if source is not None:
                search_results.append(
                    SearchResult(
                        rank=i,
                        bot_id=bot.id,
                        content=content,
                        source_name=source[0],
                        source_link=source[1],
                    )
                )

        return search_results

    except ClientError as e:
        logger.error(f"Error querying Bedrock Knowledge Base: {e}")
        raise e


def search_related_docs(bot: BotModel, query: str) -> list[SearchResult]:
    """
    Search for documents related to a query for a specific bot.

    This function retrieves relevant documents from the bot's knowledge base
    to provide context for answering user queries.

    Args:
        bot: The bot model containing knowledge base configuration
        query: The user query to search for

    Returns:
        list[SearchResult]: A list of search results containing relevant content
    """
    return _bedrock_knowledge_base_search(bot, query)
