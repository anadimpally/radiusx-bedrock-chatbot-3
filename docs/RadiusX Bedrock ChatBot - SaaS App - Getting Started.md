# RadiusX Bedrock ChatBot - SaaS App - Getting Started

## Introduction

Welcome to the RadiusX Bedrock ChatBot - SaaS App. This guide will help you get started with using and testing the application, as well as administering it for your organization.

### Accessing the GitHub repository

The GitHub repository is located at:

[https://github.com/PREDICTif/radiusx-bedrock-chatbot](https://github.com/PREDICTif/radiusx-bedrock-chatbot)

### Accessing the application

The application is deployed as a SaaS application, and it is deployed in the AWS account of the customer: ***312686235107***

[https://312686235107-dtcrhm2i.us-east-1.console.aws.amazon.com/console/home?region=us-east-1#](https://312686235107-dtcrhm2i.us-east-1.console.aws.amazon.com/console/home?region=us-east-1#)

You can access the application throught he frontend URL provided during deployment. That is in the output of `BedrockChatStack` Cloudformation stack:

[https://d1zu8256ojgami.cloudfront.net](https://d1zu8256ojgami.cloudfront.net)

When accessing for the first time, you will have to create a user, and you will be asked to verify your email address.

After user is created - in order to get admin rights - you will have to navigate to the AWS Console, and go to Cognito service, and in the Users list, click on your user, and then click on the "Groups" tab. Then click on "Edit User Groups" and select "Admin" group.

Here is the link to the AWS Console Cognito service:

[https://312686235107-dtcrhm2i.us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_PENfFI6PD/user-management/groups?region=us-east-1](https://312686235107-dtcrhm2i.us-east-1.console.aws.amazon.com/cognito/v2/idp/user-pools/us-east-1_PENfFI6PD/user-management/groups?region=us-east-1)

## User Authentication

### Sign-up and Login

1. Access the application using the provided URL
2. You'll be presented with a sign-in screen
3. If you're a new user, click on "Sign up" to create an account
   - Provide your email address and create a password
   - Verify your email through the verification code sent to your email address
4. If you're a returning user, enter your credentials and click "Sign in"

> **Note**: If self-registration has been disabled, contact your administrator to create an account for you.

## Basic Usage

### Starting a Conversation

1. After logging in, you'll see the chat interface
2. Type your message in the input field at the bottom of the screen
3. Press Enter or click the send button to submit your message
4. The LLM will process your message and respond

### Conversation Management

- **View History**: Scroll up to see previous messages in the current conversation
- **Dark/Light Mode**: The application automatically adapts to your system theme

## Advanced Features

### Custom Bots

If you have the necessary permissions (member of the "CreatingBotAllowed" group), you can create personalized bots:

1. Navigate to the bot creation interface
2. Provide instructions for your bot's behavior
3. Add external knowledge through URLs or file uploads (RAG capability)
4. Configure text generation parameters:
   - Max tokens
   - Temperature
   - Top-k, Top-p values

### Using the Agent Functionality

The Agent feature enables more complex tasks by utilizing external tools:

1. In the custom bot screen, navigate to the Agent section
2. Enable desired tools by toggling their switches
3. The default "Internet Search" tool allows the bot to fetch information online
4. When chatting with a bot that has Agent capabilities, it can:
   - Automatically determine when to use knowledge sources
   - Break down complex questions into steps
   - Use enabled tools to gather information

## Administrative Functions

### Accessing Admin Dashboard

To access administrative features, you must be a member of the "Admin" group:

1. Log in with an admin account
2. Navigate to the admin dashboard through the sidebar or menu

### Monitoring Bot Usage

1. From the admin dashboard, view analytics for each bot
2. Sort by usage metrics and time periods
3. Analyze which bots are most popular and how they're being used

### User Analytics

1. View statistics on user engagement and usage
2. Identify heavy users and understand usage patterns
3. Monitor total usage costs per user

### Feedback Analysis

1. Access conversation logs that include user feedback
2. Analyze why certain responses didn't meet user expectations
3. Use insights to improve bot instructions, RAG data sources, or parameters

## Testing Procedures

### Testing Basic Conversation

1. Start a new conversation
2. Send a variety of questions to test response quality
3. Verify that responses are relevant and helpful

### Testing Custom Bots

1. Create a test bot with specific instructions
2. Add test knowledge sources
3. Verify the bot follows instructions and utilizes the knowledge correctly

### Testing Agent Capabilities

1. Enable the Agent functionality in a custom bot
2. Ask questions that require internet search or other tools
3. Verify the Agent properly breaks down tasks and uses the appropriate tools

### Testing Lead Capture

1. Provide test user information during conversations
2. Verify that user data is captured correctly
3. Test multiple conversations with the same user ID to ensure proper tracking

### Accessing Conversation Logs

For detailed analysis, administrators can query conversation logs using Amazon Athena:

1. Open Athena Query Editor from the AWS Management Console
2. Run queries to extract specific conversation data
3. Example query to get conversations for a specific bot:

```sql
SELECT
    d.newimage.PK.S AS UserId,
    d.newimage.SK.S AS ConversationId,
    d.newimage.MessageMap.S AS MessageMap,
    d.newimage.TotalPrice.N AS TotalPrice,
    d.newimage.CreateTime.N AS CreateTime,
    d.newimage.LastMessageId.S AS LastMessageId,
    d.newimage.BotId.S AS BotId,
    d.datehour AS DateHour
FROM
    bedrockchatstack_usage_analysis.ddb_export d
WHERE
    d.newimage.BotId.S = '<your-bot-id>'
    AND d.datehour BETWEEN '<yyyy/mm/dd/hh>' AND '<yyyy/mm/dd/hh>'
    AND d.Keys.SK.S LIKE CONCAT(d.Keys.PK.S, '#CONV#%')
ORDER BY
    d.datehour DESC;
```

## Permissions Overview

The application uses the following permission groups:

- **Admin**: Full administrative access
- **CreatingBotAllowed**: Permission to create custom bots
- **PublishAllowed**: Permission to publish bots as standalone APIs
- **ChatbotUser**: Basic user access

Contact your system administrator if you need to be added to any of these groups for additional permissions.
