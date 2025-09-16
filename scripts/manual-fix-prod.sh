#!/bin/bash

# Manual fix script for production database
# Run this directly on the production server

echo "🔧 Manual fix for production database schema..."

# Get into the backend container
echo "📦 Executing commands in backend container..."

# Generate Prisma client
docker compose -f docker-compose.prod.yml exec -T backend bunx prisma generate

# Push database schema
docker compose -f docker-compose.prod.yml exec -T backend bunx prisma db push --accept-data-loss

# Initialize services
docker compose -f docker-compose.prod.yml exec -T backend bun run scripts/init-all-services.ts

# Restart the backend container to apply changes
echo "🔄 Restarting backend container..."
docker compose -f docker-compose.prod.yml restart backend

echo "✅ Production database schema should now be fixed!"
echo "📋 Check logs with: docker logs chase_backend"