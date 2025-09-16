#!/bin/bash

# Script to toggle maintenance mode on/off

if [ "$1" = "on" ]; then
    echo "Enabling maintenance mode..."
    sed -i 's/NEXT_PUBLIC_MAINTENANCE_MODE=false/NEXT_PUBLIC_MAINTENANCE_MODE=true/' frontend/.env.production
    echo "✓ Maintenance mode enabled"
    echo "Rebuilding frontend container..."
    docker-compose -f docker-compose.prod.yml up -d --build frontend
elif [ "$1" = "off" ]; then
    echo "Disabling maintenance mode..."
    sed -i 's/NEXT_PUBLIC_MAINTENANCE_MODE=true/NEXT_PUBLIC_MAINTENANCE_MODE=false/' frontend/.env.production
    echo "✓ Maintenance mode disabled"
    echo "Rebuilding frontend container..."
    docker-compose -f docker-compose.prod.yml up -d --build frontend
else
    echo "Usage: $0 [on|off]"
    echo "  on  - Enable maintenance mode"
    echo "  off - Disable maintenance mode"
    exit 1
fi