"""
FastAPI dependency functions.

This module defines FastAPI dependencies for authentication, authorization,
and permission checks used throughout the application.
"""

from app.auth import verify_token
from app.user import User
from fastapi import Depends, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

security = HTTPBearer()


def get_current_user(token: HTTPAuthorizationCredentials = Depends(security)):
    """
    Get the current authenticated user from the request.

    This dependency extracts and verifies the JWT token from the request,
    returning the authenticated user information.

    Args:
        token: The authorization credentials from the request

    Returns:
        User: The authenticated user

    Raises:
        HTTPException: If the token is invalid or authentication fails
    """
    try:
        decoded = verify_token(token.credentials)
        # Return user information
        return User(
            id=decoded["sub"],
            name=decoded["cognito:username"],
            groups=decoded.get("cognito:groups", []),
        )
    except (IndexError, JWTError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def check_admin(user: User = Depends(get_current_user)):
    """
    Check if the current user has admin privileges.

    This dependency is used to protect admin-only routes.

    Args:
        user: The authenticated user

    Raises:
        HTTPException: If the user is not an admin
    """
    if not user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access this API.",
        )


def check_creating_bot_allowed(user: User = Depends(get_current_user)):
    """
    Check if the current user is allowed to create bots.

    This dependency protects bot creation routes.

    Args:
        user: The authenticated user

    Raises:
        HTTPException: If the user is not allowed to create bots
    """
    if not user.is_creating_bot_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not allowed to create bot.",
        )


def check_publish_allowed(user: User = Depends(get_current_user)):
    """
    Check if the current user is allowed to publish bots as APIs.

    This dependency protects API publication routes.

    Args:
        user: The authenticated user

    Raises:
        HTTPException: If the user is not allowed to publish bots
    """
    if not user.is_publish_allowed():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not allowed to publish bot.",
        )
