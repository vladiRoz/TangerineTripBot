#!/bin/bash

# Deploy script for Ubuntu server
echo "Deploying TangerineBot to Ubuntu server..."

# Update system packages
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js if not installed
if ! command -v node &> /dev/null; then
  echo "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  sudo npm install -g pm2
fi

# Create a temporary swap file (2GB) to handle memory-intensive operations
echo "Setting up temporary swap space (2GB)..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "Swap space activated."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the project with increased memory limit
echo "Building the project..."
export NODE_OPTIONS="--max-old-space-size=512"
npm run build

# Remove the temporary swap file
echo "Removing temporary swap space..."
sudo swapoff /swapfile
sudo rm /swapfile

# Set environment to production
export NODE_ENV=production

# Start with PM2
echo "Starting the bot with PM2..."
pm2 delete telegram-bot 2>/dev/null || true
pm2 start dist/telegram-bot.js --name "telegram-bot"

# Save PM2 startup configuration
echo "Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on system boot
echo "Setting up PM2 to start on system boot..."
pm2 startup

echo "Deployment complete! Use 'pm2 logs telegram-bot' to see logs." 