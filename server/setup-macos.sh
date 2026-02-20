#!/bin/bash
# Setup script for nginx + PM2 load balancing on macOS
# Run this from the server directory: ./setup-macos.sh

set -e

echo "=== Voting System Load Balancer Setup (macOS) ==="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "[ERROR] Homebrew is required. Install from https://brew.sh"
    echo "Run: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
echo "[OK] Homebrew found"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Install with: brew install node"
    exit 1
fi
echo "[OK] Node.js $(node --version) found"

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo ""
    echo "Installing nginx..."
    brew install nginx
else
    echo "[OK] nginx is already installed"
fi

# Detect Mac architecture for correct paths
if [[ $(uname -m) == 'arm64' ]]; then
    NGINX_CONF_DIR="/opt/homebrew/etc/nginx"
    NGINX_LOG_DIR="/opt/homebrew/var/log/nginx"
    echo "[INFO] Detected Apple Silicon Mac (arm64)"
else
    NGINX_CONF_DIR="/usr/local/etc/nginx"
    NGINX_LOG_DIR="/usr/local/var/log/nginx"
    echo "[INFO] Detected Intel Mac (x86_64)"
fi

# Create servers directory if it doesn't exist
mkdir -p "$NGINX_CONF_DIR/servers"
mkdir -p "$NGINX_LOG_DIR"

# Update nginx.conf to include servers directory (if not already)
if ! grep -q "include servers" "$NGINX_CONF_DIR/nginx.conf"; then
    echo ""
    echo "Adding include directive to nginx.conf..."
    # Add include before the last closing brace in http block
    if [[ $(uname) == 'Darwin' ]]; then
        sed -i '' 's/}$/    include servers\/*;\n}/' "$NGINX_CONF_DIR/nginx.conf"
    else
        sed -i 's/}$/    include servers\/*;\n}/' "$NGINX_CONF_DIR/nginx.conf"
    fi
fi

# Copy our config (adjust log paths for Intel Macs)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_CONFIG="$SCRIPT_DIR/nginx-macos.conf"

if [[ ! -f "$SOURCE_CONFIG" ]]; then
    # Fallback to nginx.conf if nginx-macos.conf doesn't exist
    SOURCE_CONFIG="$SCRIPT_DIR/nginx.conf"
fi

if [[ $(uname -m) == 'arm64' ]]; then
    cp "$SOURCE_CONFIG" "$NGINX_CONF_DIR/servers/voting-app.conf"
else
    # Adjust paths for Intel Mac
    sed 's|/opt/homebrew|/usr/local|g' "$SOURCE_CONFIG" > "$NGINX_CONF_DIR/servers/voting-app.conf"
fi

echo ""
echo "[OK] nginx config installed to: $NGINX_CONF_DIR/servers/voting-app.conf"

# Test nginx configuration
echo ""
echo "Testing nginx configuration..."
nginx -t

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Quick Start Commands:" 
echo "  1. Install dependencies:     npm install"
echo "  2. Start PM2 instances:      npm run start:pm2"
echo "  3. Start nginx:              npm run start:nginx"
echo "  4. Test load balancing:      curl http://localhost:8081/health"
echo ""
echo "Or start everything at once:   npm run start:all"
echo ""
echo "Other Commands:"
echo "  - View PM2 logs:      npm run logs"
echo "  - PM2 status:         npm run status"
echo "  - Stop everything:    npm run stop:all"
echo "  - Restart PM2:        npm run restart:pm2"
echo ""
echo "Manual nginx commands:"
echo "  - Start:    brew services start nginx"
echo "  - Stop:     brew services stop nginx"
echo "  - Reload:   nginx -s reload"
echo ""
echo "nginx Commands:"
echo "  - Stop:         brew services stop nginx"
echo "  - Restart:      brew services restart nginx"
echo "  - Test config:  nginx -t"
echo ""
