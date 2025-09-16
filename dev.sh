#!/bin/bash

# Development startup script for Voice Project

echo "🚀 Starting Voice Project in development mode..."

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            echo "debian"
        elif [ -f /etc/redhat-release ]; then
            echo "redhat"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "📦 Bun is not installed. Installing Bun..."
    
    # Install Bun
    curl -fsSL https://bun.sh/install | bash
    
    # Add to PATH for current session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Verify installation
    if ! command -v bun &> /dev/null; then
        echo "❌ Bun installation failed. Please install manually from https://bun.sh"
        exit 1
    fi
    
    echo "✅ Bun installed successfully"
fi

# Check if npm/node is installed
if ! command -v npm &> /dev/null; then
    echo "📦 Node.js is not installed. Installing Node.js..."
    
    if [ "$OS" == "debian" ]; then
        # Install Node.js via NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ "$OS" == "redhat" ]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    elif [ "$OS" == "macos" ]; then
        if command -v brew &> /dev/null; then
            brew install node
        else
            echo "❌ Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    else
        # Use nvm for generic installation
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 20
        nvm use 20
    fi
    
    # Verify installation
    if ! command -v npm &> /dev/null; then
        echo "❌ Node.js installation failed. Please install manually"
        exit 1
    fi
    
    echo "✅ Node.js installed successfully"
fi

# Install dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && bun install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Check if .env file exists in backend
if [ ! -f "backend/.env" ]; then
    echo "⚠️  No .env file found in backend. Copying from .env.example..."
    cp backend/.env.example backend/.env
    echo "📝 Please update backend/.env with your database credentials"
fi

# Start both services
echo "🎯 Starting backend on port 3000..."
echo "🎯 Starting frontend on port 3001..."

# Run both services in parallel
trap 'kill 0' EXIT

cd backend && bun run dev &
BACKEND_PID=$!

cd frontend && npm run dev &
FRONTEND_PID=$!

echo "✅ Voice Project is running!"
echo "   Backend: http://localhost:3000"
echo "   Frontend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

wait