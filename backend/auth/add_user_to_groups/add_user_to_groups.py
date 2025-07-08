"""
Lambda function to automatically add users to specified Cognito groups upon sign-up or authentication.

This function is triggered by Cognito events and adds users to predefined groups
based on the event type (e.g., post-confirmation, post-authentication).

Environment Variables:
- USER_POOL_ID: The ID of the Cognito User Pool
- AUTO_JOIN_USER_GROUPS: JSON list of groups to automatically add users to
"""

import os
import json

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext

USER_POOL_ID: str = os.environ["USER_POOL_ID"]
AUTO_JOIN_USER_GROUPS: list[str] = json.loads(
    os.environ.get("AUTO_JOIN_USER_GROUPS", "[]")
)

logger = Logger()
tracer = Tracer()

cognito = boto3.client("cognito-idp")


@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def handler(event: dict, context: LambdaContext) -> dict:
    """
    Lambda handler for processing Cognito events.

    Depending on the trigger source, this function adds users to specified groups
    after sign-up confirmation or upon authentication if the password is changed.

    Args:
        event: The event data from Cognito
        context: The Lambda execution context

    Returns:
        dict: The event data, potentially modified
    """
    user_name: str = event["userName"]
    user_attributes: dict = event["request"]["userAttributes"]

    trigger_source: str = event["triggerSource"]
    if trigger_source == "PostConfirmation_ConfirmSignUp":
        add_user_to_groups(USER_POOL_ID, user_name, AUTO_JOIN_USER_GROUPS)

    elif trigger_source == "PostAuthentication_Authentication":
        user_status: str = user_attributes["cognito:user_status"]
        if user_status == "FORCE_CHANGE_PASSWORD":
            add_user_to_groups(USER_POOL_ID, user_name, AUTO_JOIN_USER_GROUPS)

    return event


def add_user_to_groups(user_pool_id: str, username: str, groups: list[str]):
    """
    Add a user to specified Cognito groups.

    Args:
        user_pool_id: The ID of the Cognito User Pool
        username: The username of the user to add to groups
        groups: A list of group names to add the user to
    """
    for group in groups:
        logger.info(f"Adding user '{username}' to group '{group}'")
        cognito.admin_add_user_to_group(
            UserPoolId=user_pool_id,
            Username=username,
            GroupName=group,
        )
