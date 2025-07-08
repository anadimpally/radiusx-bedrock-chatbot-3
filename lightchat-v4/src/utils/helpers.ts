import { Conversation, ChatMessage } from '../types/types';

/**
 * Format a timestamp to display time
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Get a conversation title from the first user message or use default
 */
export function getConversationTitle(conversation: Conversation): string {
  if (conversation && conversation.messageMap) {
    const messages = Object.values(conversation.messageMap);
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage && firstUserMessage.content && firstUserMessage.content.length > 0) {
      const text = firstUserMessage.content[0].body;
      return text.length > 30 ? text.substring(0, 27) + '...' : text;
    }
  }
  return 'New Conversation';
}

/**
 * Save conversations to localStorage
 */
export function saveConversationsToStorage(conversations: Record<string, Conversation>): void {
  try {
    localStorage.setItem('chatbotConversations', JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving conversations to localStorage:', error);
  }
}

/**
 * Load conversations from localStorage with proper typing
 */
export function loadConversationsFromStorage(): Record<string, Conversation> {
  try {
    const savedConversations = localStorage.getItem('chatbotConversations');
    if (!savedConversations) {
      return {};
    }

    // Parse the saved conversations
    const parsedData = JSON.parse(savedConversations) as Record<string, Conversation>;

    // Create a new object with the correct structure
    const validatedConversations: Record<string, Conversation> = {};

    // Process each conversation
    Object.keys(parsedData).forEach(id => {
      const conversation = parsedData[id];

      // Create a properly structured conversation
      validatedConversations[id] = {
        id: conversation.id || id,
        createTime: conversation.createTime || Date.now(),
        title: conversation.title || 'Conversation',
        messageMap: {},
        leadInfo: conversation.leadInfo || undefined
      };

      // Process messages if they exist
      if (conversation.messageMap) {
        // Create a properly typed message map
        const messageMap: Record<string, ChatMessage> = {};

        // Process each message
        Object.keys(conversation.messageMap).forEach(msgId => {
          const msg = conversation.messageMap[msgId];
          if (msg) {
            // Create a properly typed message
            messageMap[msgId] = {
              role: msg.role === 'bot' ? 'assistant' : (msg.role || 'user'),
              content: msg.content || [{ contentType: 'text', body: '' }],
              createTime: msg.createTime || Date.now()
            };
          }
        });

        // Assign the validated message map
        validatedConversations[id].messageMap = messageMap;
      }
    });

    return validatedConversations;
  } catch (error) {
    console.error('Error loading conversations from localStorage:', error);
    return {};
  }
}

/**
 * Create SVG icons
 */
export function createSvgIcon(pathData: string, width = 18, height = 18): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathData);
  svg.appendChild(path);
  return svg;
}

// Icon path data
export const ICONS = {
  CHAT: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  MENU: 'M3 12h18M3 6h18M3 18h18',
  MINIMIZE: 'M5 12h14',
  CLOSE: 'M18 6L6 18M6 6l12 12',
  SEND: 'M22 2L11 13M22 2L15 22 11 13 2 9 22 2'
};

/**
 * Wait for a specified time (Promise-based setTimeout)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get a cookie by name
 */
export function getCookie(name: string): string | null {
  const cookieArr = document.cookie.split(';');
  for (let i = 0; i < cookieArr.length; i++) {
    const cookiePair = cookieArr[i].split('=');
    const cookieName = cookiePair[0].trim();
    if (cookieName === name) {
      return decodeURIComponent(cookiePair[1]);
    }
  }
  return null;
}

/**
 * Set a cookie
 */
export function setCookie(name: string, value: string, daysToExpire: number): void {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysToExpire);
  const cookieValue = encodeURIComponent(value) +
    (daysToExpire ? `; expires=${expirationDate.toUTCString()}` : '') +
    "; path=/; SameSite=Strict";
  document.cookie = `${name}=${cookieValue}`;
}