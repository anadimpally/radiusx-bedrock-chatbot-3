import { ChatMessage } from '../types/types';
import { formatTimestamp } from '../utils/helpers';

export class ChatMessages {
  private element: HTMLDivElement;
  private emptyState: HTMLDivElement;

  constructor(containerId: string, onStartNewChat: () => void) {
    // Create messages container
    this.element = document.createElement('div');
    this.element.className = 'messages-container';
    this.element.id = 'messages-container';
    this.element.style.display = 'none';

    // Create empty state
    this.emptyState = this.createEmptyState();
    this.emptyState.style.display = 'flex';

    // Add event listener to start chat button
    const startChatBtn = this.emptyState.querySelector('#start-chat-btn') as HTMLButtonElement;
    startChatBtn.addEventListener('click', onStartNewChat);

    // Append both to container - with a small delay to ensure container exists
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container) {
        container.appendChild(this.emptyState);
        container.appendChild(this.element);
      } else {
        console.error(`Container with ID ${containerId} not found`);
      }
    }, 0);
  }

  private createEmptyState(): HTMLDivElement {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.id = 'empty-state';

    // Icon
    const iconContainer = document.createElement('div');
    iconContainer.className = 'empty-state-icon';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '48');
    svg.setAttribute('height', '48');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
    svg.appendChild(path);

    iconContainer.appendChild(svg);
    emptyState.appendChild(iconContainer);

    // Title
    const title = document.createElement('h3');
    title.className = 'empty-state-title';
    title.textContent = 'Welcome to AI Chatbot';
    emptyState.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'empty-state-description';
    description.textContent = 'Start a new conversation or select an existing one from the sidebar.';
    emptyState.appendChild(description);

    // Button
    const startChatBtn = document.createElement('button');
    startChatBtn.className = 'start-chat-btn';
    startChatBtn.id = 'start-chat-btn';
    startChatBtn.textContent = 'Start a new chat';
    emptyState.appendChild(startChatBtn);

    // Info text
    const infoContainer = document.createElement('div');
    infoContainer.style.marginTop = '20px';
    infoContainer.style.fontSize = '12px';
    infoContainer.style.color = 'var(--dark-gray)';

    const infoText = document.createElement('p');
    infoText.textContent = 'Response time: Responses may take 5-10 seconds to generate.';
    infoContainer.appendChild(infoText);

    emptyState.appendChild(infoContainer);

    return emptyState;
  }

  /**
   * Add a message to the chat UI
   */
  public addMessage(message: ChatMessage): void {
    const messageEl = document.createElement('div');
    messageEl.classList.add('message');

    if (message.role === 'user') {
      messageEl.classList.add('user-message');
    } else {
      messageEl.classList.add('bot-message');
    }

    // Handle content (text only for now)
    if (message.content && message.content.length > 0) {
      const content = message.content[0];
      if (content.contentType === 'text') {
        messageEl.textContent = content.body;
      }
    }

    // Add timestamp if available
    if (message.createTime) {
      const timestampEl = document.createElement('span');
      timestampEl.classList.add('timestamp');
      timestampEl.textContent = formatTimestamp(message.createTime);
      messageEl.appendChild(timestampEl);
    }

    this.element.appendChild(messageEl);
    this.scrollToBottom();
  }

  /**
   * Show thinking indicator while waiting for response
   */
  public showThinkingIndicator(): void {
    const thinkingEl = document.createElement('div');
    thinkingEl.classList.add('thinking');
    thinkingEl.id = 'thinking-indicator';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.classList.add('dot');
      thinkingEl.appendChild(dot);
    }

    this.element.appendChild(thinkingEl);
    this.scrollToBottom();
  }

  /**
   * Remove thinking indicator
   */
  public removeThinkingIndicator(): void {
    const thinkingEl = document.getElementById('thinking-indicator');
    if (thinkingEl) {
      thinkingEl.remove();
    }
  }

  /**
   * Clear all messages
   */
  public clearMessages(): void {
    this.element.innerHTML = '';
  }

  /**
   * Scroll to the bottom of the messages container
   */
  public scrollToBottom(): void {
    this.element.scrollTop = this.element.scrollHeight;
  }

  /**
   * Toggle between empty state and messages view
   */
  public toggleView(hasActiveConversation: boolean): void {
    if (hasActiveConversation) {
      this.emptyState.style.display = 'none';
      this.element.style.display = 'flex';
    } else {
      this.emptyState.style.display = 'flex';
      this.element.style.display = 'none';
    }
  }
}