#!/bin/bash
set -e

echo "🗄️  Running database migrations..."
pnpm db:push

echo "🚀 Starting Job Tracker in production mode..."

# Start the server using tsx (TypeScript execution)
NODE_ENV=production npx tsx server/_core/index.ts
