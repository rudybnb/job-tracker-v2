#!/bin/bash
set -e

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🗄️  Running database migrations..."
pnpm db:push

echo "🏗️  Building client..."
cd client
pnpm build
cd ..

echo "✅ Build complete!"
