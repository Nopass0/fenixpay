#!/bin/sh
set -e

echo "Starting nginx SSL certificate setup..."

# Check if fullchain.crt exists
if [ -f "/etc/nginx/ssl/fullchain.crt" ]; then
    echo "Using existing fullchain.crt"
    ls -la /etc/nginx/ssl/
elif [ -f "/etc/nginx/ssl/certificate.crt" ] && [ -f "/etc/nginx/ssl/certificate_ca.crt" ]; then
    echo "WARNING: fullchain.crt not found but individual certificates exist."
    echo "Please create fullchain.crt on the host system by running:"
    echo "  cat ssl/certificate.crt ssl/certificate_ca.crt > ssl/fullchain.crt"
    echo ""
    echo "SSL directory contents:"
    ls -la /etc/nginx/ssl/
    
    # Exit with error since we can't write to read-only volume
    exit 1
else
    echo "ERROR: SSL certificates not found!"
    echo "Please ensure one of the following files exist in the ssl/ directory:"
    echo "  - fullchain.crt (recommended)"
    echo "  - OR both certificate.crt and certificate_ca.crt"
    echo ""
    echo "To create fullchain.crt, run on the host:"
    echo "  cat ssl/certificate.crt ssl/certificate_ca.crt > ssl/fullchain.crt"
    
    # For development/testing, we might want to continue anyway
    if [ "$NGINX_ALLOW_NO_SSL" = "true" ]; then
        echo "NGINX_ALLOW_NO_SSL is set, continuing without SSL..."
    else
        exit 1
    fi
fi

# Execute nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'