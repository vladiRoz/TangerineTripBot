#!/bin/bash

# Simple script to run the bot directly with ts-node
echo "Starting TangerineBot directly with ts-node..."

# Set memory limit
export NODE_OPTIONS="--max-old-space-size=400"

# Run the bot
ts-node telegram-bot.ts 