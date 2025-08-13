import { ChatbotState, ChatbotOptions, ChatMessage, MessageContent, Lead, UserData, Conversation } from '../types/types';
import { ApiService } from '../services/ApiService';
import { saveConversationsToStorage, loadConversationsFromStorage, createSvgIcon, ICONS, wait, generateUUID, getCookie, setCookie } from '../utils/helpers';
import { LeadForm } from '../components/LeadForm';

export class Chatbot {
  private state: ChatbotState;
  private apiService: ApiService;
  private container: HTMLDivElement;
  private launcher: HTMLDivElement;
  private leadForm: LeadForm | null = null;

  constructor(options: ChatbotOptions) {
    // Initialize API service
    this.apiService = new ApiService(options.apiBaseUrl, options.apiKey);

    // Initialize state
    this.state = {
      conversations: {},
      activeConversationId: null,
      isMinimized: false,
      isSidebarOpen: false,
      isWaitingForResponse: false,
      maxRetries: 10,
      retryDelay: 1500,
      initialRetryDelay: 2000,
      userData: null,
      showLeadForm: false
    };

    // Create DOM elements
    this.container = this.createContainer();
    this.launcher = this.createLauncher();

    // Append to body
    document.body.appendChild(this.container);
    document.body.appendChild(this.launcher);

    // Use direct DOM manipulation for correct structure
    this.ensureCorrectDOMStructure();

    this.injectCitationStyles();
    document.addEventListener('showCitation', ((e: CustomEvent) => {
      this.showCitationPopup(e.detail);
    }) as EventListener);

    document.addEventListener('click', (e) => {
      (window as any).__lastClickPosition = {
        clientX: e.clientX,
        clientY: e.clientY
      };
    });

    // Check for user identification (but don't show anything yet)
    this.checkUserIdentification().then(() => {
      // User identification is complete, but don't show chatbot until user clicks launcher
      console.log('User identification complete, waiting for user to click launcher');
    });

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Check for user identification (cookie or new user)
   */
  private async checkUserIdentification(): Promise<void> {
    // First try to get user ID from localStorage (more reliable for file:// protocol)
    let userId = localStorage.getItem('chatbot_user_id');
    console.log('localStorage userId:', userId);

    // Fallback to cookie if localStorage doesn't have it
    if (!userId) {
      userId = getCookie('chatbot_user_id');
      console.log('Cookie userId:', userId);
    }

    if (userId) {
      // Check localStorage directly
      const userDataKey = `user_${userId}`;
      const rawUserData = localStorage.getItem(userDataKey);
      console.log('Raw user data from localStorage:', rawUserData);
      
      // If we have a user ID, try to fetch user data
      const userData = await this.apiService.checkUserExists(userId);
      console.log('Loaded user data from API service:', userData);

      if (userData) {
        // User exists, update last seen
        this.state.userData = userData;
        userData.lastSeen = Date.now();
        await this.apiService.updateUserData(userData);
        console.log('Returning user identified:', userId, 'hasCompletedLeadForm:', userData.hasCompletedLeadForm);
        return;
      }
    }

    // If we get here, we either don't have a user ID or it wasn't found
    // Create a new user ID and set both cookie and localStorage
    const newUserId = generateUUID();
    setCookie('chatbot_user_id', newUserId, 365); // Set cookie for 1 year
    localStorage.setItem('chatbot_user_id', newUserId); // Also save to localStorage

    // Create new user data
    this.state.userData = {
      userId: newUserId,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      conversationIds: [],
      hasCompletedLeadForm: false
    };

    // Flag to show lead form for new users
    this.state.showLeadForm = true;

    console.log('New user created:', newUserId);
  }

  /**
   * Determine if we should show the lead form
   */
  private shouldShowLeadForm(): boolean {
    return this.state.showLeadForm === true || 
           (!!this.state.userData && 
            !this.state.userData.hasCompletedLeadForm && 
            !this.state.userData.leadInfo);
  }

  /**
   * Show the lead form
   */
  private showLeadForm(): void {
    console.log('Showing lead form');

    // Set state to indicate we're showing the lead form
    this.state.showLeadForm = true;

    // Clear existing content first to prevent duplication
    const mainArea = document.getElementById('chatbot-main');
    if (mainArea) {
      mainArea.innerHTML = '';
    }

    // Create and show the lead form
    this.leadForm = new LeadForm(
      'chatbot-main',
      this.handleLeadSubmit.bind(this),
      this.handleLeadSkip.bind(this)
    );

    // Hide other UI elements
    const emptyState = document.getElementById('empty-state');
    const messagesContainer = document.getElementById('messages-container');
    const inputContainer = document.getElementById('input-container');

    if (emptyState) emptyState.style.display = 'none';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'none';
  }

  /**
   * Handle lead form submission
   */
  private async handleLeadSubmit(leadData: Lead): Promise<void> {
    console.log('Lead form submitted:', leadData);

    if (!this.state.userData) {
      console.error('No user data available');
      return;
    }

    leadData.userId = this.state.userData.userId;

    // Save lead info to user data
    this.state.userData.leadInfo = leadData;
    this.state.userData.hasCompletedLeadForm = true;

    console.log('Updated user data:', this.state.userData);

    // Use the active conversation ID, or if none exists, pass null
    const activeConversationId = this.state.activeConversationId;
    // Upload lead data to API/DynamoDB
    await this.apiService.submitLead(leadData, activeConversationId);

    if (activeConversationId) {
      await this.apiService.updateLeadConversation(leadData.userId, activeConversationId);
    }

    // Update user data in backend
    const updateResult = await this.apiService.updateUserData(this.state.userData);
    console.log('User data update result:', updateResult);

    // Remove the lead form
    if (this.leadForm) {
      this.leadForm.remove();
      this.leadForm = null;
    }

    // Show normal chat interface
    this.state.showLeadForm = false;

    // Ensure DOM structure exists before creating new chat
    this.ensureCorrectDOMStructure();
    this.addEventListeners();

    // Create new chat and send welcome message
    this.createNewChat();

    // Add lead info to the new conversation
    if (this.state.activeConversationId && this.state.conversations[this.state.activeConversationId]) {
      this.state.conversations[this.state.activeConversationId].leadInfo = leadData;
      saveConversationsToStorage(this.state.conversations);
    }

    // Add a small delay before sending welcome message
    setTimeout(() => {
      const welcomeMessage = `Hi ${leadData.name || 'there'}! Thanks for sharing your information. How can I help you today?`;
      this.simulateBotMessage(welcomeMessage);
    }, 500);
  }

  /**
   * Handle lead form skip
   */
  private handleLeadSkip(): void {
    console.log('Lead form skipped');

    if (this.state.userData) {
      // Mark that we've shown the form but user skipped
      this.state.userData.hasCompletedLeadForm = true;
      this.apiService.updateUserData(this.state.userData);
    }

    // Remove the lead form
    if (this.leadForm) {
      this.leadForm.remove();
      this.leadForm = null;
    }

    // Show normal chat interface
    this.state.showLeadForm = false;

    // Ensure DOM structure exists before creating new chat
    this.ensureCorrectDOMStructure();
    this.addEventListeners();

    // Send welcome message if no active conversation
    if (!this.state.activeConversationId) {
      this.createNewChat();

      // Add a small delay before sending welcome message
      setTimeout(() => {
        const welcomeMessage = "Hi there! How can I help you today?";
        this.simulateBotMessage(welcomeMessage);
      }, 500);
    }
  }

  /**
   * Show the empty state
   */
  private showEmptyState(): void {
    const emptyState = document.getElementById('empty-state');
    const messagesContainer = document.getElementById('messages-container');
    const inputContainer = document.getElementById('input-container');

    if (emptyState) emptyState.style.display = 'flex';
    if (messagesContainer) messagesContainer.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'none';
  }
  /**
   * Simulate a bot message (for welcome messages)
   */
  private simulateBotMessage(text: string): void {
    if (!this.state.activeConversationId) {
      return;
    }

    // Create bot message
    const botMessage: ChatMessage = {
      role: 'assistant',
      content: [
        {
          contentType: 'text',
          body: text
        }
      ],
      createTime: Date.now()
    };

    // Add to UI
    this.addMessageToUI(botMessage);

    // Add to conversation
    const botMessageId = 'bot-welcome-' + Date.now();
    const conversation = this.state.conversations[this.state.activeConversationId];
    if (conversation && conversation.messageMap) {
      conversation.messageMap[botMessageId] = botMessage;
    }

    // Save to storage
    saveConversationsToStorage(this.state.conversations);
  }

  /**
   * Create DOM container
   */
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'chatbot-container';
    container.className = 'chatbot-container';
    // Start hidden - user must click launcher to open
    container.style.display = 'none';
    return container;
  }

