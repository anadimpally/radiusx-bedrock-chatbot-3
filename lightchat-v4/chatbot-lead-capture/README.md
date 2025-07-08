# Chatbot Lead Capture

A serverless application built with AWS CDK for capturing and managing user information from chatbot conversations.

## Overview

This project implements a complete serverless backend system for capturing and tracking lead information from chatbot interactions. It uses AWS CDK to define the infrastructure, including:

- **DynamoDB Table**: Stores lead information with flexible schema
- **Lambda Functions**: Process lead capture, update conversation tracking, and retrieve user conversation history
- **API Gateway**: RESTful endpoints for interacting with the system

## Features

- **Lead Capture**: Store user information collected during chatbot conversations
- **Conversation Tracking**: Associate multiple conversation IDs with a single user
- **User History**: Retrieve all conversations associated with a specific user ID
- **CORS Support**: Configurable cross-origin resource sharing for frontend integration
- **Serverless Architecture**: Pay-per-use model with AWS Lambda and DynamoDB

## API Endpoints

Once deployed, the API exposes the following endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/leads` | POST | Create a new lead with user information |
| `/leads/update-conversation` | POST | Update a lead with a new conversation ID |
| `/users/{userId}/conversations` | GET | Retrieve all conversations for a user |

## Data Model

The DynamoDB table uses the following schema:

- `leadId` (String): Partition key, unique identifier for each lead
- `email` (String): User's email address, with a GSI for searching
- `userId` (String): Unique identifier for the user, with a GSI for searching
- `name` (String): User's name (optional)
- `school` (String): User's school information (optional)
- `major` (String): User's major/field of study (optional)
- `timestamp` (Number): When the lead was created
- `conversationId` (String): Primary/most recent conversation ID
- `conversationIds` (String Set): All conversation IDs associated with this lead

## Use Cases

This system is designed for scenarios where you need to:

1. Collect and store user information from chatbot interactions
2. Associate multiple chatbot conversations with the same user
3. Retrieve a user's conversation history for context or analytics
4. Build personalized experiences based on user interaction history

## Technology Stack

- **AWS CDK**: Infrastructure as code
- **AWS Lambda**: Serverless compute
- **Amazon DynamoDB**: NoSQL database
- **Amazon API Gateway**: RESTful API endpoints
- **Node.js**: JavaScript runtime