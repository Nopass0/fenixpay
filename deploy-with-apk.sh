#!/bin/bash

# Deploy Chase with APK build

echo "================================================"
echo "    Deploying Chase with APK Build"
echo "================================================"

# Get server URL from environment or use default
SERVER_URL=${SERVER_URL:-https://chase.example.com}
echo "Server URL: $SERVER_URL"

# Build APK first
echo ""
echo "Building Android APK..."
echo "================================================"

cd apk || exit 1

# Update BASE_URL in build.gradle
echo "Updating BASE_URL to: $SERVER_URL"
sed -i.bak "s|buildConfigField \"String\", \"BASE_URL\", '\".*\"'|buildConfigField \"String\", \"BASE_URL\", '\"$SERVER_URL\"'|g" app/build.gradle

# Get current version
CURRENT_VERSION_CODE=$(grep "versionCode" app/build.gradle | head -1 | awk '{print $2}')
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))
VERSION_NAME="1.0.$NEW_VERSION_CODE"

# Update version
sed -i.bak "s/versionCode $CURRENT_VERSION_CODE/versionCode $NEW_VERSION_CODE/g" app/build.gradle
sed -i.bak "s/versionName \".*\"/versionName \"$VERSION_NAME\"/g" app/build.gradle

echo "Building version $VERSION_NAME..."

# Build APK
./gradlew clean assembleRelease

# Check if build was successful
if [ -f app/build/outputs/apk/release/app-release-unsigned.apk ]; then
    echo "✅ APK built successfully!"
    
    # Copy APK to backend uploads directory
    mkdir -p ../backend/uploads/apk
    cp app/build/outputs/apk/release/app-release-unsigned.apk ../backend/uploads/apk/chase-mobile.apk
    
    # Get file size
    FILE_SIZE=$(stat -c%s "app/build/outputs/apk/release/app-release-unsigned.apk" 2>/dev/null || stat -f%z "app/build/outputs/apk/release/app-release-unsigned.apk" 2>/dev/null)
    
    # Create version info file
    cat > ../backend/uploads/apk/version-info.json << EOF
{
  "version": "$VERSION_NAME",
  "versionCode": $NEW_VERSION_CODE,
  "fileSize": $FILE_SIZE,
  "buildDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "serverUrl": "$SERVER_URL"
}
EOF

else
    echo "❌ APK build failed!"
    # Restore original build.gradle
    mv app/build.gradle.bak app/build.gradle
    exit 1
fi

# Restore original build.gradle
mv app/build.gradle.bak app/build.gradle

cd ..

echo ""
echo "Deploying application..."
echo "================================================"

# Run normal deployment
docker-compose up -d --build

echo ""
echo "Configuring SSL certificates..."
echo "================================================"

# Wait for containers to be fully up
echo "Waiting for containers to start..."
sleep 10

# Navigate to chasepay directory and configure SSL
cd /chasepay/ || {
    echo "❌ Warning: Could not navigate to /chasepay/ directory"
    echo "   Please manually run the following commands:"
    echo "   cd /chasepay/"
    echo "   cat ssl/certificate.crt ssl/certificate_ca.crt > ssl/fullchain.crt"
    echo "   docker compose restart nginx"
}

# If we successfully changed to /chasepay/
if [ -d "ssl" ]; then
    echo "Creating fullchain certificate..."
    cat ssl/certificate.crt ssl/certificate_ca.crt > ssl/fullchain.crt
    
    echo "Restarting nginx container..."
    docker compose restart nginx
    
    echo "✅ SSL configuration complete!"
else
    echo "❌ Warning: SSL directory not found"
    echo "   Please ensure SSL certificates are properly configured"
fi

# Return to original directory
cd - > /dev/null 2>&1

echo ""
echo "✅ Deployment complete!"
echo "   APK Version: $VERSION_NAME"
echo "   APK Location: /uploads/apk/chase-mobile.apk"
echo "   Server URL: $SERVER_URL"