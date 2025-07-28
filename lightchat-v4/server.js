const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');

// Configuration
const PORT = 8080;
const API_KEY = process.env.API_KEY || 'qQGPpzSOWTatz8Ucg6wcV1ZLxRLLmpho4gMQA3Ap'; // My Bot
const API_BASE_URL = 'https://ftmmea2sfj.execute-api.us-east-1.amazonaws.com/api';
// const API_KEY = process.env.API_KEY || 'tJ4W9nHwTT1uhdbu8RXAL5EZBBNufqNayzDFIIZh'; // Replace with your actual API key or set as environment variable
// const API_BASE_URL = 'https://sbimxqdrc0.execute-api.us-east-1.amazonaws.com/api';
// Initialize express app
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Read the HTML template and inject the correct config
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');

  // Replace the API_BASE_URL with the proxy URL
  html = html.replace(
    /const API_BASE_URL = .*;/,
    "const API_BASE_URL = '';" // Empty string means same origin
  );

  // Replace API_KEY with the actual key
  html = html.replace(
    /const API_KEY = .*;/,
    `const API_KEY = '${API_KEY}';`
  );

  res.send(html);
});

// Configure the proxy middleware
const apiProxy = createProxyMiddleware('/api', {
  target: API_BASE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '', // Remove /api prefix when forwarding
  },
  onProxyReq: (proxyReq) => {
    // Add API key to all proxied requests
    proxyReq.setHeader('x-api-key', API_KEY);
  },
  logLevel: 'debug' // Set to 'debug' to see request details
});

// Use the proxy for /api/* requests
app.use('/api', apiProxy);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
  console.log(`Access your chatbot at http://your-ec2-ip:${PORT}`);
});