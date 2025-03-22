#!/bin/bash

# Detect the operating system
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Running on macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "Running on Linux"
else
  echo "Unknown operating system: $OSTYPE"
fi

# Install dependencies
npm install

# Build TypeScript files
npm run build

# Check if running on the server with PM2 installed
if command -v pm2 &> /dev/null && [[ "$1" == "deploy" ]]; then
  echo "Deploying with PM2..."
  
  # Stop any existing bot instances
  pm2 delete telegram-bot 2>/dev/null || true
  
  # Start with PM2
  npm run deploy
  
  # Save PM2 config
  pm2 save
  
  echo "Bot deployed with PM2. Use 'pm2 logs telegram-bot' to see logs."
else
  # Start the bot directly
  echo "Starting in regular mode..."
  npm start
fi 