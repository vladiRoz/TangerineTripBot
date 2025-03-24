#!/bin/bash

# Deployment script optimized for 1GB droplet
echo "Deploying TangerineBot on 1GB droplet..."

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
sudo npm install -g pm2 typescript

# Install project dependencies
echo "Installing dependencies..."
npm install

# Set environment to production
export NODE_ENV=production

# Build TypeScript with appropriate memory settings
echo "Building TypeScript code..."
export NODE_OPTIONS="--max-old-space-size=768"
npm run build

# Start with PM2 using compiled JavaScript
echo "Starting the bot with PM2..."
pm2 delete telegram-bot 2>/dev/null || true

# Use the compiled JavaScript version for better performance
pm2 start dist/telegram-bot.js \
  --name "telegram-bot" \
  --max-memory-restart 700M \
  --env NODE_ENV=production

# Save PM2 startup configuration
echo "Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on system boot
echo "Setting up PM2 to start on system boot..."
pm2 startup

echo "Deployment complete! Use 'pm2 logs telegram-bot' to see logs."
echo "Monitor resources with: pm2 monit" 