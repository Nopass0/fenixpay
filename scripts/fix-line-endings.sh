#!/bin/bash
# Fix line endings for all shell scripts
echo "Fixing line endings for shell scripts..."

# Find all .sh files and fix their line endings
find . -type f -name "*.sh" -exec dos2unix {} 2>/dev/null \; -o -exec sed -i 's/\r$//' {} \;

# Specifically fix the docker-entrypoint.sh
if [ -f backend/scripts/docker-entrypoint.sh ]; then
    echo "Fixing backend/scripts/docker-entrypoint.sh..."
    sed -i 's/\r$//' backend/scripts/docker-entrypoint.sh
    # Remove BOM if present
    sed -i '1s/^\xEF\xBB\xBF//' backend/scripts/docker-entrypoint.sh
    chmod +x backend/scripts/docker-entrypoint.sh
fi

# Fix nginx entrypoint
if [ -f nginx/docker-entrypoint.sh ]; then
    echo "Fixing nginx/docker-entrypoint.sh..."
    sed -i 's/\r$//' nginx/docker-entrypoint.sh
    sed -i '1s/^\xEF\xBB\xBF//' nginx/docker-entrypoint.sh
    chmod +x nginx/docker-entrypoint.sh
fi

echo "Line endings fixed!"