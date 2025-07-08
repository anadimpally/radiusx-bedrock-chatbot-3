# Dockerfile for building the frontend application.

# Use the official Node.js image as the base image
FROM public.ecr.aws/docker/library/node:18-bullseye-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code and build the app
COPY . .
RUN npm run build

# Expose the application port
EXPOSE 5173

# Start the application in development mode
CMD ["npm", "run", "dev"]
