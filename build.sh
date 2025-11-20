#!/bin/bash
set -e

echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

echo "🏗️  Building client..."
cd client
pnpm build
cd ..

echo "✅ Build complete!"
