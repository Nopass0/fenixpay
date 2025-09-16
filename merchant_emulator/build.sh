#!/bin/bash

# Build script for merchant emulator

echo "Building Merchant Emulator..."

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo "Error: Cargo is not installed. Please install Rust."
    exit 1
fi

# Build in release mode
cargo build --release --offline 2>/dev/null || cargo build --release

echo "Build complete! Run with: ./target/release/merchant-emulator"