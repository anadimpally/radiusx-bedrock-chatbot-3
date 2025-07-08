from pydantic import BaseModel


class User(BaseModel):
    """
    User model representing an authenticated user.

    This class stores user identity information and provides methods
    to check various permissions based on group membership.

    Attributes:
        id: The unique identifier for the user
        name: The user's display name
        groups: A list of groups the user belongs to
    """

    id: str
    name: str
    groups: list[str]

    def is_admin(self) -> bool:
        """
        Check if the user has admin privileges.

        Returns:
            bool: True if the user is in the Admin group
        """
        return "Admin" in self.groups

    def is_creating_bot_allowed(self) -> bool:
        """
        Check if the user is allowed to create bots.

        Returns:
            bool: True if the user is an admin or has explicit bot creation permission
        """
        return self.is_admin() or "CreatingBotAllowed" in self.groups

    def is_publish_allowed(self) -> bool:
        """
        Check if the user is allowed to publish bots as APIs.

        Returns:
            bool: True if the user is an admin or has explicit publishing permission
        """
        return self.is_admin() or "PublishAllowed" in self.groups

    def is_chatbotUser(self) -> bool:
        """
        Check if the user has basic chatbot user permissions.

        Returns:
            bool: True if the user is in the ChatbotUser group
        """
        return "ChatbotUser" in self.groups