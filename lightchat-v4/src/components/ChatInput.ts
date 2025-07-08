import { createSvgIcon, ICONS } from '../utils/helpers';

export class ChatInput {
  private element: HTMLDivElement;
  private messageInput: HTMLTextAreaElement;
  private sendButton: HTMLButtonElement;
  private modelSelect: HTMLSelectElement;
  private onSendMessage: (text: string, model: string) => void;

  constructor(containerId: string, onSendMessage: (text: string, model: string) => void) {
    this.onSendMessage = onSendMessage;
    this.element = this.createInputContainer();
    this.messageInput = this.element.querySelector('#message-input') as HTMLTextAreaElement;
    this.sendButton = this.element.querySelector('#send-button') as HTMLButtonElement;
    this.modelSelect = this.element.querySelector('#model-select') as HTMLSelectElement;

    this.attachEventListeners();

    // Append to container - with a small delay to ensure container exists
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container) {
        container.appendChild(this.element);
      } else {
        console.error(`Container with ID ${containerId} not found`);
      }
    }, 0);
  }

  private createInputContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'input-container';
    container.id = 'input-container';
    container.style.display = 'none';

    // Model selector
    const modelSelector = document.createElement('div');
    modelSelector.className = 'model-selector';

    const label = document.createElement('label');
    label.setAttribute('for', 'model-select');
    label.textContent = 'Model:';
    modelSelector.appendChild(label);

    const select = document.createElement('select');
    select.className = 'model-select';
    select.id = 'model-select';

    // Add model options
    const models = [
      { value: 'claude-v3.7-sonnet', text: 'Claude 3.7 Sonnet' },
      { value: 'claude-v3.5-sonnet', text: 'Claude 3.5 Sonnet' },
      { value: 'claude-v3-opus', text: 'Claude 3 Opus' },
      { value: 'claude-v3-sonnet', text: 'Claude 3 Sonnet' },
      { value: 'claude-v3-haiku', text: 'Claude 3 Haiku' },
      { value: 'claude-v2', text: 'Claude 2' },
      { value: 'claude-instant-v1', text: 'Claude Instant' }
    ];

    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.text;
      select.appendChild(option);
    });

    modelSelector.appendChild(select);
    container.appendChild(modelSelector);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'input-area';

    const textarea = document.createElement('textarea');
    textarea.className = 'message-input';
    textarea.id = 'message-input';
    textarea.placeholder = 'Type a message...';
    textarea.rows = 1;
    inputArea.appendChild(textarea);

    const sendButton = document.createElement('button');
    sendButton.className = 'send-button';
    sendButton.id = 'send-button';
    sendButton.disabled = true;
    sendButton.appendChild(createSvgIcon(ICONS.SEND));
    inputArea.appendChild(sendButton);

    container.appendChild(inputArea);

    return container;
  }

  private attachEventListeners(): void {
    // Send message when pressing Enter (without Shift)
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }

      // Update send button state
      this.updateSendButtonState();
    });

    // Update send button state as user types
    this.messageInput.addEventListener('input', () => {
      this.updateSendButtonState();
      this.autoResizeTextarea();
    });

    // Send button click
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });
  }

  private sendMessage(): void {
    const text = this.messageInput.value.trim();
    const model = this.modelSelect.value;

    if (text && !this.isWaitingForResponse()) {
      this.onSendMessage(text, model);
      this.messageInput.value = '';
      this.messageInput.style.height = 'auto';
      this.sendButton.disabled = true;
    }
  }

  private autoResizeTextarea(): void {
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height =
      (this.messageInput.scrollHeight > 120 ? 120 : this.messageInput.scrollHeight) + 'px';
  }

  private updateSendButtonState(): void {
    this.sendButton.disabled =
      this.messageInput.value.trim() === '' || this.isWaitingForResponse();
  }

  /**
   * Toggle waiting state for response
   */
  public setWaitingState(isWaiting: boolean): void {
    this.messageInput.disabled = isWaiting;
    this.sendButton.disabled = isWaiting || this.messageInput.value.trim() === '';
  }

  /**
   * Check if input is in waiting state
   */
  public isWaitingForResponse(): boolean {
    return this.messageInput.disabled;
  }

  /**
   * Show or hide the input container
   */
  public toggle(isVisible: boolean): void {
    this.element.style.display = isVisible ? 'flex' : 'none';
  }

  /**
   * Set focus to the input field
   */
  public focus(): void {
    this.messageInput.focus();
  }
}