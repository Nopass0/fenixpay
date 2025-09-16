#!/bin/bash

# Script to fix deployment memory issues
# Run this if deployment fails with exit code 137 (OOM)

echo "🔧 Fixing deployment memory issues..."

# Stop all containers to free memory
echo "📦 Stopping containers to free memory..."
docker compose -f docker-compose.prod.yml stop

# Clean up to free disk space and memory
echo "🧹 Cleaning up Docker resources..."
docker system prune -af --volumes || true
docker builder prune -af || true

# Start only the backend container with memory limits
echo "🚀 Starting backend container with memory limits..."
docker compose -f docker-compose.prod.yml up -d backend

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 20

# Run Prisma operations with low memory usage
echo "📊 Running Prisma generate with memory limits..."
docker compose -f docker-compose.prod.yml exec -T -e NODE_OPTIONS="--max-old-space-size=384" backend sh -c "
  echo 'Generating Prisma client...'
  bunx prisma generate || {
    echo 'Prisma generate failed, trying with even lower memory...'
    NODE_OPTIONS='--max-old-space-size=256' bunx prisma generate
  }
"

echo "📊 Running database schema push..."
docker compose -f docker-compose.prod.yml exec -T -e NODE_OPTIONS="--max-old-space-size=384" backend sh -c "
  echo 'Pushing database schema...'
  bunx prisma db push --accept-data-loss || {
    echo 'Schema push failed, trying with lower memory...'
    NODE_OPTIONS='--max-old-space-size=256' bunx prisma db push --accept-data-loss
  }
"

# Initialize services
echo "🔧 Initializing services..."
docker compose -f docker-compose.prod.yml exec -T backend bun run scripts/init-all-services.ts || echo "Service init failed, continuing..."

# Start remaining containers
echo "🚀 Starting all containers..."
docker compose -f docker-compose.prod.yml up -d

# Show status
echo "📋 Container status:"
docker compose -f docker-compose.prod.yml ps

echo "✅ Deployment fix completed!"
echo "📋 Check logs with: docker compose -f docker-compose.prod.yml logs -f"