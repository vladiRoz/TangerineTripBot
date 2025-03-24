#!/bin/bash

# Script to run TypeScript directly while ignoring type errors
echo "Starting TangerineBot with type checking disabled..."

# Set environment to production to reduce resource usage
export NODE_ENV=production

# Set memory limit
export NODE_OPTIONS="--max-old-space-size=768"

# Run TypeScript with ts-node, ignoring all type errors
ts-node --transpile-only telegram-bot.ts 