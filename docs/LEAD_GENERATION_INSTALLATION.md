# Installation Guide

Follow these steps to set up and deploy the Chatbot Lead Capture system.

## Prerequisites

Before beginning, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18.x or higher)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- [AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) installed globally (`npm install -g aws-cdk`)

## Setup Steps

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chatbot-lead-capture.git
cd chatbot-lead-capture
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Bootstrap AWS Environment (First time only)

If this is your first time using CDK in this AWS account/region:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

### 4. Create Lambda Function Code Directory

Create a `lambda` directory to store your Lambda function code:

```bash
mkdir -p lambda
```

### 5. Copy Lambda Function Files

Copy the Lambda function files to the lambda directory:

```bash
cp index.js updateLeadConversation.js getUserConversations.js lambda/
```

### 6. Create Lambda Package Dependencies

Create a package.json file in the lambda directory:

```bash
cp package.json lambda/
cd lambda
npm install --production
cd ..
```

### 7. Review/Modify Configuration

Review the infrastructure stack in `lib/chatbot-lead-capture-stack.ts` and make any necessary adjustments to:

- DynamoDB table configuration
- Lambda function settings
- API Gateway configuration
- CORS settings

### 8. Deploy the Stack

```bash
cdk deploy
```

This will display the resources being created and ask for confirmation. After deployment, the API endpoints will be displayed in the terminal output.

## Verification

After deployment, verify your setup:

1. Note the API endpoints from the CDK output
2. Test the API using a tool like Postman or curl:

```bash
# Example: Create a new lead
curl -X POST \
  https://your-api-id.execute-api.region.amazonaws.com/prod/leads \
  -H 'Content-Type: application/json' \
  -d '{
    "leadData": {
      "email": "test@example.com",
      "name": "Test User",
      "userId": "user123",
      "school": "Test University",
      "major": "Computer Science",
      "timestamp": 1678901234567
    },
    "conversationId": "conv123"
  }'
```

## Usage

### Creating a Lead

**Endpoint**: `POST /leads`

**Request Body**:
```json
{
  "leadData": {
    "email": "example@domain.com",
    "name": "John Doe",
    "userId": "user123",
    "school": "Example University",
    "major": "Computer Science"
  },
  "conversationId": "conv123"
}
```

### Updating a Lead with a New Conversation

**Endpoint**: `POST /leads/update-conversation`

**Request Body**:
```json
{
  "userId": "user123",
  "conversationId": "conv456"
}
```

### Retrieving a User's Conversations

**Endpoint**: `GET /users/{userId}/conversations`

Replace `{userId}` with the actual user ID.

## Troubleshooting

- **Deployment Fails**: Ensure AWS credentials are properly configured and you have the necessary permissions.
- **Lambda Errors**: Check CloudWatch Logs for detailed error messages.
- **API Returns 5xx Errors**: Verify Lambda function code and permissions.
- **CORS Issues**: Check API Gateway CORS settings if accessing from a browser.

## Clean Up

To remove all deployed resources:

```bash
cdk destroy
```

Note: The DynamoDB table will be retained by default (as specified in the stack). To fully delete it, modify the removal policy in `lib/chatbot-lead-capture-stack.ts` before running `cdk destroy`.