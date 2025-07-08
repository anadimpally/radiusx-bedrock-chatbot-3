import { Chatbot } from './components/Chatbot';
import '../public/styles/chatbot.css';

// Debug function to verify DOM structure
function debugDOMStructure() {
  console.log('Verifying chatbot DOM structure...');

  const container = document.getElementById('chatbot-container');
  if (!container) {
    console.error('Chatbot container not found!');
    return;
  }

  console.log('Container structure:', container.outerHTML.substring(0, 500) + '...');

  // Verify child order
  const children = Array.from(container.children);
  const childTypes = children.map(child => `${child.tagName}.${child.className}`);
  console.log('Child elements order:', childTypes);

  // Check layout
  const layout = document.getElementById('chatbot-layout');
  if (layout) {
    const layoutChildren = Array.from(layout.children);
    const layoutChildTypes = layoutChildren.map(child => `${child.tagName}.${child.className}`);
    console.log('Layout children:', layoutChildTypes);
  } else {
    console.error('Layout container not found!');
  }
}

// Initialize the chatbot when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get API configuration from global variables
  // These will be injected by the server
  const apiBaseUrl = (window as any).API_BASE_URL || '';
  const apiKey = (window as any).API_KEY || '';

  // Small delay to ensure everything is loaded
  setTimeout(() => {
    // Initialize the chatbot
    try {
      const chatbot = new Chatbot({
        apiBaseUrl,
        apiKey
      });
      console.log('Chatbot initialized successfully');

      // Debug DOM structure after a short delay to ensure rendering
      setTimeout(debugDOMStructure, 500);
    } catch (error) {
      console.error('Error initializing chatbot:', error);
    }
  }, 100);
});