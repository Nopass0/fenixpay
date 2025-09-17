#!/bin/bash
set -e

#
# Utility helpers
#

# Ensure that the host firewall (if any) allows inbound HTTP/HTTPS traffic so
# that the nginx container exposed on ports 80/443 is reachable from outside
# the server. This targets the most common firewall managers (ufw, firewalld
# and plain iptables) and falls back to a warning if automatic configuration is
# not possible.
ensure_firewall_ports() {
  echo "Ensuring firewall allows inbound HTTP/HTTPS traffic..."

  if ! command -v id >/dev/null 2>&1; then
    echo "Unable to determine current user – skipping firewall checks."
    return
  fi

  if [ "$(id -u)" -ne 0 ]; then
    echo "Skipping firewall configuration (requires root privileges)."
    echo "Please ensure ports 80 and 443 are open on the host."
    return
  fi

  local firewall_adjusted=0

  if command -v ufw >/dev/null 2>&1; then
    # Capture status only once to avoid repeated sub-shell invocations.
    local ufw_status
    ufw_status="$(ufw status 2>/dev/null || true)"
    if printf '%s' "$ufw_status" | grep -q "Status: active"; then
      for port in 80 443; do
        if ! printf '%s' "$ufw_status" | grep -qE "^${port}/tcp\\b.*ALLOW"; then
          echo "  Allowing ${port}/tcp via ufw"
          ufw allow "${port}/tcp" >/dev/null 2>&1 || true
          ufw_status="$(ufw status 2>/dev/null || true)"
        fi
      done
      firewall_adjusted=1
    fi
  fi

  if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd --state >/dev/null 2>&1; then
    echo "  Configuring firewalld services for HTTP/HTTPS"
    firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
    firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
    firewall_adjusted=1
  fi

  if [ "$firewall_adjusted" -eq 0 ] && command -v iptables >/dev/null 2>&1; then
    for port in 80 443; do
      if ! iptables -C INPUT -p tcp --dport "$port" -j ACCEPT >/dev/null 2>&1; then
        echo "  Adding iptables rule to accept TCP port $port"
        iptables -I INPUT -p tcp --dport "$port" -j ACCEPT >/dev/null 2>&1 || true
      fi
    done
    if command -v netfilter-persistent >/dev/null 2>&1; then
      netfilter-persistent save >/dev/null 2>&1 || true
    fi
    firewall_adjusted=1
  fi

  if [ "$firewall_adjusted" -eq 0 ]; then
    echo "⚠️  Could not automatically adjust firewall rules."
    echo "   Please verify manually that ports 80 and 443 are reachable from the Internet."
  else
    echo "Firewall configuration verified for ports 80/443."
  fi
}

# Validate that nginx is reachable from the host network after the containers
# are started. We probe the HTTP health endpoint exposed by nginx and warn (but
# do not abort) if it cannot be reached – this keeps the deployment going while
# highlighting potential networking issues such as blocked ports.
verify_local_nginx() {
  local ssl_dir="$1"

  if ! command -v curl >/dev/null 2>&1; then
    echo "curl not available; skipping local nginx reachability check."
    return
  fi

  echo "Verifying nginx availability on http://127.0.0.1:80/health ..."
  local attempt=0
  local max_attempts=10
  while [ $attempt -lt $max_attempts ]; do
    if curl -fsS --max-time 5 http://127.0.0.1/health >/dev/null 2>&1; then
      echo "HTTP health check succeeded."
      break
    fi
    attempt=$((attempt + 1))
    sleep 3
  done

  if [ $attempt -ge $max_attempts ]; then
    echo "⚠️  Unable to reach nginx on port 80 from the host after $max_attempts attempts."
    echo "   Inspect firewall rules and docker logs if external access is still failing."
  fi

  if [ -n "$ssl_dir" ] && [ -f "$ssl_dir/fullchain.crt" ] && [ -f "$ssl_dir/certificate.key" ]; then
    echo "Verifying nginx availability on https://127.0.0.1 (certificate ignored for localhost check)..."
    if curl -kfsS --max-time 5 https://127.0.0.1 >/dev/null 2>&1; then
      echo "HTTPS check succeeded."
    else
      echo "⚠️  HTTPS check failed. Ensure the SSL certificate/key pair is valid and nginx has restarted."
    fi
  fi
}

# Deploy Chase to production server locally after git pull
# Requires environment variables: DATABASE_URL, JWT_SECRET, SUPER_ADMIN_KEY, ADMIN_IPS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure required environment variables are present
if [ -z "${DATABASE_URL}" ] || [ -z "${JWT_SECRET}" ] || [ -z "${SUPER_ADMIN_KEY}" ] || [ -z "${ADMIN_IPS}" ]; then
  echo "ERROR: DATABASE_URL, JWT_SECRET, SUPER_ADMIN_KEY and ADMIN_IPS must be set"
  exit 1
fi

# Make sure the host will accept incoming traffic on ports 80/443 before we
# spend time building images – if the firewall blocks these ports the services
# will look healthy inside Docker but remain unreachable from the Internet.
ensure_firewall_ports

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

SSL_DIR="ssl"

# Choose nginx config based on SSL certificates
if [ -f "${SSL_DIR}/fullchain.crt" ] && [ -f "${SSL_DIR}/certificate.key" ]; then
  echo "Fullchain SSL certificate found, using HTTPS configuration"
  rm -f nginx/conf.d/default-http-only.conf
elif [ -f "${SSL_DIR}/certificate.crt" ] && [ -f "${SSL_DIR}/certificate_ca.crt" ] && [ -f "${SSL_DIR}/certificate.key" ]; then
  echo "Fullchain SSL certificate missing; combining certificate.crt and certificate_ca.crt"
  cat "${SSL_DIR}/certificate.crt" "${SSL_DIR}/certificate_ca.crt" > "${SSL_DIR}/fullchain.crt"
  chmod 644 "${SSL_DIR}/fullchain.crt" || true
  rm -f nginx/conf.d/default-http-only.conf
else
  echo "No complete SSL chain found, using HTTP-only configuration"
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

verify_local_nginx "$SSL_DIR"

docker system prune -af

echo "✅ Deployment completed successfully!"
echo "Triggering APK build workflow... (not implemented)"
