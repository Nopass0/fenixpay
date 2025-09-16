#!/bin/bash

# Create custom directories in user's home that we have permissions for
export MERCHANT_DATA_DIR="$HOME/.merchant-emulator/data"
export MERCHANT_EXPORT_DIR="$HOME/.merchant-emulator/exports"

# Create directories if they don't exist
mkdir -p "$MERCHANT_DATA_DIR"
mkdir -p "$MERCHANT_EXPORT_DIR"

# Run the merchant emulator
cd "$(dirname "$0")"
cargo run