Here's the full documentation in a format that should be easier to download:

# RadiusX Bedrock Chatbot Documentation

## 1. Overview and Introduction

### 1.1 System Description

The RadiusX Bedrock Chatbot is a SaaS architecture-based RAG (Retrieval-Augmented Generation) chatbot that leverages AWS Amazon Bedrock to provide conversational AI capabilities. The system uses Large Language Models (LLMs) provided by Amazon Bedrock and AWS Knowledgebases for generative AI, specifically tailored for RadiusX.

### 1.2 Key Features

- **Basic Conversation**: Interactive chat interface with streaming responses
- **Bot Personalization**: Add custom instructions and external knowledge (URLs or files)
- **RAG Implementation**: Enhance responses with relevant contextual information
- **Administrator Dashboard**: Manage users, bots, and monitor usage
- **LLM-powered Agent**: Perform complex tasks through natural language instructions
- **Multi-user Support**: Share customized bots among application users
- **API Publication**: Publish customized bots as stand-alone APIs

### 1.3 Technology Stack

- **Frontend**: React-based web application
- **Backend**: Python with FastAPI
- **Infrastructure**: AWS CDK (Cloud Development Kit)
- **LLM Integration**: Amazon Bedrock (Claude, Titan, etc.)
- **Authentication**: Amazon Cognito
- **Database**: DynamoDB
- **Storage**: S3 Buckets
- **Additional Components**: Light Chat Client (v4)

### 1.4 Architecture Diagram

The application follows a typical serverless architecture pattern with the following major components:

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Frontend  │────▶│   API GW/   │────▶│    Backend   │
│  (React UI) │     │ AppSync/ALB │     │ (FastAPI/AWS │
└─────────────┘     └─────────────┘     │   Lambda)    │
                                        └──────┬───────┘
                                               │
                     ┌─────────────────────────┼─────────────────────────┐
                     │                         │                         │
              ┌──────▼──────┐          ┌──────▼──────┐           ┌──────▼──────┐
              │   Amazon    │          │   DynamoDB  │           │     S3      │
              │   Bedrock   │          │  (Chat data │           │  (Document  │
              │   (LLMs)    │          │   storage)  │           │   storage)  │
              └─────────────┘          └─────────────┘           └─────────────┘
                     │
                     │
              ┌──────▼──────┐
              │ AWS Knowledge│
              │    Bases    │
              │  (Vector DB)│
              └─────────────┘
```

## 2. Project Structure

### 2.1 Repository Organization

The repository is organized into several main directories:

- **backend/**: Python FastAPI application for the backend services
- **cdk/**: AWS CDK infrastructure as code
- **docs/**: Documentation files
- **examples/**: Example implementations and use cases
- **frontend/**: React-based web application
- **lightchat-v4/**: Lightweight chat client implementation
- **scripts/**: Utility scripts, including documentation translation

### 2.2 Key Files

- `bin.sh`: Deployment script
- `deploy.yml`: Deployment configuration
- `README.md`: Main project documentation
- `.env`: Environment variables configuration
- `stack_output.txt`: CDK stack outputs

## 3. Backend Documentation

### 3.1 Backend Overview

The backend is built using Python with FastAPI, providing RESTful API endpoints to handle chat conversations, user management, and integration with Amazon Bedrock services.

### 3.2 Setup and Local Development

To set up the backend locally:

1. Deploy necessary resources first using CDK (see Deployment Guide)
2. Create a Python virtual environment using Poetry:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install poetry
poetry install
```

3. Configure the required environment variables:

```bash
export TABLE_NAME=BedrockChatStack-DatabaseConversationTablexxxx
export ACCOUNT=yyyy
export REGION=ap-northeast-1
export BEDROCK_REGION=us-east-1
export DOCUMENT_BUCKET=bedrockchatstack-documentbucketxxxxxxx
export LARGE_MESSAGE_BUCKET=bedrockchatstack-largemessagebucketxxx
export USER_POOL_ID=xxxxxxxxx
export CLIENT_ID=xxxxxxxxx
```

4. Launch the local development server:

