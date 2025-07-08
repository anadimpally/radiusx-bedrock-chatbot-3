# Installation Guide

This guide will help you set up the TypeScript Popup Chatbot on your server.

## Local Development Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd chatbot-ts
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure your API key:**

   Set it as an environment variable:
   ```bash
   export API_KEY=your_api_key_here
   ```
   
   Or edit the `API_KEY` value directly in `server.js`.

4. **Start development server:**

   ```bash
   npm run dev
   ```

   This will start webpack in watch mode and run the server with nodemon.

5. **Access the chatbot:**

   Open your browser and navigate to `http://localhost:8080`

## Production Deployment

### Deploying on an EC2 Instance

1. **Connect to your EC2 instance:**

   ```bash
   ssh -i your-key.pem ec2-user@your-ec2-public-ip
   ```

2. **Install Node.js:**

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
   source ~/.bashrc
   nvm install 16
   ```

3. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd chatbot-ts
   ```

4. **Install dependencies and build the project:**

   ```bash
   npm install
   npm run build
   ```

5. **Set your API key as an environment variable:**

   ```bash
   export API_KEY=your_api_key_here
   ```

6. **Start the server:**

   ```bash
   npm start
   ```

7. **Set up as a service (optional):**

   Create a systemd service file to keep the server running:

   ```bash
   sudo nano /etc/systemd/system/chatbot.service
   ```

   Add the following content:

   ```
   [Unit]
   Description=Chatbot Server
   After=network.target

   [Service]
   Type=simple
   User=ec2-user
   WorkingDirectory=/home/ec2-user/chatbot-ts
   Environment=API_KEY=your_api_key_here
   ExecStart=/usr/bin/node /home/ec2-user/chatbot-ts/server.js
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start the service:

   ```bash
   sudo systemctl enable chatbot
   sudo systemctl start chatbot
   ```

8. **Configure security groups:**

   Make sure your EC2 security group allows inbound traffic on port 8080 (or whichever port you've configured).

9. **Access your chatbot:**

   Open your browser and navigate to `http://your-ec2-public-ip:8080`

## Troubleshooting

### Common Issues

1. **API Key Issues:**
   - Check if your API key is correctly set in the environment or `server.js`
   - Verify the API key has the necessary permissions

2. **Connection Refused:**
   - Ensure the server is running
   - Check if the port is open in your security group/firewall

3. **Build Failures:**
   - Make sure all dependencies are installed: `npm install`
   - Check for TypeScript errors: `npx tsc --noEmit`

4. **Logs:**
   - Check server logs: `journalctl -u chatbot` (if using systemd)
   - Or run the server directly to see console output: `node server.js`