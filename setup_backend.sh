#!/bin/bash

# Configuration
VENV_DIR="backend/venv"
REQ_FILE="backend/requirements.txt"
DOTENV_FILE="backend/.env"
DOTENV_EXAMPLE="backend/.env.example"

echo "--- Stockholm Travel Planner: Backend Setup ---"

# 1. Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment in $VENV_DIR..."
    # Using 'py' launcher as primary, fallback to 'python'
    if command -v py &> /dev/null; then
        py -m venv "$VENV_DIR"
    elif command -v python &> /dev/null; then
        python -m venv "$VENV_DIR"
    elif command -v python3 &> /dev/null; then
        python3 -m venv "$VENV_DIR"
    else
        echo "❌ Error: Python not found. Please install Python from python.org"
        exit 1
    fi
else
    echo "✅ Virtual environment already exists."
fi

# 2. Activate and Install Requirements
echo "Installing dependencies from $REQ_FILE..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows/Git Bash
    source "$VENV_DIR/Scripts/activate"
else
    # Mac/Linux
    source "$VENV_DIR/bin/activate"
fi

pip install --upgrade pip
pip install -r "$REQ_FILE"

# 3. Create .env from example if not exists
if [ ! -f "$DOTENV_FILE" ]; then
    echo "Creating .env from example..."
    if [ -f "$DOTENV_EXAMPLE" ]; then
        cp "$DOTENV_EXAMPLE" "$DOTENV_FILE"
        echo "⚠️  Please update $DOTENV_FILE with your SL API Key."
    else
        echo "SL_REALTIME_API_KEY=233bffb3002c456bb99d042f44d00fee" > "$DOTENV_FILE"
        echo "✅ Created .env with your provided API key."
    fi
else
    echo "✅ .env file already exists."
fi

echo "--- Setup Complete! ---"
echo "To activate: source backend/venv/Scripts/activate"
echo "To run API test: python backend/test_api_v3.py"
