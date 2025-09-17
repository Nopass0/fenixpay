#!/bin/bash
set -e

echo "==================== SSL CERTIFICATE SETUP ===================="
echo "Setting up SSL certificates for fenixpay.xyz"

# Navigate to project directory
PROJECT_DIR="/home/fenixpay/fenixpay"
SSL_SOURCE_DIR="${PROJECT_DIR}/ssl"
SSL_TARGET_DIR="/chasepay/ssl"

# Create target SSL directory
echo "Creating SSL directory at ${SSL_TARGET_DIR}..."
sudo mkdir -p "${SSL_TARGET_DIR}"

# Check if source SSL files exist
if [ ! -d "${SSL_SOURCE_DIR}" ]; then
    echo "ERROR: SSL source directory not found at ${SSL_SOURCE_DIR}"
    exit 1
fi

cd "${SSL_SOURCE_DIR}"

# Check for required certificate files
if [ ! -f "certificate.key" ]; then
    echo "ERROR: certificate.key not found!"
    exit 1
fi

# Create fullchain certificate if it doesn't exist
if [ ! -f "fullchain.crt" ]; then
    echo "Creating fullchain certificate..."
    if [ -f "certificate.crt" ] && [ -f "certificate_ca.crt" ]; then
        cat certificate.crt certificate_ca.crt > fullchain.crt
        echo "✔ Fullchain certificate created"
    elif [ -f "fenixpay_xyz.crt" ] && [ -f "fenixpay_xyz.ca-bundle" ]; then
        cat fenixpay_xyz.crt fenixpay_xyz.ca-bundle > fullchain.crt
        echo "✔ Fullchain certificate created from fenixpay_xyz files"
    else
        echo "ERROR: Cannot create fullchain certificate - missing certificate files"
        exit 1
    fi
fi

# Copy certificates to target directory
echo "Copying certificates to ${SSL_TARGET_DIR}..."
sudo cp -f certificate.key "${SSL_TARGET_DIR}/"
sudo cp -f fullchain.crt "${SSL_TARGET_DIR}/"

# Also copy individual certificates for compatibility
if [ -f "certificate.crt" ]; then
    sudo cp -f certificate.crt "${SSL_TARGET_DIR}/"
fi

if [ -f "certificate_ca.crt" ]; then
    sudo cp -f certificate_ca.crt "${SSL_TARGET_DIR}/"
elif [ -f "fenixpay_xyz.ca-bundle" ]; then
    sudo cp -f fenixpay_xyz.ca-bundle "${SSL_TARGET_DIR}/certificate_ca.crt"
fi

# Set proper permissions
echo "Setting proper permissions..."
sudo chown -R root:root "${SSL_TARGET_DIR}"
sudo chmod 644 "${SSL_TARGET_DIR}"/*.crt
sudo chmod 600 "${SSL_TARGET_DIR}"/*.key

# Verify certificates
echo -e "\n==================== CERTIFICATE VERIFICATION ===================="

echo "Checking certificate validity..."
if openssl x509 -in "${SSL_TARGET_DIR}/fullchain.crt" -noout -dates 2>/dev/null; then
    echo "✔ Certificate is valid"
else
    echo "⚠ Certificate validation warning (may still work)"
fi

echo -e "\nChecking certificate domain..."
if openssl x509 -in "${SSL_TARGET_DIR}/fullchain.crt" -noout -subject 2>/dev/null | grep -q "fenixpay.xyz"; then
    echo "✔ Certificate is for fenixpay.xyz"
else
    echo "⚠ Certificate domain mismatch - checking alternative names..."
    openssl x509 -in "${SSL_TARGET_DIR}/fullchain.crt" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name"
fi

echo -e "\nChecking private key..."
if openssl rsa -in "${SSL_TARGET_DIR}/certificate.key" -check -noout 2>/dev/null; then
    echo "✔ Private key is valid"
else
    echo "✗ Private key validation failed!"
fi

echo -e "\nChecking certificate and key match..."
CERT_MD5=$(openssl x509 -noout -modulus -in "${SSL_TARGET_DIR}/fullchain.crt" 2>/dev/null | openssl md5)
KEY_MD5=$(openssl rsa -noout -modulus -in "${SSL_TARGET_DIR}/certificate.key" 2>/dev/null | openssl md5)

if [ "$CERT_MD5" = "$KEY_MD5" ]; then
    echo "✔ Certificate and private key match"
else
    echo "✗ Certificate and private key do NOT match!"
    exit 1
fi

echo -e "\n==================== SSL FILES IN TARGET DIRECTORY ===================="
ls -la "${SSL_TARGET_DIR}/"

echo -e "\n✔ SSL setup completed successfully!"
echo "Certificates are now available at: ${SSL_TARGET_DIR}"
echo "Nginx will use: ${SSL_TARGET_DIR}/fullchain.crt and ${SSL_TARGET_DIR}/certificate.key"