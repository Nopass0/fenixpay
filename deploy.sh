#!/bin/bash
set -e

# Deploy Chase to production server locally after git pull
# Requires environment variables: DATABASE_URL, JWT_SECRET, SUPER_ADMIN_KEY, ADMIN_IPS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure required environment variables are present
if [ -z "${DATABASE_URL}" ] || [ -z "${JWT_SECRET}" ] || [ -z "${SUPER_ADMIN_KEY}" ] || [ -z "${ADMIN_IPS}" ]; then
  echo "ERROR: DATABASE_URL, JWT_SECRET, SUPER_ADMIN_KEY and ADMIN_IPS must be set"
  exit 1
fi

# Stop existing containers
docker compose -f docker-compose.prod.yml down || true

# Create .env file
cat > .env <<EOF_ENV
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
SUPER_ADMIN_KEY=${SUPER_ADMIN_KEY}
ADMIN_IPS=${ADMIN_IPS}
NODE_ENV=production
EOF_ENV

# Validate DATABASE_URL
if ! grep -q "DATABASE_URL=" .env || grep -q "DATABASE_URL=$" .env; then
  echo "ERROR: DATABASE_URL is not properly set"
  exit 1
fi

# Ensure SSL certificates directory exists
mkdir -p ssl

# Choose nginx config based on SSL certificates
if [ -f "ssl/certificate.crt" ]; then
  echo "SSL certificates found, using HTTPS configuration"
  rm -f nginx/conf.d/default-http-only.conf
else
  echo "No SSL certificates found, using HTTP-only configuration"
  rm -f nginx/conf.d/default.conf
  cp nginx/conf.d/default-http-only.conf nginx/conf.d/default.conf
  rm -f nginx/conf.d/default-http-only.conf
fi

# Clean up old containers and images
docker compose -f docker-compose.prod.yml rm -f
# Clean disk space
docker system prune -af --volumes || true
docker builder prune -af || true

# Build containers
echo "Building containers with memory optimization..."
if ! DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build --no-cache --memory 1g; then
  echo "Build failed, trying without memory limit..."
  docker compose -f docker-compose.prod.yml build --no-cache
fi

echo "Starting containers..."
if ! docker compose -f docker-compose.prod.yml up -d; then
  echo "Failed to start containers"
  docker compose -f docker-compose.prod.yml logs
  exit 1
fi

echo "Container status after startup:"
docker compose -f docker-compose.prod.yml ps

echo "Waiting for backend to initialize and apply migrations..."

docker compose -f docker-compose.prod.yml logs -f backend &
LOGS_PID=$!
sleep 45
kill $LOGS_PID 2>/dev/null || true

if ! docker ps | grep -q "chase_backend"; then
  echo "Backend container is not running after startup"
  docker compose -f docker-compose.prod.yml logs backend
  exit 1
fi

echo "Waiting for backend container to be ready..."
timeout=180
while [ $timeout -gt 0 ]; do
  if ! docker ps | grep -q "chase_backend"; then
    echo "Backend container stopped running, checking logs..."
    docker compose -f docker-compose.prod.yml logs backend
    exit 1
  fi

  if docker compose -f docker-compose.prod.yml exec -T backend curl -f http://localhost:3001/health >/dev/null 2>&1; then
    echo "Backend container is ready and healthy"
    break
  fi
  echo "Backend container not ready yet, waiting... (${timeout}s remaining)"
  sleep 5
  timeout=$((timeout - 5))
done

if [ $timeout -le 0 ]; then
  echo "Backend container failed to start properly"
  echo "Container status:"
  docker compose -f docker-compose.prod.yml ps
  echo "Backend logs:"
  docker compose -f docker-compose.prod.yml logs backend
  exit 1
fi

# Initialize and disable services
echo "Initializing service records..."
docker compose -f docker-compose.prod.yml exec -T backend bun run scripts/init-all-services.ts || {
  echo "Service initialization failed, continuing anyway..."
}

echo "Disabling emulator services..."
docker compose -f docker-compose.prod.yml exec -T backend bun run scripts/disable-emulator-services.ts || {
  echo "Failed to disable emulator services, continuing anyway..."
}

# Verify containers are running
if ! docker ps | grep -q "chase_backend"; then
  echo "ERROR: Backend container is not running!"
  docker compose logs backend
  exit 1
fi

if ! docker ps | grep -q "chase_frontend"; then
  echo "ERROR: Frontend container is not running!"
  docker compose logs frontend
  exit 1
fi

if ! docker ps | grep -q "chase_nginx"; then
  echo "ERROR: Nginx container is not running!"
  docker compose -f docker-compose.prod.yml logs nginx
  exit 1
fi

# Final schema verification
cat <<'SQL' | docker compose -f docker-compose.prod.yml exec -T backend bunx prisma db execute --stdin || echo "Failed to verify Transaction columns"
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name IN ('merchantRate', 'traderProfit', 'matchedNotificationId') ORDER BY column_name;
SQL

cat <<'SQL' | docker compose -f docker-compose.prod.yml exec -T backend bunx prisma db execute --stdin || echo "Failed to verify Payout columns"
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Payout' AND column_name IN ('methodId', 'profitAmount') ORDER BY column_name;
SQL

cat <<'SQL' | docker compose -f docker-compose.prod.yml exec -T backend bunx prisma db execute --stdin || echo "Failed to verify Notification columns"
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'packageName' ORDER BY column_name;
SQL

cat <<'SQL' | docker compose -f docker-compose.prod.yml exec -T backend bunx prisma db execute --stdin || echo "Failed to verify new tables"
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('SettleRequest', 'TransactionAttempt', 'merchant_emulator_logs') ORDER BY table_name;
SQL

docker compose -f docker-compose.prod.yml ps

docker system prune -af

echo "✅ Deployment completed successfully!"
echo "Triggering APK build workflow... (not implemented)"
