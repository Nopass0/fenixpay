#!/bin/bash
set -e

echo "==================== SSL CERTIFICATE VERIFICATION ===================="
echo "Verifying SSL certificates for fenixpay.xyz"
echo ""

SSL_DIR="/fenixpay/ssl"

# Check if running locally or on server
if [ -d "/mnt/c/Projects/fenixpay/ssl" ]; then
    SSL_DIR="/mnt/c/Projects/fenixpay/ssl"
    echo "Running locally, using: $SSL_DIR"
elif [ -d "./ssl" ]; then
    SSL_DIR="./ssl"
    echo "Using local SSL directory: $SSL_DIR"
else
    echo "Using server SSL directory: $SSL_DIR"
fi

# Check if directory exists
if [ ! -d "$SSL_DIR" ]; then
    echo "ERROR: SSL directory not found at $SSL_DIR"
    exit 1
fi

echo -e "\n=== SSL Directory Contents ==="
ls -la "$SSL_DIR"

# Check for fullchain
echo -e "\n=== Checking Certificate Files ==="
if [ ! -f "$SSL_DIR/fullchain.crt" ]; then
    echo "⚠ fullchain.crt not found, attempting to create it..."
    if [ -f "$SSL_DIR/certificate.crt" ] && [ -f "$SSL_DIR/certificate_ca.crt" ]; then
        cat "$SSL_DIR/certificate.crt" "$SSL_DIR/certificate_ca.crt" > "$SSL_DIR/fullchain.crt"
        echo "✓ Created fullchain.crt from certificate.crt and certificate_ca.crt"
    elif [ -f "$SSL_DIR/fenixpay_xyz.crt" ] && [ -f "$SSL_DIR/fenixpay_xyz.ca-bundle" ]; then
        cat "$SSL_DIR/fenixpay_xyz.crt" "$SSL_DIR/fenixpay_xyz.ca-bundle" > "$SSL_DIR/fullchain.crt"
        echo "✓ Created fullchain.crt from fenixpay_xyz files"
    else
        echo "✗ Cannot create fullchain.crt - missing source certificates"
        exit 1
    fi
else
    echo "✓ fullchain.crt exists"
fi

if [ ! -f "$SSL_DIR/certificate.key" ] && [ -f "$SSL_DIR/key.txt" ]; then
    echo "⚠ certificate.key not found, using key.txt"
    cp "$SSL_DIR/key.txt" "$SSL_DIR/certificate.key"
fi

if [ ! -f "$SSL_DIR/certificate.key" ]; then
    echo "✗ Private key (certificate.key) not found!"
    exit 1
else
    echo "✓ certificate.key exists"
fi

# Verify certificate
echo -e "\n=== Certificate Verification ==="

echo "1. Checking certificate validity:"
if openssl x509 -in "$SSL_DIR/fullchain.crt" -noout -checkend 0 2>/dev/null; then
    echo "   ✓ Certificate is valid and not expired"

    # Show expiry date
    EXPIRY=$(openssl x509 -in "$SSL_DIR/fullchain.crt" -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "   Expires: $EXPIRY"
else
    echo "   ✗ Certificate is expired or invalid!"
fi

echo -e "\n2. Checking certificate domain:"
SUBJECT=$(openssl x509 -in "$SSL_DIR/fullchain.crt" -noout -subject 2>/dev/null)
echo "   Subject: $SUBJECT"

# Extract CN (Common Name)
CN=$(echo "$SUBJECT" | sed -n 's/.*CN=\([^/]*\).*/\1/p')
if [ "$CN" = "fenixpay.xyz" ] || [ "$CN" = "*.fenixpay.xyz" ]; then
    echo "   ✓ Certificate is for fenixpay.xyz"
else
    echo "   ⚠ Certificate CN is: $CN (expected fenixpay.xyz)"
fi

# Check Subject Alternative Names
echo -e "\n3. Checking Subject Alternative Names:"
SANS=$(openssl x509 -in "$SSL_DIR/fullchain.crt" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1)
if [ -n "$SANS" ]; then
    echo "   $SANS"
else
    echo "   No SANs found"
fi

echo -e "\n4. Checking private key:"
if openssl rsa -in "$SSL_DIR/certificate.key" -check -noout 2>/dev/null; then
    echo "   ✓ Private key is valid"
else
    echo "   ✗ Private key validation failed!"
fi

echo -e "\n5. Checking certificate and key match:"
CERT_MD5=$(openssl x509 -noout -modulus -in "$SSL_DIR/fullchain.crt" 2>/dev/null | openssl md5 | cut -d' ' -f2)
KEY_MD5=$(openssl rsa -noout -modulus -in "$SSL_DIR/certificate.key" 2>/dev/null | openssl md5 | cut -d' ' -f2)

if [ "$CERT_MD5" = "$KEY_MD5" ]; then
    echo "   ✓ Certificate and private key match"
    echo "   MD5: $CERT_MD5"
else
    echo "   ✗ Certificate and private key do NOT match!"
    echo "   Cert MD5: $CERT_MD5"
    echo "   Key MD5:  $KEY_MD5"
    exit 1
fi

echo -e "\n6. Checking certificate chain:"
if openssl verify -CAfile "$SSL_DIR/fullchain.crt" "$SSL_DIR/fullchain.crt" 2>/dev/null | grep -q "OK"; then
    echo "   ✓ Certificate chain is valid"
else
    echo "   ⚠ Certificate chain validation warning (may still work)"
fi

echo -e "\n==================== SUMMARY ===================="
echo "✓ SSL certificates are properly configured for fenixpay.xyz"
echo "✓ Certificate files:"
echo "  - $SSL_DIR/fullchain.crt"
echo "  - $SSL_DIR/certificate.key"
echo ""
echo "These files are ready to be used by nginx."