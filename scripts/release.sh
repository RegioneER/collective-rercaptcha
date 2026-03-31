#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==============================================="
echo "Collective RereCaptcha Release Process"
echo "==============================================="
echo ""

# Check required environment variables
echo "Checking required environment variables..."
REQUIRED_VARS=("UV_PUBLISH_TOKEN")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        echo ""
        echo "Please set the following environment variables:"
        echo "  export UV_PUBLISH_TOKEN='your-pypi-token'"
        echo "  export GITHUB_TOKEN='your-github-token'  # optional, for GitHub releases"
        exit 1
    fi
done
echo "✅ Required environment variables are set"
echo ""

# Setup Node.js
echo "Setting up Node.js environment..."
if command -v nvm &> /dev/null; then
    nvm use
    echo "✅ Switched to Node.js version from .nvmrc"
elif [ -n "${NVM_DIR:-}" ] && [ -s "${NVM_DIR}/nvm.sh" ]; then
    # Load nvm in non-interactive shells.
    # shellcheck disable=SC1090
    . "${NVM_DIR}/nvm.sh"
    nvm use
    echo "✅ Switched to Node.js version from .nvmrc"
elif [ -s "$HOME/.nvm/nvm.sh" ]; then
    # Common default nvm installation path.
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh"
    nvm use
    echo "✅ Switched to Node.js version from .nvmrc"
else
    echo "⚠️  nvm not found, using current Node.js"
fi

CURRENT_NODE_VERSION="$(node --version)"
echo "   Current Node.js version: ${CURRENT_NODE_VERSION}"
node -e 'const [maj, min] = process.versions.node.split(".").map(Number); if (maj < 18 || (maj === 18 && min < 12)) process.exit(1);' || {
    echo "❌ Node.js ${CURRENT_NODE_VERSION} is too old for pnpm (requires >= 18.12)"
    echo "   Install nvm and run: nvm use"
    exit 1
}
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
cd "${REPO_ROOT}/frontend"
pnpm install
echo "✅ Frontend dependencies installed"
echo ""

# Go back to root
cd "${REPO_ROOT}"

# Run release
echo "Starting release process..."
echo ""
uvx repoplone release

echo ""
echo "==============================================="
echo "✅ Release completed successfully!"
echo "==============================================="
