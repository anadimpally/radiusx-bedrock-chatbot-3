// Define the structure of a message content item
export interface MessageContent {
  contentType: string;
  body: string | any; // Allow any to support toolUse and toolResult objects
}

// Define the tool result structure
export interface ToolResult {
  toolUseId: string;
  content: Array<{
    json: {
      source_id: string;
      content: string;
    }
  }>;
  status: string;
}

// Define the thinking log entry structure
export interface ThinkingLogEntry {
  role: string;
  content: MessageContent[];
}

// Define the structure of a chat message
export interface ChatMessage {
  role: 'user' | 'assistant' | 'bot'; // Allow 'bot' for backward compatibility, but normalize to 'assistant' in code
  content: MessageContent[];
  createTime: number;
  id?: string;
  parent?: string;     // Optional parent message ID for threaded conversations
  model?: string;      // Optional model used for this message
  children?: string[]; // Optional array of child message IDs
  feedback?: any;      // Optional feedback data
  usedChunks?: any;    // Optional reference to source information
  thinkingLog?: ThinkingLogEntry[]; // Structured thinking log data
}

// Define lead information structure
export interface Lead {
  name: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  program: string;
  timestamp: number;
  userId: string;
}

// Define the structure of a conversation
export interface Conversation {
  id: string;
  createTime: number;
  title: string;
  messageMap: {
    [messageId: string]: ChatMessage;
  };
  leadInfo?: Lead;    // Optional lead information attached to the conversation
  citationMappings?: {
    [numericRef: string]: string;  // Maps numeric references to tooluse IDs
  };
}

// Define user data structure
export interface UserData {
  userId: string;
  leadInfo?: Lead;
  firstSeen: number;
  lastSeen: number;
  conversationIds: string[];
  hasCompletedLeadForm: boolean;
}

// Define the structure of our app state
export interface ChatbotState {
  conversations: {
    [conversationId: string]: Conversation;
  };
  activeConversationId: string | null;
  isMinimized: boolean;
  isSidebarOpen: boolean;
  isWaitingForResponse: boolean;
  maxRetries: number;
  retryDelay: number;
  initialRetryDelay: number;
  userData: UserData | null;
  showLeadForm: boolean;
}

// Define the message request payload structure
export interface SendMessageRequest {
  conversationId: string | null;
  message: {
    model: string;
    content: MessageContent[];
  };
  continueGenerate: boolean;
}

// Define the message response structure
export interface SendMessageResponse {
  conversationId: string;
  messageId: string;
}

// Define the message fetch response structure
export interface MessageFetchResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
  status?: number;
}

// Define options for the Chatbot constructor
export interface ChatbotOptions {
  apiBaseUrl: string;
  apiKey: string;
}