```bash
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Access API documentation at:
   - Swagger UI: <http://127.0.0.1:8000/docs>
   - ReDoc: <http://127.0.0.1:8000/redoc>

### 3.3 API Endpoints

The backend provides the following primary API categories:

- Authentication and user management
- Conversation management
- Bot customization and management
- Knowledge base integration
- Document processing

### 3.4 Integration with Amazon Bedrock

The backend uses Amazon Bedrock services for:

- LLM inference using Claude, Titan, or other available models
- Knowledge Base integration for RAG functionality
- Embedding generation for document processing

### 3.5 Database Schema

The application uses DynamoDB tables for storing:

- User conversations and message history
- Customized bot configurations
- Usage statistics and metrics

## 4. Frontend Documentation

### 4.1 Frontend Overview

The frontend is a React-based single-page application that provides the user interface for interacting with the chatbot, managing custom bots, and accessing administrative features.

### 4.2 Key Components

- Chat interface with streaming support
- Bot personalization UI
- Document upload and processing
- User authentication and profile management
- Administrator dashboard

### 4.3 State Management

The application uses a combination of React hooks and context for state management, handling:

- Chat conversations
- User authentication
- UI preferences
- API interactions

### 4.4 API Integration

The frontend communicates with the backend APIs using:

- REST API calls for most operations
- WebSocket connections for real-time streaming responses

## 5. LightChat Client Documentation

### 5.1 LightChat Overview

The LightChat (v4) is a lightweight implementation of the chat interface designed for embedding in third-party applications or for use cases requiring a more streamlined experience.

### 5.2 Integration Options

- JavaScript SDK for web application integration
- API-based integration for backend systems
- Iframe embedding for simple website integration

### 5.3 Customization

The LightChat client supports customization through:

- Theme configuration
- Branding options
- Feature selection
- Predefined instructions and context

### 5.4 Authentication

LightChat supports multiple authentication methods:

- API key-based authentication
- OAuth integration
- Custom authentication providers

## 6. Deployment Guide

### 6.1 Prerequisites

Before deployment, ensure the following prerequisites are met:

1. Enable access to required Bedrock models:
   - In the us-east-1 region: Bedrock Model access > Manage model access
   - Enable: Anthropic/Claude models, Amazon/Nova models, Amazon Titan Text Embeddings V2, and Cohere Embed Multilingual

2. AWS CLI configured with appropriate permissions

### 6.2 Deployment Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/PREDICTif/radiusx-bedrock-chatbot.git
   cd radiusx-bedrock-chatbot
   ```

2. Run the deployment script:

   ```bash
   chmod +x bin.sh
   ./bin.sh
   ```

3. For new users, when prompted, enter `y`

### 6.3 Deployment Options

The deployment script supports several parameters to customize the deployment:

- `--disable-self-register`: Disable self-registration
- `--enable-lambda-snapstart`: Enable Lambda SnapStart for better performance
- `--ipv4-ranges`: Comma-separated list of allowed IPv4 ranges
- `--ipv6-ranges`: Comma-separated list of allowed IPv6 ranges
- `--disable-ipv6`: Disable IPv6 connectivity
- `--allowed-signup-email-domains`: Restrict sign-up to specific email domains
- `--bedrock-region`: Specify the Bedrock region (default: us-east-1)
- `--version`: Specify the version to deploy
- `--cdk-json-override`: Override CDK context values

Example with parameters:

```bash
./bin.sh --disable-self-register --ipv4-ranges "192.0.2.0/25,192.0.2.128/25" --allowed-signup-email-domains "example.com" --bedrock-region "us-west-2"
```

### 6.4 Post-Deployment Configuration

After deployment:

1. Access the admin dashboard using the CloudFormation output URL
2. Create the first admin user through Cognito
3. Configure the default bot settings
4. Set up knowledge bases if using RAG functionality

## 7. Custom Bot Creation

### 7.1 Governance Requirements

For governance reasons, only allowed users can create customized bots. To enable this:

1. The user must be a member of the group called `CreatingBotAllowed`
2. This can be set up via:
   - Amazon Cognito User pools in the management console
   - AWS CLI
3. You can find the user pool id in CloudFormation > BedrockChatStack > Outputs > AuthUserPoolIdxxxx

### 7.2 Bot Customization

Custom bots can be created with:

1. Custom instructions/prompts
2. External knowledge sources:
   - URLs to crawl
   - Document uploads (PDF, DOCX, TXT, etc.)
   - API integrations

### 7.3 Knowledge Base Integration

When creating a RAG-based bot:

1. Upload documents or provide URLs
2. The system will process and embed the content
3. Configure retrieval settings (chunk size, number of chunks, etc.)
4. Test and refine the bot's responses

## 8. Maintenance & Updates

### 8.1 Monitoring

Monitor the application using:

- CloudWatch metrics and logs
- Admin dashboard statistics
- Amazon Cognito user activity

### 8.2 Updates

To update the application:

1. Pull the latest changes from the repository
2. Run the deployment script with the same parameters used initially
3. Check for any breaking changes in the release notes

### 8.3 Backup Strategy

Implement regular backups of:

