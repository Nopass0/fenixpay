#!/bin/sh
set -e

echo "==================== NGINX SSL SETUP ===================="
echo "Checking SSL certificates configuration..."

SSL_DIR="/etc/nginx/ssl"

# Show what's in the SSL directory
if [ -d "$SSL_DIR" ]; then
    echo "SSL directory contents:"
    ls -la "$SSL_DIR" 2>/dev/null || echo "  (directory empty or not accessible)"
else
    echo "WARNING: SSL directory not found at $SSL_DIR"
fi

# Check for required certificate files
CERT_FOUND=false
if [ -f "$SSL_DIR/fullchain.crt" ] && [ -f "$SSL_DIR/certificate.key" ]; then
    echo "✓ Found fullchain.crt and certificate.key"
    CERT_FOUND=true

    # Verify certificate validity
    echo -e "\nVerifying certificate..."
    if openssl x509 -in "$SSL_DIR/fullchain.crt" -noout -checkend 0 2>/dev/null; then
        echo "✓ Certificate is valid and not expired"
    else
        echo "⚠ Certificate validation failed or expired"
    fi

    # Check certificate domain
    echo "Certificate domain info:"
    openssl x509 -in "$SSL_DIR/fullchain.crt" -noout -subject 2>/dev/null | grep -o "CN=.*" || echo "  Could not extract domain"

elif [ -f "$SSL_DIR/certificate.crt" ] && [ -f "$SSL_DIR/certificate_ca.crt" ] && [ -f "$SSL_DIR/certificate.key" ]; then
    echo "⚠ Individual certificate files found but fullchain.crt is missing"
    echo "Creating fullchain.crt from individual files..."

    # Since the volume is read-only, we can't create it here
    echo "ERROR: Cannot create fullchain.crt in read-only volume"
    echo "Please run this command on the host system:"
    echo "  cat /fenixpay/ssl/certificate.crt /fenixpay/ssl/certificate_ca.crt > /fenixpay/ssl/fullchain.crt"
    exit 1
else
    echo "✗ SSL certificates not configured properly"
    echo "Required files:"
    echo "  - $SSL_DIR/fullchain.crt"
    echo "  - $SSL_DIR/certificate.key"
    echo ""
    echo "Current SSL directory state:"
    ls -la "$SSL_DIR" 2>/dev/null || echo "  Directory not accessible"
fi

# Check nginx configuration
echo -e "\n==================== NGINX CONFIG TEST ===================="
if nginx -t 2>&1; then
    echo "✓ Nginx configuration test passed"
else
    echo "✗ Nginx configuration test failed"
    nginx -t
    exit 1
fi

# Decide whether to start nginx
if [ "$CERT_FOUND" = "true" ] || [ "$NGINX_ALLOW_NO_SSL" = "true" ]; then
    echo -e "\n==================== STARTING NGINX ===================="
    if [ "$CERT_FOUND" = "true" ]; then
        echo "Starting nginx with SSL enabled for fenixpay.xyz..."
    else
        echo "Starting nginx without SSL (NGINX_ALLOW_NO_SSL=true)..."
    fi
    exec nginx -g 'daemon off;'
else
    echo -e "\n✗ Cannot start nginx: SSL certificates not found"
    echo "To bypass this check (for testing only), set NGINX_ALLOW_NO_SSL=true"
    exit 1
fi