import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ChatbotLeadCaptureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB Table
    const leadsTable = new dynamodb.Table(this, 'ChatbotLeadsTable', {
      tableName: 'ChatbotLeads',
      partitionKey: { name: 'leadId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep the table on stack deletion
    });

    // Add email GSI
    leadsTable.addGlobalSecondaryIndex({
      indexName: 'EmailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Add userId GSI for quicker lookups
    leadsTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Create Lambda function for lead capture
    const leadCaptureLambda = new lambda.Function(this, 'LeadCaptureLambda', {
      functionName: 'ChatbotLeadCapture',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: leadsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Create Lambda function for updating lead conversation
    const updateConversationLambda = new lambda.Function(this, 'UpdateConversationLambda', {
      functionName: 'ChatbotUpdateLeadConversation',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'updateLeadConversation.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: leadsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Create Lambda function for getting user conversations
    const getUserConversationsLambda = new lambda.Function(this, 'GetUserConversationsLambda', {
      functionName: 'ChatbotGetUserConversations',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getUserConversations.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: leadsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant all Lambda functions permissions to access DynamoDB
    leadsTable.grantReadWriteData(leadCaptureLambda);
    leadsTable.grantReadWriteData(updateConversationLambda);
    leadsTable.grantReadData(getUserConversationsLambda);

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'LeadCaptureApi', {
      restApiName: 'ChatbotLeadCaptureAPI',
      description: 'API for capturing chatbot leads',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // Add resource and methods for lead capture
    const leadsResource = api.root.addResource('leads');
    leadsResource.addMethod('POST', new apigateway.LambdaIntegration(leadCaptureLambda));

    // Add resource and methods for updating lead conversation
    const updateConversationResource = leadsResource.addResource('update-conversation');
    updateConversationResource.addMethod('POST', new apigateway.LambdaIntegration(updateConversationLambda));

    // Add resource and methods for getting user conversations
    const usersResource = api.root.addResource('users');
    const userIdResource = usersResource.addResource('{userId}');
    const conversationsResource = userIdResource.addResource('conversations');
    conversationsResource.addMethod('GET', new apigateway.LambdaIntegration(getUserConversationsLambda));

    // Output the API URLs
    new cdk.CfnOutput(this, 'LeadCaptureApiUrl', {
      value: `${api.url}leads`,
      description: 'The URL for the lead capture API endpoint',
    });

    new cdk.CfnOutput(this, 'UpdateConversationApiUrl', {
      value: `${api.url}leads/update-conversation`,
      description: 'The URL for updating lead conversation ID',
    });

    new cdk.CfnOutput(this, 'GetUserConversationsApiUrl', {
      value: `${api.url}users/{userId}/conversations`,
      description: 'The URL for retrieving all conversations for a user',
    });
  }
}