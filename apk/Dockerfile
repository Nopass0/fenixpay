FROM openjdk:11-jdk-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=$ANDROID_SDK_ROOT
ENV PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools

# Download and install Android SDK
RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools && \
    cd $ANDROID_SDK_ROOT/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip -q commandlinetools-linux-9477386_latest.zip && \
    mv cmdline-tools latest && \
    rm commandlinetools-linux-9477386_latest.zip

# Accept licenses
RUN yes | sdkmanager --licenses

# Install required SDK components
RUN sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "build-tools;34.0.0" \
    "extras;android;m2repository" \
    "extras;google;m2repository"

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Make gradlew executable
RUN chmod +x gradlew

# Build the APK
ARG BUILD_TYPE=release
ARG BASE_URL
ENV DEBUG_BASE_URL=$BASE_URL
ENV PROD_BASE_URL=$BASE_URL

RUN if [ "$BUILD_TYPE" = "debug" ]; then \
        ./gradlew assembleDebug; \
    else \
        ./gradlew assembleRelease; \
    fi

# Copy APK to output directory
RUN mkdir -p /output && \
    cp app/build/outputs/apk/${BUILD_TYPE}/*.apk /output/chase-app.apk

CMD ["echo", "Build complete. APK is in /output/chase-app.apk"]