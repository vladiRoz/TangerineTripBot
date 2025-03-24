#!/bin/bash

# Ultra-minimal deploy script for very resource-constrained servers
echo "Deploying TangerineBot in minimal mode..."

# Create a permanent 1GB swap file
echo "Setting up permanent swap space (1GB)..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  
  # Make swap permanent
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  
  echo "Swap space created and activated permanently."
else
  echo "Swap file already exists."
  sudo swapon /swapfile 2>/dev/null || true
fi

# Configure swappiness
echo "Configuring system memory management..."
sudo sysctl vm.swappiness=60
echo 'vm.swappiness=60' | sudo tee -a /etc/sysctl.conf

# Set environment to production
export NODE_ENV=production

# Set ts-node compiler options to bypass moduleResolution issues
export TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"node"}'

# Start with PM2 using minimal settings
echo "Starting the bot with PM2 in minimal mode..."
pm2 delete telegram-bot 2>/dev/null || true

# Configure memory limits
export NODE_OPTIONS="--max-old-space-size=512"

# Start with PM2 using ts-node with transpile-only to skip type checking
pm2 start telegram-bot.ts \
  --interpreter ts-node \
  --name "telegram-bot" \
  --node-args="--transpile-only" \
  --max-memory-restart 400M \
  --env NODE_ENV=production \
  --env TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"node"}'

# Save PM2 startup configuration
echo "Saving PM2 configuration..."
pm2 save

# Setup PM2 to start on system boot
echo "Setting up PM2 to start on system boot..."
pm2 startup

echo "Deployment complete! Use 'pm2 logs telegram-bot' to see logs." 