  /**
   * Create launcher button
   */
  private createLauncher(): HTMLDivElement {
    const launcher = document.createElement('div');
    launcher.id = 'chatbot-launcher';
    // Start visible - user clicks this to open chatbot
    launcher.style.display = 'flex';
    launcher.style.position = 'fixed';
    launcher.style.bottom = '20px';
    launcher.style.right = '20px';
    launcher.style.width = '60px';
    launcher.style.height = '60px';
    launcher.style.borderRadius = '50%';
    launcher.style.backgroundColor = '#d32f2f';
    launcher.style.color = 'white';
    launcher.style.cursor = 'pointer';
    launcher.style.justifyContent = 'center';
    launcher.style.alignItems = 'center';
    launcher.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    launcher.style.zIndex = '999';
    launcher.style.transition = 'all 0.3s ease';

    const chatIcon = createSvgIcon(ICONS.CHAT, 24, 24);
    launcher.appendChild(chatIcon);

    return launcher;
  }

  /**
   * Ensure correct DOM structure by directly manipulating the DOM
   * This bypasses component-based structure for greater control
   */
  private ensureCorrectDOMStructure(): void {
    // Log initial structure
    console.log('Initial DOM structure:', this.container.innerHTML);

    // Clear container first
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Apply container styles (but keep it hidden initially)
    this.container.style.flexDirection = 'column';
    this.container.style.zIndex = '1000';

    // Create header
    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.id = 'chatbot-header';

    // Apply header styles
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.padding = '12px 16px';
    header.style.backgroundColor = '#d32f2f';
    header.style.color = 'white';
    header.style.borderRadius = '8px 8px 0 0';
    header.style.cursor = 'pointer';

    // Logo and title for header
    const logoTitle = document.createElement('div');
    logoTitle.className = 'logo-title';
    logoTitle.style.display = 'flex';
    logoTitle.style.alignItems = 'center';
    logoTitle.style.gap = '10px';

    const chatIcon = createSvgIcon(ICONS.CHAT, 20, 20);
    logoTitle.appendChild(chatIcon);

    const title = document.createElement('div');
    title.className = 'chatbot-title';
    title.textContent = 'Chatbot';
    title.style.fontSize = '16px';
    title.style.fontWeight = '500';
    logoTitle.appendChild(title);

    header.appendChild(logoTitle);

    // Action buttons for header
    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    headerActions.style.display = 'flex';
    headerActions.style.gap = '10px';

    const toggleSidebarBtn = document.createElement('button');
    toggleSidebarBtn.className = 'header-button';
    toggleSidebarBtn.id = 'toggle-sidebar';
    toggleSidebarBtn.style.background = 'none';
    toggleSidebarBtn.style.border = 'none';
    toggleSidebarBtn.style.color = 'white';
    toggleSidebarBtn.style.cursor = 'pointer';
    toggleSidebarBtn.style.fontSize = '18px';
    toggleSidebarBtn.style.display = 'flex';
    toggleSidebarBtn.style.alignItems = 'center';
    toggleSidebarBtn.style.justifyContent = 'center';
    toggleSidebarBtn.style.width = '24px';
    toggleSidebarBtn.style.height = '24px';
    toggleSidebarBtn.style.transition = 'all 0.3s ease';
    toggleSidebarBtn.style.borderRadius = '50%';
    toggleSidebarBtn.appendChild(createSvgIcon(ICONS.MENU));
    toggleSidebarBtn.addEventListener('click', this.toggleSidebar.bind(this));
    headerActions.appendChild(toggleSidebarBtn);

    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'header-button';
    minimizeBtn.id = 'minimize-btn';
    minimizeBtn.style.background = 'none';
    minimizeBtn.style.border = 'none';
    minimizeBtn.style.color = 'white';
    minimizeBtn.style.cursor = 'pointer';
    minimizeBtn.style.fontSize = '18px';
    minimizeBtn.style.display = 'flex';
    minimizeBtn.style.alignItems = 'center';
    minimizeBtn.style.justifyContent = 'center';
    minimizeBtn.style.width = '24px';
    minimizeBtn.style.height = '24px';
    minimizeBtn.style.transition = 'all 0.3s ease';
    minimizeBtn.style.borderRadius = '50%';
    minimizeBtn.appendChild(createSvgIcon(ICONS.MINIMIZE));
    minimizeBtn.addEventListener('click', this.toggleMinimize.bind(this));
    headerActions.appendChild(minimizeBtn);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'header-button';
    closeBtn.id = 'close-btn';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.display = 'flex';
    closeBtn.style.alignItems = 'center';
    closeBtn.style.justifyContent = 'center';
    closeBtn.style.width = '24px';
    closeBtn.style.height = '24px';
    closeBtn.style.transition = 'all 0.3s ease';
    closeBtn.style.borderRadius = '50%';
    closeBtn.appendChild(createSvgIcon(ICONS.CLOSE));
    closeBtn.addEventListener('click', this.closeChatbot.bind(this));
    headerActions.appendChild(closeBtn);

    header.appendChild(headerActions);

    // Create layout container
    const layoutContainer = document.createElement('div');
    layoutContainer.className = 'chatbot-layout';
    layoutContainer.id = 'chatbot-layout';

    // Apply layout styles
    layoutContainer.style.display = 'flex';
    layoutContainer.style.flexDirection = 'row';
    layoutContainer.style.height = 'calc(100% - 59px)';
    layoutContainer.style.position = 'relative';
    layoutContainer.style.overflow = 'hidden';

    // Create sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'chatbot-sidebar';
    sidebar.id = 'chatbot-sidebar';

    // Apply sidebar styles
    sidebar.style.width = '0';
    sidebar.style.minWidth = '0';
    sidebar.style.backgroundColor = '#edf2f7';
    sidebar.style.overflowY = 'auto';
    sidebar.style.borderRight = '1px solid #e2e8f0';
    sidebar.style.transition = 'all 0.3s ease';
    sidebar.style.flexShrink = '0';
    sidebar.style.order = '0';

    // Sidebar content (simplified)
    const sidebarHeader = document.createElement('div');
    sidebarHeader.className = 'sidebar-header';
    sidebarHeader.style.padding = '12px';
    sidebarHeader.style.borderBottom = '1px solid #e2e8f0';
    sidebarHeader.style.display = 'flex';
    sidebarHeader.style.justifyContent = 'space-between';
    sidebarHeader.style.alignItems = 'center';

    const newChatBtn = document.createElement('button');
    newChatBtn.className = 'new-chat-btn';
    newChatBtn.id = 'new-chat-btn';
    newChatBtn.textContent = 'New Chat';
    newChatBtn.style.backgroundColor = '#d32f2f';
    newChatBtn.style.color = 'white';
    newChatBtn.style.border = 'none';
    newChatBtn.style.padding = '8px 12px';
    newChatBtn.style.borderRadius = '4px';
    newChatBtn.style.cursor = 'pointer';
    newChatBtn.style.fontSize = '14px';
    newChatBtn.addEventListener('click', this.createNewChat.bind(this));
    sidebarHeader.appendChild(newChatBtn);

    sidebar.appendChild(sidebarHeader);

    const conversationsList = document.createElement('div');
    conversationsList.className = 'conversations-list';
    conversationsList.id = 'conversations-list';
    conversationsList.style.padding = '8px';
    sidebar.appendChild(conversationsList);

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'chatbot-main';
    mainContainer.id = 'chatbot-main';

    // Apply main container styles
    mainContainer.style.flex = '1';
    mainContainer.style.display = 'flex';
    mainContainer.style.flexDirection = 'column';
    mainContainer.style.height = '100%';
    mainContainer.style.minWidth = '0';
    mainContainer.style.overflow = 'hidden';
    mainContainer.style.order = '1';

    // Create empty state (simplified)
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.id = 'empty-state';
    emptyState.style.display = 'flex';
    emptyState.style.flexDirection = 'column';
    emptyState.style.alignItems = 'center';
    emptyState.style.justifyContent = 'center';
    emptyState.style.height = '100%';
    emptyState.style.padding = '20px';
    emptyState.style.textAlign = 'center';

    const emptyStateTitle = document.createElement('h3');
    emptyStateTitle.className = 'empty-state-title';
    emptyStateTitle.textContent = 'Welcome to AI Chatbot';
    emptyStateTitle.style.fontSize = '18px';
    emptyStateTitle.style.fontWeight = '500';
    emptyStateTitle.style.marginBottom = '8px';
    emptyState.appendChild(emptyStateTitle);

    const emptyStateDesc = document.createElement('p');
    emptyStateDesc.className = 'empty-state-description';
    emptyStateDesc.textContent = 'Start a new conversation or select an existing one from the sidebar.';
    emptyStateDesc.style.fontSize = '14px';
    emptyStateDesc.style.color = '#a0aec0';
    emptyStateDesc.style.marginBottom = '16px';
    emptyState.appendChild(emptyStateDesc);

    const startChatBtn = document.createElement('button');
    startChatBtn.className = 'start-chat-btn';
    startChatBtn.id = 'start-chat-btn';
    startChatBtn.textContent = 'Start a new chat';
    startChatBtn.style.backgroundColor = '#d32f2f';
    startChatBtn.style.color = 'white';
    startChatBtn.style.border = 'none';
    startChatBtn.style.padding = '10px 16px';
    startChatBtn.style.borderRadius = '8px';
    startChatBtn.style.cursor = 'pointer';
    startChatBtn.style.fontSize = '14px';
    startChatBtn.addEventListener('click', this.createNewChat.bind(this));
    emptyState.appendChild(startChatBtn);

    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    messagesContainer.id = 'messages-container';
    messagesContainer.style.flex = '1';
    messagesContainer.style.padding = '16px';
    messagesContainer.style.overflowY = 'auto';
    messagesContainer.style.display = 'none';
    messagesContainer.style.flexDirection = 'column'; // Ensure column display for messages

    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-container';
    inputContainer.id = 'input-container';
    inputContainer.style.padding = '12px';
    inputContainer.style.borderTop = '1px solid #e2e8f0';
    inputContainer.style.display = 'none';

    // Model selector
    const DEFAULT_MODEL = 'claude-v3.5-sonnet';

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'input-area';
    inputArea.style.display = 'flex';
    inputArea.style.gap = '8px';

    const textarea = document.createElement('textarea');
    textarea.className = 'message-input';
    textarea.id = 'message-input';
    textarea.placeholder = 'Type a message...';
    textarea.rows = 1;
    textarea.style.flex = '1';
    textarea.style.border = '1px solid #e2e8f0';
    textarea.style.borderRadius = '8px';
    textarea.style.padding = '10px 14px';
    textarea.style.resize = 'none';
    textarea.style.height = '40px';
    textarea.style.maxHeight = '120px';
    textarea.style.outline = 'none';
    textarea.style.fontSize = '14px';
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = textarea.value.trim();
        if (text && !this.state.isWaitingForResponse) {
          this.sendMessage(text, DEFAULT_MODEL);
          textarea.value = '';
          textarea.style.height = 'auto';
        }
      }
    });

    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight > 120 ? 120 : textarea.scrollHeight) + 'px';
      sendButton.disabled = textarea.value.trim() === '' || this.state.isWaitingForResponse;
    });

    inputArea.appendChild(textarea);

    const sendButton = document.createElement('button');
    sendButton.className = 'send-button';
    sendButton.id = 'send-button';
    sendButton.disabled = true;
    sendButton.style.backgroundColor = '#6b46c1';
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.width = '40px';
    sendButton.style.height = '40px';
    sendButton.style.borderRadius = '8px';
    sendButton.style.cursor = 'pointer';
    sendButton.style.display = 'flex';
    sendButton.style.alignItems = 'center';
    sendButton.style.justifyContent = 'center';

    sendButton.appendChild(createSvgIcon(ICONS.SEND));

    sendButton.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text && !this.state.isWaitingForResponse) {
        this.sendMessage(text, DEFAULT_MODEL);
        textarea.value = '';
        textarea.style.height = 'auto';
        sendButton.disabled = true;
      }
    });

    inputArea.appendChild(sendButton);

    inputContainer.appendChild(inputArea);

    // Add elements to DOM in correct order
    layoutContainer.appendChild(sidebar);
    layoutContainer.appendChild(mainContainer);

    mainContainer.appendChild(emptyState);
    mainContainer.appendChild(messagesContainer);
    mainContainer.appendChild(inputContainer);

    this.container.appendChild(header);
    this.container.appendChild(layoutContainer);

    // Log final structure
    console.log('Final DOM structure:', this.container.innerHTML);
  }

  /**
   * Load conversations from localStorage with better validation
   */
  private loadConversations(): void {
    console.log('Loading conversations from storage...');
    // Load conversations from storage
    const storedConversations = loadConversationsFromStorage();
    console.log('Stored conversations:', storedConversations);

    // Validate and fix each conversation before setting state
    for (const [id, conversation] of Object.entries(storedConversations)) {
      // Ensure conversation has a valid messageMap
      if (!conversation.messageMap) {
        conversation.messageMap = {};
      }

      // Normalize all message roles and times
      const messages = Object.values(conversation.messageMap);
      messages.forEach(msg => {
        // Fix missing createTime
        if (!msg.createTime) {
          msg.createTime = Date.now();
        }

        // Normalize role
        if (msg.role === 'bot') {
          msg.role = 'assistant';
        }
      });

      // Look for the first user message to use as title
      if (!conversation.title || conversation.title.trim() === '' ||
          conversation.title === 'Conversation' || conversation.title === 'New Conversation') {

        // Sort messages by timestamp
        messages.sort((a, b) => (a.createTime || 0) - (b.createTime || 0));

        // Find first user message
        const firstUserMessage = messages.find(msg => msg.role === 'user');

        if (firstUserMessage && firstUserMessage.content && firstUserMessage.content.length > 0) {
          const text = firstUserMessage.content[0].body;
          conversation.title = text.length > 30 ? text.substring(0, 27) + '...' : text;
        } else {
          conversation.title = 'Conversation';
        }
      }
    }

    // Set the validated conversations to state
    this.state.conversations = storedConversations;

    // Check if we have any conversations
    const hasConversations = Object.keys(this.state.conversations).length > 0;
    console.log('Has conversations:', hasConversations);

    if (hasConversations) {
      // Set the most recent conversation as active
      const mostRecentId = Object.keys(this.state.conversations).sort((a, b) => {
        return this.state.conversations[b].createTime - this.state.conversations[a].createTime;
      })[0];
      
      console.log('Most recent conversation ID:', mostRecentId);

      // Update the UI before setting active conversation
      this.updateConversationsList();

      // Set active conversation
      this.setActiveConversation(mostRecentId);
    } else {
      console.log('No conversations found, showing empty state');
      // Show empty state
      const emptyState = document.getElementById('empty-state');
      const messagesContainer = document.getElementById('messages-container');
      const inputContainer = document.getElementById('input-container');

      if (emptyState) emptyState.style.display = 'flex';
      if (messagesContainer) messagesContainer.style.display = 'none';
      if (inputContainer) inputContainer.style.display = 'none';
    }

    // Update userData with conversation IDs
    if (this.state.userData) {
      this.state.userData.conversationIds = Object.keys(this.state.conversations);
      // No need to await here, update in background
      this.apiService.updateUserData(this.state.userData);
    }
  }

  /**
   * Add event listeners with proper TypeScript event types
   */
  private addEventListeners(): void {
    // Launcher click event to open/restore chatbot
    this.launcher.addEventListener('click', () => {
      console.log('Launcher clicked, isMinimized:', this.state.isMinimized);
      
      // If chatbot is minimized, restore it
      if (this.state.isMinimized) {
        console.log('Restoring minimized chatbot');
        this.container.style.display = 'flex';
        this.container.classList.remove('minimized');
        this.container.style.height = '600px';
        this.container.style.overflow = 'hidden';
        this.launcher.style.display = 'none';
        this.state.isMinimized = false;
      } else {
        // If chatbot is closed, open it
        console.log('Opening closed chatbot');
        this.container.style.display = 'flex';
        this.container.classList.remove('minimized');
        this.container.style.height = '600px';
        this.container.style.overflow = 'hidden';
        this.launcher.style.display = 'none';
        this.state.isMinimized = false;

        // Check if we should show lead form or load conversations
        if (this.shouldShowLeadForm()) {
          this.showLeadForm();
        } else {
          this.loadConversations();
        }
      }
    });

    // Container click event for when minimized (the minimized container itself becomes clickable)
    this.container.addEventListener('click', (e) => {
      // Only handle clicks when minimized and not on header buttons
      if (this.state.isMinimized) {
        const target = e.target as HTMLElement;
        // Don't restore if clicking on header buttons (minimize, close, etc.)
        if (!target.closest('.header-actions') && !target.closest('.header-button')) {
          console.log('Minimized container clicked, restoring chatbot');
          this.container.style.display = 'flex';
          this.container.classList.remove('minimized');
          this.container.style.height = '600px';
          this.container.style.overflow = 'hidden';
          this.launcher.style.display = 'none';
          this.state.isMinimized = false;
        }
      }
    });

    // Header click event (for restoring from minimized)
    const header = document.getElementById('chatbot-header');
    if (header) {
      header.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (
          target === header ||
          target.classList.contains('chatbot-title') ||
          target.classList.contains('logo-title') ||
          target.parentElement?.classList.contains('logo-title')
        ) {
          if (this.state.isMinimized) {
            this.container.classList.remove('minimized');
            this.container.style.height = '600px';
            this.container.style.overflow = 'hidden';
            this.state.isMinimized = false;
          }
        }
      });
    }

    // Track mouse position for citation popup positioning
    document.addEventListener('click', (e: MouseEvent) => {
      // Store the click position for later use when showing popups
      (window as any).__lastClickPosition = {
        clientX: e.clientX,
        clientY: e.clientY
      };
    });

    // Setup citation event listener
    document.addEventListener('showCitation', ((e: CustomEvent) => {
      this.showCitationPopup(e.detail);
    }) as EventListener);
  }

  /**
   * Toggle sidebar visibility
   */
  private toggleSidebar(): void {
    console.log('Toggling sidebar');
    this.state.isSidebarOpen = !this.state.isSidebarOpen;

    // Get sidebar element directly
    const sidebar = document.getElementById('chatbot-sidebar');
    if (sidebar) {
      if (this.state.isSidebarOpen) {
        sidebar.style.width = '180px';
        sidebar.style.minWidth = '180px';
      } else {
        sidebar.style.width = '0';
        sidebar.style.minWidth = '0';
      }
    }
  }

  /**
   * Toggle minimize/maximize state
   */
  private toggleMinimize(): void {
    if (this.state.isMinimized) {
      // Currently minimized, so maximize
      console.log('Maximizing chatbot');
      this.state.isMinimized = false;
      this.container.classList.remove('minimized');
      this.container.style.height = '600px';
      this.container.style.overflow = 'hidden';
      this.launcher.style.display = 'none';
      console.log('Chatbot maximized, isMinimized:', this.state.isMinimized);
    } else {
      // Currently maximized, so minimize
      console.log('Minimizing chatbot');
      this.state.isMinimized = true;
      this.container.classList.add('minimized');
      this.container.style.height = '60px';
      this.container.style.overflow = 'hidden';
      this.launcher.style.display = 'flex';
      console.log('Chatbot minimized, isMinimized:', this.state.isMinimized);
    }
  }

  /**
   * Minimize the chatbot
   */
  private minimizeChatbot(): void {
    console.log('Minimizing chatbot');
    this.state.isMinimized = true;
    this.container.classList.add('minimized');
    this.container.style.height = '60px';
    this.container.style.overflow = 'hidden';
    this.launcher.style.display = 'flex';
    console.log('Chatbot minimized, isMinimized:', this.state.isMinimized);
  }

  /**
   * Close the chatbot completely
   */
  private closeChatbot(): void {
    this.container.style.display = 'none';
    this.launcher.style.display = 'flex';
  }



  /**
   * Update the sidebar with the current conversations
   */
  private updateConversationsList(): void {
    const conversationsList = document.getElementById('conversations-list');
    if (!conversationsList) return;

    conversationsList.innerHTML = '';

    const conversationIds = Object.keys(this.state.conversations);

    if (conversationIds.length === 0) {
      return;
    }

    // Sort conversations by timestamp (newest first)
    conversationIds.sort((a, b) => {
      return this.state.conversations[b].createTime - this.state.conversations[a].createTime;
    });

    conversationIds.forEach(conversationId => {
      const conversation = this.state.conversations[conversationId];

      // Ensure valid title
      this.ensureValidTitle(conversationId);

      const item = document.createElement('div');
      item.classList.add('conversation-item');
      item.dataset.id = conversationId; // Store ID in dataset for easier reference

      if (conversationId === this.state.activeConversationId) {
        item.classList.add('active');
      }

      // Style the conversation item
      item.style.padding = '10px';
      item.style.borderRadius = '4px';
      item.style.marginBottom = '4px';
      item.style.cursor = 'pointer';
      item.style.transition = 'all 0.3s ease';
      item.style.whiteSpace = 'nowrap';
      item.style.overflow = 'hidden';
      item.style.textOverflow = 'ellipsis';
      item.style.fontSize = '14px';

      if (conversationId === this.state.activeConversationId) {
        item.style.backgroundColor = '#e2e8f0';
        item.style.fontWeight = '500';
      }

      // Get the title with a fallback
      const title = conversation.title || 'Conversation';
      item.textContent = title;

      item.addEventListener('click', () => {
        this.setActiveConversation(conversationId);
      });

      conversationsList.appendChild(item);
    });

    // Update user data with conversation IDs
    if (this.state.userData) {
      this.state.userData.conversationIds = conversationIds;
      // Update in background
      this.apiService.updateUserData(this.state.userData);
    }
  }

  /**
   * Ensure a conversation has a valid title
   */
  private ensureValidTitle(conversationId: string): void {
    const conversation = this.state.conversations[conversationId];
    if (!conversation) return;

    // If the conversation already has a valid title, no need to change
    if (conversation.title &&
        conversation.title !== 'New Conversation' &&
        conversation.title !== 'Conversation' &&
        conversation.title.trim() !== '') {
      return;
    }

    // Get all messages from the conversation
    const messages = Object.values(conversation.messageMap || {});

    // If no messages, can't extract a title
    if (messages.length === 0) return;

    // Sort the messages by createTime
    messages.sort((a, b) => (a.createTime || 0) - (b.createTime || 0));

    // Find the first user message
    const userMessages = messages.filter(msg => msg.role === 'user');

    if (userMessages.length > 0) {
      // Get the first user message
      const firstUserMessage = userMessages[0];

      if (firstUserMessage.content && firstUserMessage.content.length > 0) {
        const text = firstUserMessage.content[0].body;
        if (text) {
          conversation.title = text.length > 30 ? text.substring(0, 27) + '...' : text;

          // Save the updated conversation
          saveConversationsToStorage(this.state.conversations);
        }
      }
    }
  }

  /**
   * Set active conversation and render messages with optimized fetching
   */
  public setActiveConversation(conversationId: string): void {
    // Skip if already active
    if (this.state.activeConversationId === conversationId) {
      return;
    }

    console.log(`Setting active conversation to ${conversationId}`);

    // Store the current active conversation properly before switching
    if (this.state.activeConversationId) {
      const currentConversation = this.state.conversations[this.state.activeConversationId];
      if (currentConversation) {
        // Make sure we save it to localStorage before switching
        saveConversationsToStorage(this.state.conversations);
      }
    }

    // Update active conversation ID
    this.state.activeConversationId = conversationId;

    // Update UI states
    const emptyState = document.getElementById('empty-state');
    const messagesContainer = document.getElementById('messages-container');
    const inputContainer = document.getElementById('input-container');

    if (emptyState) emptyState.style.display = 'none';
    if (messagesContainer) {
      messagesContainer.style.display = 'flex';
      messagesContainer.innerHTML = ''; // Clear current messages
    }
    if (inputContainer) inputContainer.style.display = 'flex';

    // Make sure we have a conversation object with message map
    if (!this.state.conversations[conversationId]) {
      // If conversation doesn't exist at all, create a new one
      this.state.conversations[conversationId] = {
        id: conversationId,
        createTime: Date.now(),
        title: 'New Conversation',
        messageMap: {}
      };

      // If user has lead info, add it to the conversation
      if (this.state.userData && this.state.userData.leadInfo) {
        this.state.conversations[conversationId].leadInfo = this.state.userData.leadInfo;
      }

    } else if (!this.state.conversations[conversationId].messageMap) {
      // If messageMap doesn't exist, initialize it
      this.state.conversations[conversationId].messageMap = {};
    }

    // Check if we need to fetch from server
    const hasMessages = Object.keys(this.state.conversations[conversationId].messageMap).length > 0;
    const needsFetching = !hasMessages; // Only fetch if there are no messages

    // Immediately render whatever we have
    this.renderMessages();

    // Only fetch from server if absolutely necessary (empty conversation)
    if (needsFetching) {
      this.fetchConversation(conversationId).then(() => {
        console.log("Fetched conversation from server");
        // After fetching, update the conversation title if needed
        this.ensureValidTitle(conversationId);
        this.renderMessages();
        this.updateConversationsList();
      }).catch(err => {
        console.error('Error fetching conversation:', err);
      });
    } else {
      // Make sure the title is valid
      this.ensureValidTitle(conversationId);
      this.updateConversationsList();
    }

    // Focus on the input
    const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
    if (messageInput) {
      messageInput.value = ''; // Clear any previous input
      messageInput.focus();
    }

    // Update user data with active conversation
    if (this.state.userData) {
      // If this conversation ID isn't already in the user's list, add it
      if (!this.state.userData.conversationIds.includes(conversationId)) {
        this.state.userData.conversationIds.push(conversationId);
        this.apiService.updateUserData(this.state.userData);
      }
    }
  }

  /**
   * Create a new chat with proper UI reset
   */
  public createNewChat(): void {
    console.log('Creating new chat');

    // If lead form should be shown, show it instead of creating a new chat
    if (this.shouldShowLeadForm()) {
      this.showLeadForm();
      return;
    }

    // Generate new conversation ID
    const newConversationId = generateUUID();

    // Create new conversation object with lead info if available
    const newConversation: Conversation = {
      id: newConversationId,
      createTime: Date.now(),
      title: 'New Conversation',
      messageMap: {}
    };

    // Add lead info if available
    if (this.state.userData && this.state.userData.leadInfo) {
      newConversation.leadInfo = this.state.userData.leadInfo;
    }

    // Add to conversations map
    this.state.conversations[newConversationId] = newConversation;

    // Save to storage
    saveConversationsToStorage(this.state.conversations);

    // Set as active conversation
    this.state.activeConversationId = newConversationId;

    // Update UI states
    const emptyState = document.getElementById('empty-state');
    const messagesContainer = document.getElementById('messages-container');
    const inputContainer = document.getElementById('input-container');

    if (emptyState) emptyState.style.display = 'none';
    if (messagesContainer) {
      messagesContainer.style.display = 'flex';
      messagesContainer.innerHTML = ''; // Clear messages
    }
    if (inputContainer) inputContainer.style.display = 'flex';

    // Update sidebar
    this.updateConversationsList();

    // Focus on the input
    const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
    if (messageInput) {
      messageInput.value = ''; // Clear any previous input
      messageInput.focus();
    }

    // Update user data
    if (this.state.userData) {
      this.state.userData.conversationIds.push(newConversationId);
      this.apiService.updateUserData(this.state.userData);
    }
  }

  /**
   * Render messages for the active conversation
   */
  private renderMessages(): void {
    console.log('renderMessages called');
    const messagesContainer = document.getElementById('messages-container');
    console.log('messagesContainer found:', !!messagesContainer);
    
    if (!messagesContainer) {
      console.log('No messages container found, returning');
      return;
    }

    // Clear the messages container first
    messagesContainer.innerHTML = '';

    if (!this.state.activeConversationId || !this.state.conversations[this.state.activeConversationId]) {
      console.log('No active conversation or conversation not found');
      return;
    }

    const conversation = this.state.conversations[this.state.activeConversationId];
    const messageMap = conversation.messageMap;
    console.log('Message map keys:', Object.keys(messageMap || {}));

    if (!messageMap || Object.keys(messageMap).length === 0) {
      console.log('No messages in conversation');
      return;
    }

    // Get messages and convert to array
    const messages = Object.values(messageMap);

    // Ensure all messages have valid properties
    messages.forEach(msg => {
      // Ensure createTime exists
      if (!msg.createTime) {
        msg.createTime = Date.now();
      }

      // Ensure role is either 'user' or 'assistant'
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        // Map bot/ai/assistant to 'assistant' for consistency
        if (['bot', 'ai', 'claude'].includes(msg.role)) {
          msg.role = 'assistant';
        } else {
          // Default unknown roles to user
          msg.role = 'user';
        }
      }
    });

    // Sort messages strictly by timestamp (oldest first)
    messages.sort((a, b) => (a.createTime || 0) - (b.createTime || 0));

    // Simply render all messages in timestamp order without filtering
    // This ensures we show all messages in the conversation
    messages.forEach(message => {
      this.addMessageToUI(message);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  private addMessageToUI(message: ChatMessage): void {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    // Skip if we somehow don't have a valid message
    if (!message || !message.content || message.content.length === 0) {
      console.error('Attempted to add invalid message to UI', message);
      return;
    }

    const messageEl = document.createElement('div');
    messageEl.classList.add('message');

    // Apply base message styles
    messageEl.style.maxWidth = '80%';
    messageEl.style.padding = '10px 14px';
    messageEl.style.borderRadius = '18px';
    messageEl.style.fontSize = '14px';
    messageEl.style.lineHeight = '1.4';
    messageEl.style.position = 'relative';
    messageEl.style.whiteSpace = 'pre-wrap'; // This preserves whitespace and line breaks
    messageEl.style.marginBottom = '12px'; // Add space between messages

    // Normalize role for consistent rendering
    const role = message.role === 'bot' ? 'assistant' : message.role;

    if (role === 'user') {
      messageEl.classList.add('user-message');
      messageEl.style.alignSelf = 'flex-end';
      messageEl.style.backgroundColor = '#e0e7ff';
      messageEl.style.borderBottomRightRadius = '4px';
      messageEl.style.color = '#2d3748';
      messageEl.style.marginLeft = 'auto'; // Push to right
      messageEl.style.marginRight = '0'; // Push to right

      // For user messages, just set the text content
      const content = message.content[0];
      if (content.contentType === 'text') {
        messageEl.textContent = content.body;
      }
    } else {
      // For assistant messages, process formatting and handle citations
      messageEl.classList.add('assistant-message');
      messageEl.style.alignSelf = 'flex-start';
      messageEl.style.backgroundColor = '#f5f5f5';
      messageEl.style.borderBottomLeftRadius = '4px';
      messageEl.style.marginLeft = '0'; // Push to left
      messageEl.style.marginRight = 'auto'; // Push to left

      // Handle content with improved formatting and citation handling
      const content = message.content[0];
      if (content.contentType === 'text') {
        let messageText = content.body;

        // Convert URLs to clickable links first
        messageText = this.convertUrlsToLinks(messageText);
        
        // Process citation references - replace with clickable spans
        messageText = this.processCitationReferences(messageText, message);

        // Check if message is too long and add read more functionality
        const maxLength = 500; // Show first 500 characters
        if (messageText.length > maxLength) {
          // Truncate the processed text (which already has URLs converted)
          const shortText = messageText.substring(0, maxLength) + '...';
          const fullText = messageText;
          
          // Create container for the message content
          const contentContainer = document.createElement('div');
          contentContainer.innerHTML = shortText;
          
          // Create read more button
          const readMoreBtn = document.createElement('button');
          readMoreBtn.textContent = 'Read more';
          readMoreBtn.style.background = 'none';
          readMoreBtn.style.border = 'none';
          readMoreBtn.style.color = '#6b46c1';
          readMoreBtn.style.cursor = 'pointer';
          readMoreBtn.style.fontSize = '12px';
          readMoreBtn.style.padding = '4px 0';
          readMoreBtn.style.marginTop = '8px';
          readMoreBtn.style.textDecoration = 'underline';
          
          // Track if content is expanded
          let isExpanded = false;
          
          // Add click event to toggle between short and full text
          readMoreBtn.addEventListener('click', () => {
            if (!isExpanded) {
              contentContainer.innerHTML = fullText;
              readMoreBtn.textContent = 'Read less';
              isExpanded = true;
            } else {
              contentContainer.innerHTML = shortText;
              readMoreBtn.textContent = 'Read more';
              isExpanded = false;
            }
          });
          
          // Clear the message element and add content
          messageEl.innerHTML = '';
          messageEl.appendChild(contentContainer);
          messageEl.appendChild(readMoreBtn);
        } else {
          // Set the processed HTML content for short messages
          messageEl.innerHTML = messageText;
        }
      }
    }

    // Add timestamp if available
    if (message.createTime) {
      const timestampEl = document.createElement('span');
      timestampEl.classList.add('timestamp');
      timestampEl.textContent = this.formatTimestamp(message.createTime);
      timestampEl.style.fontSize = '10px';
      timestampEl.style.color = '#a0aec0';
      timestampEl.style.marginTop = '4px';
      timestampEl.style.display = 'block';
      messageEl.appendChild(timestampEl);
    }

    // Make sure the container has the right styles for message alignment
    messagesContainer.style.display = 'flex';
    messagesContainer.style.flexDirection = 'column';

    messagesContainer.appendChild(messageEl);

    // Scroll to the bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Convert URLs in text to clickable HTML links
   */
  private convertUrlsToLinks(text: string): string {
    console.log('Converting URLs in text:', text);
    
    // URL regex patterns
    const urlPatterns = [
      // HTTP/HTTPS URLs
      /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g,
      // WWW URLs (without protocol)
      /(www\.[^\s<]+[^<.,:;"')\]\s])/g,
      // Email addresses
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ];

    let processedText = text;

    // Process each URL pattern
    urlPatterns.forEach(pattern => {
      processedText = processedText.replace(pattern, (match) => {
        console.log('Found URL match:', match);
        let url = match;
        
        // Add protocol if missing (for www URLs)
        if (url.startsWith('www.')) {
          url = 'https://' + url;
        }
        
        // Add mailto: for email addresses
        if (url.includes('@')) {
          url = 'mailto:' + url;
        }

        const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #d32f2f; text-decoration: underline;">${match}</a>`;
        console.log('Generated link HTML:', linkHtml);
        return linkHtml;
      });
    });

    console.log('Final processed text:', processedText);
    return processedText;
  }

  /**
   * Process citation references in message text and make them clickable
   */
  // Update the processCitationReferences method to include source_url attribute
private processCitationReferences(text: string, message: ChatMessage): string {
  // Get the active conversation
  const conversation = this.state.activeConversationId
    ? this.state.conversations[this.state.activeConversationId]
    : null;

  if (!conversation) {
    return text;
  }

  // Ensure citation mappings exist
  if (!conversation.citationMappings) {
    conversation.citationMappings = {};
  }

  // Process direct tooluse citations
  let processedText = text.replace(/\[\^(tooluse_[a-zA-Z0-9_-]+@\d+)\]/g, (match, referenceId) => {
    // Create a unique ID for this citation
    const citationId = `citation-${referenceId.replace(/[@.]/g, '-')}`;

    // Store in mappings if not already there
    let numericRef = '';

    // Safely iterate over the citation mappings
    const citationMappings = conversation.citationMappings || {};
    for (const [num, id] of Object.entries(citationMappings)) {
      if (id === referenceId) {
        numericRef = num;
        break;
      }
    }

    if (!numericRef) {
      // Find next available number
      const keys = Object.keys(citationMappings);
      const nums = keys.map(k => parseInt(k)).filter(n => !isNaN(n));
      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      numericRef = nextNum.toString();
      conversation.citationMappings![numericRef] = referenceId;
      saveConversationsToStorage(this.state.conversations);
    }

    // Create a link icon with the data-reference attribute
    return `<span class="citation-reference" id="${citationId}" 
      data-reference="${referenceId}">
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    </span>`;
  });

  // Process numeric citations as well
  processedText = processedText.replace(/\[\^(\d+)\]/g, (match, numericRef) => {
    const citationMappings = conversation.citationMappings || {};
    const referenceId = citationMappings[numericRef];
    if (referenceId) {
      const citationId = `citation-${referenceId.replace(/[@.]/g, '-')}-${numericRef}`;
      // Create a link icon
      return `<span class="citation-reference" id="${citationId}" 
        data-reference="${referenceId}">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
      </span>`;
    }
    return match; // No mapping, keep as is
  });

  return processedText;
}

  /**
   * Method to inject CSS styles for citation references and popup
   */
  private injectCitationStyles(): void {
    // Create style element if it doesn't exist
    if (!document.getElementById('citation-styles')) {
      const style = document.createElement('style');
      style.id = 'citation-styles';
      style.textContent = `
        /* Citation reference buttons */
        .citation-reference {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #4267B2;
          margin: 0 2px;
          padding: 2px;
          border-radius: 3px;
          cursor: pointer;
          background-color: rgba(66, 103, 178, 0.1);
        }
        
        .citation-reference:hover {
          background-color: rgba(66, 103, 178, 0.2);
        }
        
        /* Citation popup styling */
        #citation-popup {
          position: fixed;
          z-index: 2000;
          max-width: 400px;
          width: auto;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 12px 16px;
          font-size: 14px;
          max-height: 300px;
          overflow-y: auto;
          color: #2d3748;
          cursor: move;
        }
        
        #citation-popup .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
          margin-bottom: 8px;
          cursor: move;
        }
        
        #citation-popup .popup-title {
          font-weight: bold;
          margin: 0;
          padding-right: 24px;
        }
        
        #citation-popup .popup-source-url {
          margin-bottom: 10px;
          padding: 6px;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
        
        #citation-popup .popup-source-url a {
          color: #4267B2;
          text-decoration: none;
          font-weight: 500;
          display: flex;
          align-items: center;
        }
        
        #citation-popup .popup-source-url a:hover {
          text-decoration: underline;
        }
        
        #citation-popup .popup-content {
          color: #4a5568;
          line-height: 1.5;
          white-space: pre-line;
        }
        
        #citation-popup .close-button {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          color: #a0aec0;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        
        #citation-popup .close-button:hover {
          background-color: #f7fafc;
          color: #718096;
        }
      `;
      document.head.appendChild(style);

      // Add click event listener to handle citation references
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const citationRef = target.closest('.citation-reference');

        if (citationRef) {
          e.preventDefault();
          e.stopPropagation();
          const referenceId = citationRef.getAttribute('data-reference');
          if (referenceId) {
            this.showCitationPopup(referenceId);
          }
        }
      });
    }
  }


  /**
   * Show citation popup with draggable functionality
   */
  private showCitationPopup(referenceId: string): void {
    console.log('Citation clicked:', referenceId);

    // Check if a popup already exists and remove it
    const existingPopup = document.getElementById('citation-popup');
    if (existingPopup) {
      existingPopup.remove();
    }

    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'citation-popup';

    // Find citation content
    const conversation = this.state.activeConversationId
      ? this.state.conversations[this.state.activeConversationId]
      : null;

    if (!conversation) {
      popup.innerHTML = '<div style="color:red;">Reference not found.</div>';
      document.body.appendChild(popup);
      return;
    }

    // Get all assistant messages
    const messages = Object.values(conversation.messageMap || {});
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    let foundContent = null;
    let foundSourceUrl = null;
    const [toolUseId, citationIndex] = referenceId.split('@');

    for (const message of assistantMessages) {
      if (!message.thinkingLog) continue;

      for (const entry of message.thinkingLog) {
        if (!entry.content) continue;

        for (const contentItem of entry.content) {
          if (contentItem.contentType !== 'toolResult' || !contentItem.body) continue;

          if (contentItem.body.toolUseId === toolUseId) {
            if (contentItem.body.content &&
                contentItem.body.content[parseInt(citationIndex)] &&
                contentItem.body.content[parseInt(citationIndex)].json) {

              const jsonContent = contentItem.body.content[parseInt(citationIndex)].json;
              foundContent = jsonContent.content;

              // Extract source_url if it exists
              foundSourceUrl = jsonContent.sourceUrl || null;
              break;
            }
          }
        }

        if (foundContent) break;
      }

      if (foundContent) break;
    }

    // Create content HTML
    const headerHTML = `
      <div class="popup-header">
        <h3 class="popup-title">Source Reference</h3>
        <button class="close-button">✕</button>
      </div>
    `;

    // Add source URL section if available
    let sourceUrlHTML = '';
    if (foundSourceUrl) {
      sourceUrlHTML = `
        <div class="popup-source-url">
          <a href="${foundSourceUrl}" target="_blank" rel="noopener noreferrer">
            View source document
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" style="display:inline-block;vertical-align:middle;margin-left:4px;">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        </div>
      `;
    }

    const contentHTML = `<div class="popup-content">${foundContent || 'Content not found'}</div>`;

    popup.innerHTML = headerHTML + sourceUrlHTML + contentHTML;

    // Add to DOM
    document.body.appendChild(popup);

    // Position popup - use mouse position if available
    const lastClick = (window as any).__lastClickPosition || { clientX: 100, clientY: 100 };

    // Calculate position
    const popupRect = popup.getBoundingClientRect();
    let topPos = lastClick.clientY + 20;
    let leftPos = lastClick.clientX - 20;

    // Make sure popup is fully visible
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (leftPos + popupRect.width > viewportWidth - 20) {
      leftPos = viewportWidth - popupRect.width - 20;
    }

    if (leftPos < 20) {
      leftPos = 20;
    }

    if (topPos + popupRect.height > viewportHeight - 20) {
      topPos = lastClick.clientY - popupRect.height - 20;
    }

    if (topPos < 20) {
      topPos = 20;
    }

    // Set position
    popup.style.top = `${topPos}px`;
    popup.style.left = `${leftPos}px`;

    // Add close handler
    const closeBtn = popup.querySelector('.close-button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        popup.remove();
      });
    }

    // Make the popup draggable
    this.makeDraggable(popup);

    // Close popup when clicking outside
    document.addEventListener('click', function closePopup(e) {
      if (!popup.contains(e.target as Node)) {
        popup.remove();
        document.removeEventListener('click', closePopup);
      }
    });
  }

  /**
   * Make an element draggable (simple implementation)
   */
  private makeDraggable(element: HTMLElement): void {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    // The header or the element itself is the drag handle
    const handle = element.querySelector('.popup-header') || element;

    // Mouse down event to start dragging
    handle.addEventListener('mousedown', function(e) {
      // Ensure it's a MouseEvent and left button
      if (!(e instanceof MouseEvent) || e.button !== 0) return;

      isDragging = true;

      // Calculate offset
      const rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      // Prevent text selection during drag
      e.preventDefault();
    });

    // Mouse move event for dragging
    document.addEventListener('mousemove', function(e) {
      if (!isDragging || !(e instanceof MouseEvent)) return;

      // Calculate new position
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;

      // Apply position
      element.style.left = x + 'px';
      element.style.top = y + 'px';
    });

    // Mouse up event to end dragging
    document.addEventListener('mouseup', function() {
      isDragging = false;
    });
  }

  /**
   * Format a timestamp to display time
   */
  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Show thinking indicator while waiting for response
   */
  private showThinkingIndicator(): void {
    const messagesContainer = document.getElementById('messages-container');
    if (!messagesContainer) return;

    const thinkingEl = document.createElement('div');
    thinkingEl.classList.add('thinking');
    thinkingEl.id = 'thinking-indicator';

    // Apply styles
    thinkingEl.style.display = 'flex';
    thinkingEl.style.gap = '4px';
    thinkingEl.style.padding = '8px 14px';
    thinkingEl.style.alignSelf = 'flex-start';
    thinkingEl.style.backgroundColor = '#f5f5f5';
    thinkingEl.style.borderRadius = '18px';
    thinkingEl.style.borderBottomLeftRadius = '4px';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.classList.add('dot');

      // Apply dot styles
      dot.style.width = '8px';
      dot.style.height = '8px';
      dot.style.borderRadius = '50%';
      dot.style.backgroundColor = '#a0aec0';
      dot.style.animation = 'bounce 1.5s infinite ease-in-out';

      // Set different animation delays
      if (i === 1) dot.style.animationDelay = '0.2s';
      if (i === 2) dot.style.animationDelay = '0.4s';

      thinkingEl.appendChild(dot);
    }

    messagesContainer.appendChild(thinkingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add animation keyframes if they don't exist
    if (!document.getElementById('bounce-animation')) {
      const style = document.createElement('style');
      style.id = 'bounce-animation';
      style.textContent = `
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Remove thinking indicator
   */
  private removeThinkingIndicator(): void {
    const thinkingEl = document.getElementById('thinking-indicator');
    if (thinkingEl) {
      thinkingEl.remove();
    }
  }

  /**
   * Send a message with improved conversation management and title preservation
   */
  public async sendMessage(text: string, model: string): Promise<void> {
    try {
      this.state.isWaitingForResponse = true;

      // Disable input and button
      const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
      const sendButton = document.getElementById('send-button') as HTMLButtonElement;

      if (messageInput) messageInput.disabled = true;
      if (sendButton) sendButton.disabled = true;

      // Create user message object
      const userMessage: ChatMessage = {
        role: 'user',
        content: [
          {
            contentType: 'text',
            body: text
          }
        ],
        createTime: Date.now()
      };

      // Add user message to UI immediately
      this.addMessageToUI(userMessage);

      // Prepare the request body
      const requestBody = {
        conversationId: this.state.activeConversationId || null,
        message: {
          model,
          content: [
            {
              contentType: 'text',
              body: text
            }
          ]
        },
        continueGenerate: false
      };

      // Is this a new conversation?
      const isNewConversation = !this.state.activeConversationId ||
                                (this.state.activeConversationId &&
                                 !this.state.conversations[this.state.activeConversationId]);

      // Handle conversation creation/updating
      const tempConversationId = this.state.activeConversationId || 'temp-' + Date.now();

      // Create new conversation if needed
      if (!this.state.conversations[tempConversationId]) {
        this.state.conversations[tempConversationId] = {
          id: tempConversationId,
          createTime: Date.now(),
          title: text, // Use full text as initial title, we'll truncate during display
          messageMap: {}
        };

        // Add lead info if available
        if (this.state.userData && this.state.userData.leadInfo) {
          this.state.conversations[tempConversationId].leadInfo = this.state.userData.leadInfo;
        }
      }
      // If this is an existing conversation without a proper title and this is the first message,
      // update the title
      else if ((!this.state.conversations[tempConversationId].title ||
                this.state.conversations[tempConversationId].title === 'Conversation' ||
                this.state.conversations[tempConversationId].title === 'New Conversation') &&
                Object.keys(this.state.conversations[tempConversationId].messageMap || {}).length === 0) {
        this.state.conversations[tempConversationId].title = text;
      }

      // Ensure messageMap exists
      if (!this.state.conversations[tempConversationId].messageMap) {
        this.state.conversations[tempConversationId].messageMap = {};
      }

      // Add user message to conversation with a unique ID
      const userMessageId = 'user-' + Date.now();
      this.state.conversations[tempConversationId].messageMap[userMessageId] = userMessage;

      // If this is a new conversation, set it as active
      if (isNewConversation) {
        this.state.activeConversationId = tempConversationId;
      }

      // Save to localStorage immediately to prevent loss
      saveConversationsToStorage(this.state.conversations);

      // Update conversation list to reflect any changes
      this.updateConversationsList();

      // Show thinking indicator
      this.showThinkingIndicator();

      // Make API call
      const response = await this.apiService.sendMessage(requestBody);

      // Get conversation and message IDs from response
      const { conversationId, messageId } = response;
      console.log("API Response - ConversationId:", conversationId, "MessageId:", messageId);

      if (conversationId && this.state.userData && this.state.userData.leadInfo) {
        await this.apiService.updateLeadConversation(this.state.userData.userId, conversationId);
      }

      // If we got back a different conversation ID than our temp one,
      // transfer the message to the correct conversation
      if (conversationId !== tempConversationId && tempConversationId.startsWith('temp-')) {
        console.log("Transferring user message from temp conversation to real conversation");

        // Create the new conversation if it doesn't exist
        if (!this.state.conversations[conversationId]) {
          this.state.conversations[conversationId] = {
            id: conversationId,
            createTime: Date.now(),
            title: text, // Use the message text as title
            messageMap: {}
          };

          // Add lead info if available
          if (this.state.userData && this.state.userData.leadInfo) {
            this.state.conversations[conversationId].leadInfo = this.state.userData.leadInfo;
          }
        }

        // Ensure messageMap exists
        if (!this.state.conversations[conversationId].messageMap) {
          this.state.conversations[conversationId].messageMap = {};
        }

        // Copy the user message to the real conversation
        this.state.conversations[conversationId].messageMap[userMessageId] = userMessage;

        // If the real conversation doesn't have a title, use the message text
        if (!this.state.conversations[conversationId].title ||
            this.state.conversations[conversationId].title === 'Conversation' ||
            this.state.conversations[conversationId].title === 'New Conversation') {
          this.state.conversations[conversationId].title = text;
        }

        // Delete the temporary conversation
        delete this.state.conversations[tempConversationId];

        // Set the active conversation to the real one
        this.state.activeConversationId = conversationId;

        // ADD THIS CODE: Update the lead info with the new conversation ID if we have lead data
        if (this.state.userData && this.state.userData.leadInfo) {
          await this.apiService.updateLeadConversation(this.state.userData.userId, conversationId);
          console.log("Updated lead with real conversation ID:", conversationId);
        }

        // Save changes
        saveConversationsToStorage(this.state.conversations);

        // Update sidebar
        this.updateConversationsList();
      }

      // Poll for the bot response
      const botMessage = await this.pollForMessage(conversationId, messageId);

      if (!botMessage) {
        // If polling failed, try fetching the full conversation
        await this.fetchConversation(conversationId);

        // Check if the fetch worked and we got the bot message
        const hasAssistantMessage = Object.values(this.state.conversations[conversationId]?.messageMap || {})
          .some(msg => msg.role === 'assistant' || msg.role === 'bot');

        // If no assistant message was found, show an error
        if (!hasAssistantMessage) {
          this.removeThinkingIndicator();
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: [
              {
                contentType: 'text',
                body: "Sorry, I wasn't able to retrieve the response. Please try again."
              }
            ],
            createTime: Date.now()
          };

          // Add error message to UI and conversation
          this.addMessageToUI(errorMessage);
          const errorMessageId = 'error-' + Date.now();
          this.state.conversations[conversationId].messageMap[errorMessageId] = errorMessage;
        }
      }

      // Update user data with conversation ID
      if (this.state.userData && !this.state.userData.conversationIds.includes(conversationId)) {
        this.state.userData.conversationIds.push(conversationId);
        this.apiService.updateUserData(this.state.userData);
      }

      // One final save to ensure everything is stored
      saveConversationsToStorage(this.state.conversations);

    } catch (error) {
      console.error('Error sending message:', error);
      // Display error message
      this.removeThinkingIndicator();

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: [
          {
            contentType: 'text',
            body: 'Sorry, there was an error processing your request. Please try again.'
          }
        ],
        createTime: Date.now()
      };

      this.addMessageToUI(errorMessage);

      // Try to save the error message to conversation
      if (this.state.activeConversationId && this.state.conversations[this.state.activeConversationId]) {
        const errorMessageId = 'error-' + Date.now();
        if (!this.state.conversations[this.state.activeConversationId].messageMap) {
          this.state.conversations[this.state.activeConversationId].messageMap = {};
        }
        this.state.conversations[this.state.activeConversationId].messageMap[errorMessageId] = errorMessage;
        saveConversationsToStorage(this.state.conversations);
      }

    } finally {
      // Re-enable the input
      this.state.isWaitingForResponse = false;

      const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
      const sendButton = document.getElementById('send-button') as HTMLButtonElement;

      if (messageInput) {
        messageInput.disabled = false;
        messageInput.focus();
      }

      if (sendButton) {
        sendButton.disabled = messageInput ? messageInput.value.trim() === '' : true;
      }

      this.removeThinkingIndicator();
    }
  }

  /**
   * Fetch a full conversation from the API with retry logic
   * and proper data processing
   */
  private async fetchConversation(conversationId: string): Promise<void> {
    let retries = 0;

    // Wait initial delay before first attempt
    await wait(this.state.initialRetryDelay);

    while (retries < this.state.maxRetries) {
      try {
        console.log(`Fetching conversation (attempt ${retries + 1}/${this.state.maxRetries})...`);

        const conversation = await this.apiService.fetchConversation(conversationId);

        // Ensure the conversation has a valid messageMap
        if (!conversation.messageMap) {
          conversation.messageMap = {};
        }

        // Ensure all messages have createTime for proper sorting
        Object.values(conversation.messageMap).forEach(msg => {
          if (!msg.createTime) {
            msg.createTime = Date.now(); // Default to current time if missing
          }
        });

        // Ensure messages are properly ordered based on role
        // This helps prevent duplicate user messages on both sides
        const messages = Object.values(conversation.messageMap);

        if (messages.length > 0) {
          // Sort by timestamp
          messages.sort((a, b) => {
            return (a.createTime || 0) - (b.createTime || 0);
          });

          // Make sure the conversation has a valid title
          if (!conversation.title || conversation.title.trim() === '') {
            const firstUserMessage = messages.find(msg => msg.role === 'user');
            if (firstUserMessage && firstUserMessage.content && firstUserMessage.content.length > 0) {
              const text = firstUserMessage.content[0].body;
              conversation.title = text.length > 30 ? text.substring(0, 27) + '...' : text;
            } else {
              conversation.title = 'Conversation';
            }
          }
        }

        // Add lead info if available and not already present
        if (!conversation.leadInfo && this.state.userData && this.state.userData.leadInfo) {
          conversation.leadInfo = this.state.userData.leadInfo;
        }

        // Update our state with the processed conversation data
        this.state.conversations[conversationId] = conversation;

        // If this is the active conversation, re-render messages
        if (this.state.activeConversationId === conversationId) {
          this.renderMessages();
        }

        // Update the sidebar
        this.updateConversationsList();

        // Save to localStorage
        saveConversationsToStorage(this.state.conversations);

        console.log('Conversation retrieved successfully');
        return; // Success, exit the function

      } catch (error) {
        console.error('Error fetching conversation:', error);

        // Check if the error is a 404 (not found/not ready)
        const is404 = error instanceof Error &&
                     (error.message.includes('404') ||
                      (error as any).status === 404 ||
                      (error as any).statusCode === 404);

        if (is404) {
          console.log('Conversation not ready yet, will retry after delay');
        } else {
          console.error('Unexpected error fetching conversation:', error);
        }

        // Increment retry counter
        retries++;

        // If we've reached max retries, break the loop
        if (retries >= this.state.maxRetries) {
          console.log('Max retries reached. Giving up on fetching conversation.');
          break;
        }

        // Wait before next retry with exponential backoff
        const backoffDelay = this.state.retryDelay * Math.pow(1.5, retries - 1);
        console.log(`Waiting ${backoffDelay}ms before next attempt...`);
        await wait(backoffDelay);
      }
    }

    // If we get here, we've failed to get the conversation after max retries
    console.error(`Failed to fetch conversation ${conversationId} after ${this.state.maxRetries} attempts`);

    // Create a minimal placeholder conversation if we couldn't fetch the real one
    if (!this.state.conversations[conversationId]) {
      this.state.conversations[conversationId] = {
        id: conversationId,
        createTime: Date.now(),
        title: 'Conversation',
        messageMap: {}
      };

      // Add lead info if available
      if (this.state.userData && this.state.userData.leadInfo) {
        this.state.conversations[conversationId].leadInfo = this.state.userData.leadInfo;
      }
    }
  }

  /**
   * Poll for a message with improved handling
   */
  private async pollForMessage(conversationId: string, messageId: string): Promise<ChatMessage | null> {
    let retries = 0;

    // Wait initial delay before first attempt
    await wait(this.state.initialRetryDelay);
    console.log("Poll for Message been called");

    while (retries < this.state.maxRetries) {
      try {
        console.log(`Polling for message (attempt ${retries + 1}/${this.state.maxRetries})...`);

        const result = await this.apiService.fetchMessage(conversationId, messageId);

        if (result.success && result.message) {
          console.log('Message retrieved successfully');

          // Extract the bot message from the response
          const botMessage = result.message;

          // Normalize the role to 'assistant' if it's 'bot'
          if (botMessage.role === 'bot') {
            botMessage.role = 'assistant';
          }

          // Ensure the message has a timestamp
          if (!botMessage.createTime) {
            botMessage.createTime = Date.now();
          }

          console.log('Bot message:', botMessage);

          // Add the bot message to the UI
          this.addMessageToUI(botMessage);

          // Store the message in our conversation history
          if (this.state.conversations[conversationId] && this.state.conversations[conversationId].messageMap) {
            // Generate a unique message ID if one isn't provided
            const botMessageId = botMessage.id || `bot-${Date.now()}`;
            this.state.conversations[conversationId].messageMap[botMessageId] = botMessage;

            // Save the updated conversation
            saveConversationsToStorage(this.state.conversations);
          }

          // Return the message
          return botMessage;
        }

        // If we get a 404, we expect this during polling (message not ready)
        if (result.status === 404) {
          console.log('Message not ready yet, will retry after delay');
        }

        // Increment retry counter
        retries++;

        // If we've reached max retries, break the loop
        if (retries >= this.state.maxRetries) {
          console.log('Max retries reached. Giving up.');
          break;
        }

        // Wait before next retry with exponential backoff
        const backoffDelay = this.state.retryDelay * Math.pow(1.5, retries - 1);
        console.log(`Waiting ${backoffDelay}ms before next attempt...`);
        await wait(backoffDelay);

      } catch (error) {
        console.error('Error polling for message:', error);
        retries++;

        // If we've reached max retries, break the loop
        if (retries >= this.state.maxRetries) {
          console.log('Max retries reached. Giving up.');
          break;
        }

        // Wait before next retry with exponential backoff
        const backoffDelay = this.state.retryDelay * Math.pow(1.5, retries - 1);
        await wait(backoffDelay);
      }
    }

    // If we get here, we've failed to get the message after max retries
    return null;
  }
}