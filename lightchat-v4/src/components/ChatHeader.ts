import { createSvgIcon, ICONS } from '../utils/helpers';

export class ChatHeader {
  private element: HTMLDivElement;
  private callbacks: {
    onToggleSidebar: () => void;
    onMinimize: () => void;
    onClose: () => void;
  };

  constructor(
    containerId: string,
    callbacks: {
      onToggleSidebar: () => void;
      onMinimize: () => void;
      onClose: () => void;
    }
  ) {
    this.callbacks = callbacks;
    this.element = this.createHeader();
    this.attachEventListeners();

    // Append to container - with a small delay to ensure container exists
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container) {
        // Insert header as the first child (to ensure it's at the top)
        if (container.firstChild) {
          container.insertBefore(this.element, container.firstChild);
        } else {
          container.appendChild(this.element);
        }
        console.log('Header appended to container');
      } else {
        console.error(`Container with ID ${containerId} not found`);
      }
    }, 0);
  }

  private createHeader(): HTMLDivElement {
    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.id = 'chatbot-header';
    header.style.backgroundColor = '#d32f2f';
    header.style.color = 'white';

    // Logo and title
    const logoTitle = document.createElement('div');
    logoTitle.className = 'logo-title';

    const chatIcon = createSvgIcon(ICONS.CHAT, 20, 20);
    logoTitle.appendChild(chatIcon);

    const title = document.createElement('div');
    title.className = 'chatbot-title';
    title.textContent = 'Chatbot';
    logoTitle.appendChild(title);

    header.appendChild(logoTitle);

    // Action buttons container
    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';

    // Toggle sidebar button
    const toggleSidebarBtn = document.createElement('button');
    toggleSidebarBtn.className = 'header-button';
    toggleSidebarBtn.id = 'toggle-sidebar';
    toggleSidebarBtn.appendChild(createSvgIcon(ICONS.MENU));
    headerActions.appendChild(toggleSidebarBtn);

    // Minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'header-button';
    minimizeBtn.id = 'minimize-btn';
    minimizeBtn.appendChild(createSvgIcon(ICONS.MINIMIZE));
    headerActions.appendChild(minimizeBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'header-button';
    closeBtn.id = 'close-btn';
    closeBtn.appendChild(createSvgIcon(ICONS.CLOSE));
    headerActions.appendChild(closeBtn);

    header.appendChild(headerActions);

    return header;
  }

  private attachEventListeners(): void {
    // Get the elements by their IDs
    const toggleSidebarBtn = this.element.querySelector('#toggle-sidebar') as HTMLButtonElement;
    const minimizeBtn = this.element.querySelector('#minimize-btn') as HTMLButtonElement;
    const closeBtn = this.element.querySelector('#close-btn') as HTMLButtonElement;

    // Attach event listeners
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onToggleSidebar();
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', this.callbacks.onMinimize);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', this.callbacks.onClose);
    }

    // Add click handler for the header itself (for restoring from minimized state)
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target === this.element ||
        target.classList.contains('chatbot-title') ||
        target.classList.contains('logo-title')
      ) {
        // This will be handled by the main Chatbot class
        const event = new CustomEvent('headerClick');
        document.dispatchEvent(event);
      }
    });
  }
}