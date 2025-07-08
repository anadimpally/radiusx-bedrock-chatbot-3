import { SendMessageRequest, SendMessageResponse, ChatMessage, Conversation, Lead, UserData, MessageFetchResponse } from '../types/types';

export class ApiService {
  private apiBaseUrl: string;
  private apiKey: string;

  constructor(apiBaseUrl: string, apiKey: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Send a new message to the API
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/conversation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Fetch a conversation by ID
   */
  async fetchConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/conversation/${conversationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const conversation = await response.json();

      // Process all messages to ensure thinkingLog is preserved
      if (conversation.messageMap) {
        Object.keys(conversation.messageMap).forEach(messageId => {
          const message = conversation.messageMap[messageId];

          // If the API returns thinkingLog at message level, it's already captured
          if (message.thinkingLog) {
            console.log(`Message ${messageId} has thinking log data`);
          }
        });
      }

      // Initialize citation mappings if needed
      if (!conversation.citationMappings) {
        conversation.citationMappings = {};
      }

      return conversation;
    } catch (error) {
      console.error(`Error fetching conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch a message by conversation ID and message ID
   */
  async fetchMessage(conversationId: string, messageId: string): Promise<MessageFetchResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/conversation/${conversationId}/${messageId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      });

      // If we get a 404, the message is not ready yet (expected during polling)
      if (response.status === 404) {
        console.log('Message not ready yet (404 response) - will retry');
        return { success: false, error: 'message_not_ready', status: 404 };
      }

      // For other error responses
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        return {
          success: false,
          error: `API error: ${response.status} - ${errorText}`,
          status: response.status
        };
      }

      const data = await response.json();

      // Log the response for debugging
      console.log('Message response data:', data);

      // Make sure we capture and preserve thinkingLog if it exists
      if (data.message) {
        // If thinkingLog is present in the response, preserve it
        if (data.message.thinkingLog) {
          console.log('Found thinking log in message response');
        } else if (data.thinkingLog) {
          // Sometimes the thinking log may be at the top level of the response
          data.message.thinkingLog = data.thinkingLog;
          console.log('Found thinking log at top level of response');
        }
      }

      return { success: true, message: data.message || data };

    } catch (error) {
      if (error instanceof Error) {
        console.error('Error fetching message:', error);
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Unknown error' };
    }
  }

  /**
   * Submit lead information to AWS Lambda
   */
  async submitLead(leadData: Lead, conversationId: string | null): Promise<boolean> {
    try {
      // Replace with your actual API Gateway URL from CDK output
      // const apiUrl = 'https://0w2yht7lta.execute-api.us-east-1.amazonaws.com/prod/leads';
      const apiUrl = 'https://xs4dsewvc7.execute-api.us-east-1.amazonaws.com/prod/leads';

      // Get the user ID from the leadData or generate one
      const userId = leadData.userId || this.getUserId();

      // Create a modified lead data that includes the userId
      const enrichedLeadData = {
        ...leadData,
        userId
      };

      console.log('Submitting lead with data:', {
        leadData: enrichedLeadData,
        conversationId
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadData: enrichedLeadData,
          conversationId
        })
      });

      if (!response.ok) {
        console.error('Failed to submit lead data:', await response.text().catch(() => 'No error details available'));
        return false;
      }

      const result = await response.json();
      console.log('Lead submitted successfully:', result);
      return true;
    } catch (error) {
      console.error('Error submitting lead data:', error);
      return false;
    }
  }

  /**
   * Update a lead with an associated conversation ID
   * Call this when a conversationId becomes available
   */
  async updateLeadConversation(leadUserId: string, conversationId: string): Promise<boolean> {
    try {
      // Replace with your actual API Gateway URL from CDK output
      const apiUrl = 'https://xs4dsewvc7.execute-api.us-east-1.amazonaws.com/prod/leads/update-conversation';
      // const apiUrl = 'https://0w2yht7lta.execute-api.us-east-1.amazonaws.com/prod/leads/update-conversation';

      console.log('Updating lead conversation:', { userId: leadUserId, conversationId });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: leadUserId,
          conversationId
        })
      });

      if (!response.ok) {
        console.error('Failed to update lead conversation:', await response.text().catch(() => 'No error details available'));
        return false;
      }

      const result = await response.json();
      console.log('Lead conversation updated successfully:', result);
      return true;
    } catch (error) {
      console.error('Error updating lead conversation:', error);
      return false;
    }
  }

  /**
   * Get the current user ID or create one
   */
  private getUserId(): string {
    // Try to get from local storage
    let userId = localStorage.getItem('chatbot_user_id');

    // If not found, create a new one
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('chatbot_user_id', userId);
    }

    return userId;
  }

  /**
   * Check if a user exists and get their data
   */
  async checkUserExists(userId: string): Promise<UserData | null> {
    try {
      // For local storage approach - this is a fallback in case the Lambda approach is not used
      const userDataJson = localStorage.getItem(`user_${userId}`);
      if (userDataJson) {
        return JSON.parse(userDataJson) as UserData;
      }

      // If no user data is found
      return null;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return null;
    }
  }

  /**
   * Create or update user data
   */
  async updateUserData(userData: UserData): Promise<boolean> {
    try {
      // Store in localStorage as a fallback/cache
      localStorage.setItem(`user_${userData.userId}`, JSON.stringify(userData));

      // You could add a Lambda call here similar to submitLead if you want to store on the server
      // But this is optional and not required for the lead generation functionality

      return true;
    } catch (error) {
      console.error('Error updating user data:', error);
      return false;
    }
  }
}