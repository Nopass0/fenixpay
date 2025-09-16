#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Chase Dependencies Installer ===${NC}"

# Function to run commands with sudo if not root
run_cmd() {
    if [ "$EUID" -ne 0 ]; then
        if command -v sudo &> /dev/null; then
            sudo "$@"
        else
            "$@"
        fi
    else
        "$@"
    fi
}

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
else
    echo -e "${RED}Cannot detect OS version${NC}"
    exit 1
fi

echo -e "${BLUE}Detected OS: $OS $VERSION${NC}"

# Update package manager
echo -e "${YELLOW}Updating package manager...${NC}"
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    run_cmd apt-get update
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
    run_cmd yum update -y
fi

# Install basic tools
echo -e "${YELLOW}Installing basic tools...${NC}"
if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    run_cmd apt-get install -y curl wget git unzip
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
    run_cmd yum install -y curl wget git unzip
fi

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    run_cmd sh get-docker.sh
    rm get-docker.sh
    run_cmd systemctl start docker
    run_cmd systemctl enable docker
    
    # Add current user to docker group
    if [ "$EUID" -ne 0 ]; then
        run_cmd usermod -aG docker $USER
        echo -e "${YELLOW}You may need to log out and back in for docker group changes to take effect${NC}"
    fi
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        echo -e "${GREEN}Docker Compose v2 already installed${NC}"
    else
        echo -e "${YELLOW}Installing Docker Compose...${NC}"
        COMPOSE_VERSION="2.24.0"
        run_cmd curl -L "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        run_cmd chmod +x /usr/local/bin/docker-compose
    fi
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# Install Node.js 20
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
    echo -e "${YELLOW}Installing Node.js 20...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | run_cmd bash -
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        run_cmd apt-get install -y nodejs
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
        run_cmd yum install -y nodejs
    fi
else
    echo -e "${GREEN}Node.js $(node -v) already installed${NC}"
fi

# Install npm if not present
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Installing npm...${NC}"
    run_cmd npm install -g npm@latest
else
    echo -e "${GREEN}npm $(npm -v) already installed${NC}"
fi

# Install Bun
if ! command -v bun &> /dev/null; then
    echo -e "${YELLOW}Installing Bun...${NC}"
    curl -fsSL https://bun.sh/install | bash
    
    # Add bun to PATH for current session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Make bun available system-wide
    if [ -f "$HOME/.bun/bin/bun" ]; then
        run_cmd ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
    fi
else
    echo -e "${GREEN}Bun $(bun -v) already installed${NC}"
fi

# Install PostgreSQL client (for psql commands)
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}Installing PostgreSQL client...${NC}"
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        run_cmd apt-get install -y postgresql-client
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
        run_cmd yum install -y postgresql
    fi
else
    echo -e "${GREEN}PostgreSQL client already installed${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}Creating project directories...${NC}"
mkdir -p ssl
mkdir -p nginx/logs
mkdir -p backend/uploads

# Set permissions
chmod 755 ssl
chmod 755 nginx/logs
chmod 755 backend/uploads

# Verify installations
echo -e "${BLUE}=== Verification ===${NC}"
echo -e "Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
echo -e "Docker Compose: $(docker-compose --version 2>/dev/null || docker compose version 2>/dev/null || echo 'Not installed')"
echo -e "Node.js: $(node -v 2>/dev/null || echo 'Not installed')"
echo -e "npm: $(npm -v 2>/dev/null || echo 'Not installed')"
echo -e "Bun: $(bun -v 2>/dev/null || echo 'Not installed')"
echo -e "Git: $(git --version 2>/dev/null || echo 'Not installed')"

echo -e "${GREEN}=== Dependencies installation completed! ===${NC}"

# Install project dependencies if package files exist
if [ -f "backend/package.json" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && bun install && cd ..
fi

if [ -f "frontend/package.json" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

echo -e "${GREEN}All dependencies installed successfully!${NC}"