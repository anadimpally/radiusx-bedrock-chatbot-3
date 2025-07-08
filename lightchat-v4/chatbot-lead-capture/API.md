# API Documentation

This document provides detailed information about the API endpoints available in the Chatbot Lead Capture system.

## Base URL

All API endpoints are relative to:

```
https://{api-id}.execute-api.{region}.amazonaws.com/prod/
```

Where `{api-id}` and `{region}` are specific to your deployment.

## Endpoints

### 1. Create a Lead

Captures lead information from a chatbot conversation.

**URL**: `/leads`  
**Method**: `POST`  
**CORS**: Enabled

#### Request Body

```json
{
  "leadData": {
    "email": "user@example.com",     // Required
    "name": "Jane Doe",              // Optional
    "school": "Example University",  // Optional
    "major": "Computer Science",     // Optional
    "userId": "user123",             // Optional but recommended
    "timestamp": 1678901234567       // Optional, defaults to current time
  },
  "conversationId": "conv123"        // Optional but recommended
}
```

#### Success Response

**Code**: `200 OK`

```json
{
  "message": "Lead captured successfully",
  "leadId": "lead_1678901234567_a1b2c3d",
  "userId": "user123",
  "conversationId": "conv123"
}
```

#### Error Response

**Code**: `400 Bad Request`

```json
{
  "message": "Missing required lead data"
}
```

**Code**: `500 Internal Server Error`

```json
{
  "message": "Error processing lead",
  "error": "Error message details"
}
```

---

### 2. Update Lead Conversation

Associates a new conversation ID with an existing user's lead record.

**URL**: `/leads/update-conversation`  
**Method**: `POST`  
**CORS**: Enabled

#### Request Body

```json
{
  "userId": "user123",         // Required
  "conversationId": "conv456"  // Required
}
```

#### Success Response (New Lead Created)

**Code**: `201 Created`

```json
{
  "message": "New lead created with conversation ID",
  "lead": {
    "leadId": "lead_1678901234567_a1b2c3d",
    "userId": "user123",
    "conversationId": "conv456",
    "conversationIds": ["conv456"],
    "email": "unknown_user123@placeholder.com",
    "timestamp": 1678901234567
  }
}
```

#### Success Response (Existing Lead Updated)

**Code**: `200 OK`

```json
{
  "message": "Lead updated with new conversation ID",
  "lead": {
    "leadId": "lead_1678901234567_a1b2c3d",
    "userId": "user123",
    "conversationId": "conv456",
    "conversationIds": ["conv123", "conv456"],
    "email": "user@example.com",
    "name": "Jane Doe",
    "school": "Example University",
    "major": "Computer Science",
    "timestamp": 1678901234567
  }
}
```

#### Success Response (Conversation Already Tracked)

**Code**: `200 OK`

```json
{
  "message": "Conversation already tracked for this lead",
  "lead": {
    "leadId": "lead_1678901234567_a1b2c3d",
    "userId": "user123",
    "conversationId": "conv456",
    "conversationIds": ["conv123", "conv456"],
    "email": "user@example.com",
    "name": "Jane Doe",
    "school": "Example University",
    "major": "Computer Science",
    "timestamp": 1678901234567
  }
}
```

#### Error Response

**Code**: `400 Bad Request`

```json
{
  "message": "Both userId and conversationId are required"
}
```

**Code**: `500 Internal Server Error`

```json
{
  "message": "Error updating lead conversation",
  "error": "Error message details"
}
```

---

### 3. Get User Conversations

Retrieves all conversations associated with a specific user ID.

**URL**: `/users/{userId}/conversations`  
**Method**: `GET`  
**CORS**: Enabled

#### URL Parameters

- `userId`: The unique identifier for the user

#### Success Response

**Code**: `200 OK`

```json
{
  "userId": "user123",
  "leads": [
    {
      "leadId": "lead_1678901234567_a1b2c3d",
      "userId": "user123",
      "conversationId": "conv456",
      "conversationIds": ["conv123", "conv456"],
      "email": "user@example.com",
      "name": "Jane Doe",
      "school": "Example University",
      "major": "Computer Science",
      "timestamp": 1678901234567
    }
  ],
  "allConversationIds": ["conv123", "conv456"]
}
```

#### Error Response

**Code**: `400 Bad Request`

```json
{
  "message": "UserId is required"
}
```

**Code**: `404 Not Found`

```json
{
  "message": "No leads found for this userId"
}
```

**Code**: `500 Internal Server Error`

```json
{
  "message": "Error retrieving user conversations",
  "error": "Error message details"
}
```

## API Integration Examples

### JavaScript/TypeScript Example

```javascript
// Create a new lead
async function createLead(leadData, conversationId) {
  const response = await fetch('https://your-api-id.execute-api.region.amazonaws.com/prod/leads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      leadData,
      conversationId
    })
  });
  
  return response.json();
}

// Update a lead with a new conversation
async function updateLeadConversation(userId, conversationId) {
  const response = await fetch('https://your-api-id.execute-api.region.amazonaws.com/prod/leads/update-conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId,
      conversationId
    })
  });
  
  return response.json();
}

// Get user conversations
async function getUserConversations(userId) {
  const response = await fetch(`https://your-api-id.execute-api.region.amazonaws.com/prod/users/${userId}/conversations`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
}
```

### Python Example

```python
import requests
import json

API_BASE_URL = "https://your-api-id.execute-api.region.amazonaws.com/prod"

# Create a new lead
def create_lead(lead_data, conversation_id):
    url = f"{API_BASE_URL}/leads"
    payload = {
        "leadData": lead_data,
        "conversationId": conversation_id
    }
    
    response = requests.post(url, json=payload)
    return response.json()

# Update a lead with a new conversation
def update_lead_conversation(user_id, conversation_id):
    url = f"{API_BASE_URL}/leads/update-conversation"
    payload = {
        "userId": user_id,
        "conversationId": conversation_id
    }
    
    response = requests.post(url, json=payload)
    return response.json()

# Get user conversations
def get_user_conversations(user_id):
    url = f"{API_BASE_URL}/users/{user_id}/conversations"
    
    response = requests.get(url)
    return response.json()
```