#!/bin/bash
set -e

echo "==============================================="
echo "Collective RereCaptcha Release Process"
echo "==============================================="
echo ""

# Check required environment variables
echo "Checking required environment variables..."
REQUIRED_VARS=("PYPI_TOKEN" "NPM_TOKEN")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        echo ""
        echo "Please set the following environment variables:"
        echo "  export PYPI_TOKEN='your-pypi-token'"
        echo "  export NPM_TOKEN='your-npm-token'"
        echo "  export GITHUB_TOKEN='your-github-token'  # optional, for GitHub releases"
        exit 1
    fi
done
echo "✅ All required environment variables are set"
echo ""

# Setup Node.js
echo "Setting up Node.js environment..."
if command -v nvm &> /dev/null; then
    nvm use
    echo "✅ Switched to Node.js version from .nvmrc"
else
    echo "⚠️  nvm not found, assuming Node.js is already configured"
    echo "   Current Node.js version: $(node --version)"
fi
echo ""

# Verify npm authentication
echo "Verifying npm authentication..."
npm whoami > /dev/null 2>&1 || {
    echo "❌ npm authentication failed"
    echo "Please run: npm login"
    exit 1
}
echo "✅ npm authentication verified"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd "$(dirname "$0")/../frontend"
pnpm install 2>&1 | tail -20
echo "✅ Frontend dependencies installed"
echo ""

# Go back to root
cd "$(dirname "$0")/.."

# Run release
echo "Starting release process..."
echo ""
uvx repoplone release

echo ""
echo "==============================================="
echo "✅ Release completed successfully!"
echo "==============================================="
