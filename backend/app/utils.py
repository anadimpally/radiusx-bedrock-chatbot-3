"""
Utility functions.

This module provides common utilities used throughout the application,
including AWS service clients, S3 operations, and time helpers.
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Literal

import boto3
from app.repositories.models.custom_bot_guardrails import BedrockGuardrailsModel
from botocore.client import Config
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

REGION = os.environ.get("REGION", "us-east-1")
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
PUBLISH_API_CODEBUILD_PROJECT_NAME = os.environ.get(
    "PUBLISH_API_CODEBUILD_PROJECT_NAME", ""
)


def snake_to_camel(snake_str):
    """
    Convert a snake_case string to camelCase.

    Args:
        snake_str: The snake_case string to convert

    Returns:
        str: The camelCase version of the string
    """
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def is_running_on_lambda():
    """
    Check if the application is running in an AWS Lambda environment.

    Returns:
        bool: True if running in Lambda, False otherwise
    """
    return "AWS_EXECUTION_ENV" in os.environ


def get_bedrock_client(region=BEDROCK_REGION):
    """
    Get a Bedrock client for the specified region.

    Args:
        region: The AWS region for the Bedrock service

    Returns:
        boto3.client: A Bedrock client
    """
    client = boto3.client("bedrock", region_name=region)
    return client


def get_bedrock_runtime_client(region=BEDROCK_REGION):
    """
    Get a Bedrock runtime client for the specified region.

    Args:
        region: The AWS region for the Bedrock runtime service

    Returns:
        boto3.client: A Bedrock runtime client
    """
    client = boto3.client("bedrock-runtime", region_name=region)
    return client


def get_bedrock_agent_client(region=BEDROCK_REGION):
    """
    Get a Bedrock agent client for the specified region.

    Args:
        region: The AWS region for the Bedrock agent service

    Returns:
        boto3.client: A Bedrock agent client
    """
    client = boto3.client("bedrock-agent", region_name=region)
    return client


def get_bedrock_agent_runtime_client(region=BEDROCK_REGION):
    """
    Get a Bedrock agent runtime client for the specified region.

    Args:
        region: The AWS region for the Bedrock agent runtime service

    Returns:
        boto3.client: A Bedrock agent runtime client
    """
    client = boto3.client("bedrock-agent-runtime", region_name=region)
    return client


def get_current_time():
    """
    Get the current time as milliseconds since epoch.

    Returns:
        int: Current time in milliseconds
    """
    return int(datetime.now().timestamp() * 1000)


def generate_presigned_url(
    bucket: str,
    key: str,
    content_type: str | None = None,
    expiration=3600,
    client_method: Literal["put_object", "get_object"] = "put_object",
) -> str:
    """
    Generate a presigned URL for S3 operations.

    This function creates a presigned URL for uploading or downloading files
    from S3, allowing temporary access to the specified object.

    Args:
        bucket: The S3 bucket name
        key: The object key in the bucket
        content_type: The MIME type of the object (optional)
        expiration: Time in seconds for the presigned URL to remain valid
        client_method: The S3 method to presign ("put_object" or "get_object")

    Returns:
        str: The presigned URL
    """
    client = boto3.client(
        "s3",
        region_name=BEDROCK_REGION,
        config=Config(signature_version="v4", s3={"addressing_style": "path"}),
    )
    params = {"Bucket": bucket, "Key": key}
    if content_type:
        params["ContentType"] = content_type
    response = client.generate_presigned_url(
        ClientMethod=client_method,
        Params=params,
        ExpiresIn=expiration,
        HttpMethod="PUT" if client_method == "put_object" else "GET",
    )

    return response


def compose_upload_temp_s3_prefix(user_id: str, bot_id: str) -> str:
    """
    Compose the S3 prefix for temporary file uploads.

    This function generates the S3 prefix used for storing temporary files
    associated with a specific user and bot.

    Args:
        user_id: The ID of the user
        bot_id: The ID of the bot

    Returns:
        str: The S3 prefix for temporary uploads
    """
    return f"{user_id}/{bot_id}/_temp/"


def compose_upload_temp_s3_path(user_id: str, bot_id: str, filename: str) -> str:
    """
    Compose the S3 path for a temporary file upload.

    This function generates the full S3 path for a temporary file associated
    with a specific user and bot.

    Args:
        user_id: The ID of the user
        bot_id: The ID of the bot
        filename: The name of the file

    Returns:
        str: The full S3 path for the temporary file
    """
    prefix = compose_upload_temp_s3_prefix
    return f"{prefix(user_id, bot_id)}{filename}"


def compose_upload_document_s3_path(user_id: str, bot_id: str, filename: str) -> str:
    """
    Compose the S3 path for a document file.

    This function generates the full S3 path for a document file associated
    with a specific user and bot.

    Args:
        user_id: The ID of the user
        bot_id: The ID of the bot
        filename: The name of the file

    Returns:
        str: The full S3 path for the document file
    """
    return f"{user_id}/{bot_id}/documents/{filename}"


def delete_file_from_s3(bucket: str, key: str, ignore_not_exist: bool = False):
    """
    Delete a file from S3.

    This function deletes a specified file from an S3 bucket. If the file
    does not exist and ignore_not_exist is False, an error is raised.

    Args:
        bucket: The S3 bucket name
        key: The object key in the bucket
        ignore_not_exist: Whether to ignore errors if the file does not exist

    Returns:
        dict: The response from the S3 delete operation
    """
    client = boto3.client("s3", region_name=BEDROCK_REGION)

    # Check if the file exists
    if not ignore_not_exist:
        try:
            client.head_object(Bucket=bucket, Key=key)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                raise FileNotFoundError(f"The file does not exist in bucket.")
            else:
                raise

    response = client.delete_object(Bucket=bucket, Key=key)
    return response


def delete_files_with_prefix_from_s3(bucket: str, prefix: str):
    """
    Delete all objects with the given prefix from the given bucket.

    This function deletes all files in an S3 bucket that match the specified prefix.

    Args:
        bucket: The S3 bucket name
        prefix: The prefix of the objects to delete
    """
    client = boto3.client("s3", region_name=BEDROCK_REGION)
    response = client.list_objects_v2(Bucket=bucket, Prefix=prefix)

    if "Contents" not in response:
        return

    for obj in response["Contents"]:
        client.delete_object(Bucket=bucket, Key=obj["Key"])


def check_if_file_exists_in_s3(bucket: str, key: str):
    """
    Check if a file exists in S3.

    This function checks whether a specified file exists in an S3 bucket.

    Args:
        bucket: The S3 bucket name
        key: The object key in the bucket

    Returns:
        bool: True if the file exists, False otherwise
    """
    client = boto3.client("s3", region_name=BEDROCK_REGION)

    # Check if the file exists
    try:
        client.head_object(Bucket=bucket, Key=key)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            return False
        else:
            raise

    return True


def move_file_in_s3(bucket: str, key: str, new_key: str):
    """
    Move a file within S3 by copying and deleting the original.

    This function moves a file from one key to another within the same S3 bucket.

    Args:
        bucket: The S3 bucket name
        key: The current object key
        new_key: The new object key

    Returns:
        dict: The response from the S3 copy operation
    """
    client = boto3.client("s3", region_name=BEDROCK_REGION)

    # Check if the file exists
    try:
        client.head_object(Bucket=bucket, Key=key)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            raise FileNotFoundError(f"The file does not exist in bucket.")
        else:
            raise

    response = client.copy_object(
        Bucket=bucket, Key=new_key, CopySource={"Bucket": bucket, "Key": key}
    )
    response = client.delete_object(Bucket=bucket, Key=key)
    return response


def start_codebuild_project(environment_variables: dict) -> str:
    """
    Start a CodeBuild project with specified environment variables.

    This function triggers a CodeBuild project, passing in environment variables
    to configure the build process.

    Args:
        environment_variables: A dictionary of environment variables for the build

    Returns:
        str: The ID of the started build
    """
    environment_variables_override = [
        {"name": key, "value": value} for key, value in environment_variables.items()
    ]
    client = boto3.client("codebuild")
    response = client.start_build(
        projectName=PUBLISH_API_CODEBUILD_PROJECT_NAME,
        environmentVariablesOverride=environment_variables_override,
    )
    return response["build"]["id"]
