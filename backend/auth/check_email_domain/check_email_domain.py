"""
Lambda function to validate email domains during Cognito sign-up.

This function checks if the email domain of a user attempting to sign up is allowed,
based on a predefined list of allowed domains.

Environment Variables:
- ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR: JSON string of allowed email domains
"""

import os
import json
from typing import Dict

ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR = os.environ.get("ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR")
ALLOWED_SIGN_UP_EMAIL_DOMAINS = (
    json.loads(ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR)
    if ALLOWED_SIGN_UP_EMAIL_DOMAINS_STR
    else []
)


def check_email_domain(email: str) -> bool:
    """
    Determine whether an email domain is allowed for sign-up.

    Args:
        email: The email address to check

    Returns:
        bool: True if the domain is allowed, False otherwise
    """
    # Always disallow if the number of '@' in the email is not exactly one
    if email.count("@") != 1:
        return False

    # Allow if the domain part of the email matches any of the allowed domains
    domain = email.split("@")[1]
    return domain in ALLOWED_SIGN_UP_EMAIL_DOMAINS


def handler(event: Dict, context: Dict) -> Dict:
    """
    Cognito Pre Sign-up Lambda Trigger.

    This function is triggered before a user signs up, to validate the email domain.

    Args:
        event: The event from Cognito
        context: The Lambda execution context

    Returns:
        Dict: The response to Cognito

    Raises:
        Exception: If the email domain is not allowed
    """
    try:
        print("Received event:", json.dumps(event, indent=2))
        email = event["request"]["userAttributes"]["email"]
        is_allowed = check_email_domain(email)
        if is_allowed:
            return event
        else:
            raise Exception("Invalid email domain")
    except Exception as e:
        print("Error occurred:", e)
        raise e
