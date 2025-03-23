#!/bin/bash

# Simple deploy script for Ubuntu server with limited memory
echo "Deploying TangerineBot to Ubuntu server (simple mode)..."

# Update system packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# Install global dependencies
echo "Installing global dependencies..."
sudo npm install -g pm2 ts-node typescript

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Set environment to production
export NODE_ENV=production

# Start with PM2 using ts-node
echo "Starting the bot with PM2 using ts-node..."
pm2 delete telegram-bot 2>/dev/null || true

# The correct way to pass memory limits to ts-node with PM2
export NODE_OPTIONS="--max-old-space-size=400"
pm2 start telegram-bot.ts --interpreter ts-node --name "telegram-bot"

# Save PM2 startup configuration
echo "Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on system boot
echo "Setting up PM2 to start on system boot..."
pm2 startup

echo "Deployment complete! Use 'pm2 logs telegram-bot' to see logs." 