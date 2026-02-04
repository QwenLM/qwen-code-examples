#!/bin/bash

# Qwen Excel Agent Setup Script

echo "Setting up Qwen Excel Agent..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$MAJOR_VERSION" -lt 20 ]; then
    echo "Node.js version is too low. Please upgrade to Node.js 20+."
    exit 1
fi

echo "Node.js version: $NODE_VERSION"

# Install dependencies
echo "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "Failed to install dependencies. Trying with legacy peer deps..."
    npm install --legacy-peer-deps
fi

if [ $? -ne 0 ]; then
    echo "Failed to install dependencies. Trying with yarn..."
    if command -v yarn &> /dev/null; then
        yarn install
    else
        echo "Yarn is not installed. Please install yarn or fix npm issues."
        exit 1
    fi
fi

# Install @qwen-code/sdk specifically
echo "Installing @qwen-code/sdk..."
npm install @qwen-code/sdk@^0.1.1

if [ $? -eq 0 ]; then
    echo "Checking for Qwen Code CLI installation..."
    if ! command -v qwen &> /dev/null; then
        echo "Qwen Code CLI not found. Installing globally..."
        npm install -g qwen-code
    else
        echo "Qwen Code CLI is already installed."
    fi

    echo ""
    echo "Setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Make sure you have a local LLM service running (e.g., Ollama with a Qwen model)"
    echo "2. Optionally set your model environment variable:"
    echo "   export QWEN_CODE_MODEL='ollama/qwen2.5:7b'"
    echo "3. Run: npm start"
    echo ""
    echo "For more information about local setup, see LOCAL_SETUP.md"
else
    echo "Failed to install @qwen-code/sdk. Please check your network connection and try again."
    exit 1
fi