- DynamoDB tables using AWS Backup
- S3 buckets using cross-region replication
- Cognito user data

### 8.4 Troubleshooting

Common issues and solutions:

- Authentication problems: Check Cognito configuration
- Model access errors: Verify Bedrock model access permissions
- Performance issues: Monitor Lambda cold starts and consider enabling SnapStart

## 9. Security Considerations

### 9.1 Authentication

The application uses Amazon Cognito for user authentication with:

- MFA support
- Custom password policies
- Social identity provider integration (optional)

### 9.2 Authorization

Access control is managed through:

- IAM roles and policies for AWS resources
- Cognito user groups for application-level permissions
- API Gateway authorization for endpoint protection

### 9.3 Data Protection

Data is protected using:

- Encryption at rest for all stored data
- Encryption in transit for all communications
- Secure S3 bucket configurations
- IAM policies limiting access to sensitive data

### 9.4 Content Moderation

LLM outputs are moderated using:

- Amazon Bedrock built-in content filters
- Custom preprocessing and postprocessing logic
- Administrative review capabilities

## 10. Advanced Features

### 10.1 Multi-Bot Support

The system supports multiple bot configurations:

- Shared bots for team/organization use
- Private bots for individual users
- Template bots for quick deployment

### 10.2 API Publication

Customized bots can be published as stand-alone APIs:

- Generate dedicated API endpoints for each bot
- Secure with API keys or other authentication methods
- Implement rate limiting and usage monitoring
- Enable programmatic access for integration with other systems

### 10.3 Multilingual Support

The application provides multilingual support through:

- UI translations for major languages
- LLM support for multiple languages via Amazon Bedrock
- Document processing for non-English content
- Custom bot instructions for language-specific responses

## 11. Technical Deep Dive

### 11.1 CDK Infrastructure

The project uses AWS CDK for infrastructure as code, defining all required AWS resources:

- Authentication: Cognito User Pool and Identity Pool
- Frontend hosting: S3 and CloudFront
- API endpoints: API Gateway and Lambda functions
- Database: DynamoDB tables
- Storage: S3 buckets
- Bedrock integration: IAM roles and policies
- Monitoring: CloudWatch alarms and logs

Key CDK files are located in the `/cdk` directory, organized by resource type and functionality.

### 11.2 Lambda Functions

The application uses various Lambda functions for:

- API request handling
- Document processing
- Bedrock integration
- Authentication and authorization
- Asynchronous tasks

Lambda functions are deployed with appropriate IAM policies, memory allocations, and timeout configurations based on their specific requirements.

### 11.3 WebSocket Implementation

Real-time chat features are implemented using WebSocket connections:

- API Gateway WebSocket APIs
- Connection management via DynamoDB
- Lambda integration for message processing
- Client-side reconnection logic

### 11.4 Vector Database

For RAG functionality, the application uses a vector database:

- Document embeddings generated via Bedrock models
- Efficient similarity search for relevant context retrieval
- Metadata storage for document tracking
- Integration with AWS Knowledgebases

## 12. Performance Optimization

### 12.1 Lambda SnapStart

To improve cold start times for Lambda functions:

- Enable Lambda SnapStart using the `--enable-lambda-snapstart` deployment parameter
- Configure appropriate memory allocations for Lambda functions
- Implement code optimizations for initialization

### 12.2 Frontend Optimizations

The frontend application is optimized for performance:

- Code splitting for reduced bundle size
- Lazy loading of components
- Efficient state management
- CDN distribution via CloudFront

### 12.3 Scaling Considerations

The architecture is designed to scale automatically:

- Serverless components scale based on demand
- DynamoDB auto-scaling for read/write capacity
- API Gateway and Lambda concurrency management
- CloudFront for global content delivery

## 13. Integration Examples

### 13.1 Web Application Integration

Example code for integrating the chatbot into a web application:

```javascript
// Initialize the RadiusX Chatbot client
const chatbotClient = new RadiusXChatbot({
  apiKey: 'YOUR_API_KEY',
  botId: 'YOUR_BOT_ID',
  container: document.getElementById('chatbot-container')
});

// Listen for chat events
chatbotClient.on('message', (message) => {
  console.log('New message:', message);
});

// Send a message
chatbotClient.sendMessage('Hello, how can I help you today?');
```

### 13.2 Backend Integration

Example code for integrating with the chatbot API from a backend service:

