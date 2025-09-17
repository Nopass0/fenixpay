#!/bin/bash
set -e

echo "==================== CREATING SELF-SIGNED SSL CERTIFICATE ===================="
echo "This will create a self-signed certificate for fenixpay.xyz"
echo "NOTE: Browsers will show security warnings with self-signed certificates"
echo ""

# Determine SSL directory based on environment
if [ "$1" == "server" ]; then
    SSL_DIR="/fenixpay/ssl"
    echo "Running on server, using: $SSL_DIR"
elif [ -d "/mnt/c/Projects/fenixpay/ssl" ]; then
    SSL_DIR="/mnt/c/Projects/fenixpay/ssl"
    echo "Running locally, using: $SSL_DIR"
else
    SSL_DIR="./ssl"
    echo "Using relative SSL directory: $SSL_DIR"
fi

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Backup existing certificates if they exist
BACKUP_DIR="${SSL_DIR}/backup_$(date +%Y%m%d_%H%M%S)"
if [ -f "$SSL_DIR/certificate.crt" ] || [ -f "$SSL_DIR/certificate.key" ] || [ -f "$SSL_DIR/fullchain.crt" ]; then
    echo "=== Backing up existing certificates to $BACKUP_DIR ==="
    mkdir -p "$BACKUP_DIR"

    # Move all existing certificate files to backup
    for file in certificate.crt certificate.key certificate_ca.crt fullchain.crt fenixpay_xyz.crt fenixpay_xyz.ca-bundle fenixpay_xyz.p7b csr.txt key.txt; do
        if [ -f "$SSL_DIR/$file" ]; then
            mv "$SSL_DIR/$file" "$BACKUP_DIR/"
            echo "  Backed up: $file"
        fi
    done
    echo "✓ Backup completed"
fi

# Generate private key
echo -e "\n=== Generating new private key ==="
openssl genrsa -out "$SSL_DIR/certificate.key" 2048
echo "✓ Created: certificate.key"

# Generate self-signed certificate
echo -e "\n=== Generating self-signed certificate ==="
openssl req -new -x509 \
    -key "$SSL_DIR/certificate.key" \
    -out "$SSL_DIR/certificate.crt" \
    -days 365 \
    -subj "/C=US/ST=State/L=City/O=Fenixpay/CN=fenixpay.xyz" \
    -addext "subjectAltName=DNS:fenixpay.xyz,DNS:www.fenixpay.xyz,DNS:*.fenixpay.xyz"

echo "✓ Created: certificate.crt"

# Create fullchain (for self-signed, it's the same as the certificate)
cp "$SSL_DIR/certificate.crt" "$SSL_DIR/fullchain.crt"
echo "✓ Created: fullchain.crt"

# Also create certificate_ca.crt for compatibility
cp "$SSL_DIR/certificate.crt" "$SSL_DIR/certificate_ca.crt"
echo "✓ Created: certificate_ca.crt"

# Set proper permissions
chmod 644 "$SSL_DIR"/*.crt
chmod 600 "$SSL_DIR"/*.key
echo "✓ Set proper permissions"

# Verify the certificate
echo -e "\n=== Verifying self-signed certificate ==="

# Check certificate details
echo "1. Certificate details:"
openssl x509 -in "$SSL_DIR/certificate.crt" -noout -subject -issuer -dates

# Verify key and certificate match
echo -e "\n2. Verifying key and certificate match:"
CERT_MD5=$(openssl x509 -noout -modulus -in "$SSL_DIR/certificate.crt" | openssl md5 | cut -d' ' -f2)
KEY_MD5=$(openssl rsa -noout -modulus -in "$SSL_DIR/certificate.key" | openssl md5 | cut -d' ' -f2)

if [ "$CERT_MD5" = "$KEY_MD5" ]; then
    echo "   ✓ Certificate and key match!"
    echo "   MD5: $CERT_MD5"
else
    echo "   ✗ ERROR: Certificate and key do NOT match!"
    echo "   This should not happen with self-signed certificates"
    exit 1
fi

# Show certificate SANs
echo -e "\n3. Subject Alternative Names:"
openssl x509 -in "$SSL_DIR/certificate.crt" -noout -text | grep -A1 "Subject Alternative Name" | tail -1

echo -e "\n==================== SUMMARY ===================="
echo "✓ Self-signed SSL certificate created successfully!"
echo ""
echo "Certificate files:"
echo "  - $SSL_DIR/certificate.crt (main certificate)"
echo "  - $SSL_DIR/certificate.key (private key)"
echo "  - $SSL_DIR/fullchain.crt (full certificate chain)"
echo "  - $SSL_DIR/certificate_ca.crt (CA certificate)"
echo ""
if [ -d "$BACKUP_DIR" ]; then
    echo "Original certificates backed up to:"
    echo "  $BACKUP_DIR"
    echo ""
fi
echo "⚠ WARNING: This is a self-signed certificate!"
echo "  Browsers will show security warnings."
echo "  This should only be used for testing."
echo ""
echo "To use these certificates, restart your Docker containers."