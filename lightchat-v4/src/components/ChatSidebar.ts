import { Conversation } from '../types/types';
import { getConversationTitle } from '../utils/helpers';

export class ChatSidebar {
  private element: HTMLDivElement;
  private conversationsList: HTMLDivElement;
  private callbacks: {
    onNewChat: () => void;
    onSelectConversation: (conversationId: string) => void;
  };

  constructor(
    containerId: string,
    callbacks: {
      onNewChat: () => void;
      onSelectConversation: (conversationId: string) => void;
    }
  ) {
    this.callbacks = callbacks;
    this.element = this.createSidebar();
    this.conversationsList = this.element.querySelector('#conversations-list') as HTMLDivElement;
    this.attachEventListeners();

    // Append to container - retry with a small delay if not found immediately
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container) {
        // Insert sidebar as the first child of the layout
        if (container.firstChild) {
          container.insertBefore(this.element, container.firstChild);
        } else {
          container.appendChild(this.element);
        }
        console.log('Sidebar appended to container as first child');
      } else {
        console.error(`Container with ID ${containerId} not found`);
      }
    }, 0);
  }

  private createSidebar(): HTMLDivElement {
    const sidebar = document.createElement('div');
    sidebar.className = 'chatbot-sidebar';
    sidebar.id = 'chatbot-sidebar';

    // Create sidebar header
    const sidebarHeader = document.createElement('div');
    sidebarHeader.className = 'sidebar-header';

    // New chat button
    const newChatBtn = document.createElement('button');
    newChatBtn.className = 'new-chat-btn';
    newChatBtn.id = 'new-chat-btn';
    newChatBtn.textContent = 'New Chat';
    sidebarHeader.appendChild(newChatBtn);

    sidebar.appendChild(sidebarHeader);

    // Conversations list container
    const conversationsList = document.createElement('div');
    conversationsList.className = 'conversations-list';
    conversationsList.id = 'conversations-list';
    sidebar.appendChild(conversationsList);

    return sidebar;
  }

  private attachEventListeners(): void {
    const newChatBtn = this.element.querySelector('#new-chat-btn') as HTMLButtonElement;
    if (newChatBtn) {
      newChatBtn.addEventListener('click', this.callbacks.onNewChat);
    }
  }

  /**
   * Update the sidebar with the current conversations
   */
  public updateConversationsList(
    conversations: Record<string, Conversation>,
    activeConversationId: string | null
  ): void {
    this.conversationsList.innerHTML = '';

    const conversationIds = Object.keys(conversations);

    if (conversationIds.length === 0) {
      return;
    }

    // Sort conversations by timestamp (newest first)
    conversationIds.sort((a, b) => {
      return conversations[b].createTime - conversations[a].createTime;
    });

    conversationIds.forEach(conversationId => {
      const conversation = conversations[conversationId];
      const item = document.createElement('div');
      item.classList.add('conversation-item');

      if (conversationId === activeConversationId) {
        item.classList.add('active');
      }

      item.textContent = getConversationTitle(conversation);

      item.addEventListener('click', () => {
        this.callbacks.onSelectConversation(conversationId);
      });

      this.conversationsList.appendChild(item);
    });
  }

  /**
   * Toggle the sidebar visibility
   */
  public toggle(isOpen: boolean): void {
    if (isOpen) {
      this.element.classList.add('active');
    } else {
      this.element.classList.remove('active');
    }
  }
}