```python
import requests

# Configuration
api_endpoint = "https://your-api-gateway-url.amazonaws.com/prod"
api_key = "YOUR_API_KEY"
bot_id = "YOUR_BOT_ID"

# Headers
headers = {
    "Content-Type": "application/json",
    "x-api-key": api_key
}

# Send a message
response = requests.post(
    f"{api_endpoint}/bots/{bot_id}/chat",
    headers=headers,
    json={
        "message": "What services does RadiusX offer?",
        "session_id": "unique-session-id"
    }
)

# Process the response
if response.status_code == 200:
    print("Response:", response.json()["message"])
else:
    print(f"Error: {response.status_code}", response.text)
```

### 13.3 Mobile App Integration

For mobile applications, you can use the API directly or the LightChat client:

```swift
// Swift example for iOS
func sendChatMessage(message: String, botId: String, sessionId: String) {
    let url = URL(string: "https://your-api-gateway-url.amazonaws.com/prod/bots/\(botId)/chat")!
    var request = URLRequest(url: url)

    request.httpMethod = "POST"
    request.addValue("application/json", forHTTPHeaderField: "Content-Type")
    request.addValue("YOUR_API_KEY", forHTTPHeaderField: "x-api-key")

    let body: [String: Any] = [
        "message": message,
        "session_id": sessionId
    ]

    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: request) { data, response, error in
        // Handle response
    }.resume()
}
```

## 14. Customization Guide

### 14.1 Theming

The application supports custom theming through:

- CSS variables for color schemes
- Component styling props
- Custom templates
- White-labeling options

### 14.2 Model Selection

You can customize which Bedrock models are used:

- Configure default models in CDK deployment
- Allow user selection of models (if appropriate)
- Set different models for different types of interactions

### 14.3 Prompt Engineering

Guidelines for effective prompt engineering:

- Use specific and clear instructions
- Include examples when possible
- Structure prompts consistently
- Test and iterate based on response quality

## 15. Troubleshooting

### 15.1 Common Issues

#### Authentication Problems

- Verify Cognito configuration
- Check user pool settings
- Confirm client ID and secret
- Validate token handling in frontend

#### Model Access Errors

- Ensure models are enabled in Bedrock
- Check IAM permissions
- Verify region settings
- Monitor quotas and limits

#### Deployment Failures

- Review CloudFormation logs
- Check IAM permissions
- Validate CDK configuration
- Ensure prerequisites are met

### 15.2 Logging and Debugging

- CloudWatch Logs for Lambda functions
- Frontend console logs
- API Gateway access logs
- DynamoDB streams for data changes

### 15.3 Support Resources

- GitHub Issues for bug reporting
- AWS Support for infrastructure issues
- Documentation for reference
- Community forums for general help

## 16. FAQ

### 16.1 General Questions

**Q: What is the difference between a regular chatbot and a RAG chatbot?**
A: A regular chatbot relies solely on the knowledge encoded in the LLM during training, while a RAG (Retrieval-Augmented Generation) chatbot can access and reference external knowledge sources like documents, websites, or databases to provide more accurate and up-to-date information.

**Q: Can I use my own AWS account for deployment?**
A: Yes, the application is designed to be deployed to your own AWS account, giving you full control over resources and costs.

**Q: What languages are supported?**
A: The application supports multiple languages based on the capabilities of the selected Bedrock models. The UI is available in several languages including English, French, German, Spanish, and more.

### 16.2 Technical Questions

**Q: How is user data stored and protected?**
A: User data is stored in DynamoDB with encryption at rest. All communications use HTTPS, and access is controlled through IAM policies and Cognito authentication.

**Q: Can I deploy in regions where Bedrock is not available?**
A: Yes, you can deploy the application in any region and specify a different region for Bedrock services using the `--bedrock-region` parameter.

**Q: How can I estimate costs?**
A: Costs will vary based on usage, but primary cost factors include Bedrock model inference, Lambda invocations, DynamoDB storage, and S3 storage for documents.

## 17. Glossary

- **Amazon Bedrock**: A fully managed service that offers high-performing foundation models from leading AI companies through a unified API
- **CDK (Cloud Development Kit)**: An open-source software development framework for defining cloud infrastructure in code
- **Claude**: An LLM developed by Anthropic, available through Amazon Bedrock
- **Cognito**: AWS service for user authentication and authorization
- **DynamoDB**: AWS fully managed NoSQL database service
- **FastAPI**: A modern, fast web framework for building APIs with Python
- **LLM (Large Language Model)**: AI models trained on vast amounts of text data that can generate human-like text
- **RAG (Retrieval-Augmented Generation)**: A technique that enhances LLM outputs by retrieving relevant information from external sources
- **S3 (Simple Storage Service)**: AWS object storage service
- **SaaS (Software as a Service)**: A software licensing and delivery model where software is centrally hosted and licensed on a subscription basis


