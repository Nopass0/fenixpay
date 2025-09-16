#!/bin/bash
# Fix nginx configuration conflicts

echo "🔧 Checking nginx configuration..."

# Check for duplicate server blocks
if docker exec chase_nginx nginx -t 2>&1 | grep -q "conflicting server name"; then
    echo "⚠️  Found conflicting server names in nginx config"
    
    # Get into the container and check config
    echo "Current nginx configs:"
    docker exec chase_nginx ls -la /etc/nginx/conf.d/
    
    # Look for duplicate configs
    echo ""
    echo "Checking for duplicate server blocks:"
    docker exec chase_nginx grep -r "server_name.*chasepay.pro" /etc/nginx/conf.d/
    
    echo ""
    echo "To fix this issue:"
    echo "1. Check docker-compose.yml for duplicate nginx config volumes"
    echo "2. Ensure only one config file defines chasepay.pro"
    echo "3. Restart nginx: docker-compose restart nginx"
else
    echo "✅ No nginx configuration conflicts found"
fi