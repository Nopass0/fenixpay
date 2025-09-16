#!/bin/bash
# Restart all services

echo "🔄 Restarting Chase services..."
echo ""

# Stop services
/home/user/projects/chase/.gpt/stop-services.sh

echo ""
sleep 2

# Start services
/home/user/projects/chase/.gpt/start-services.sh