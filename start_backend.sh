#!/usr/bin/env bash
echo "Starting BNTU Bot Backend..."

if cd /root/BentumWeb/backend 2>/dev/null; then
    echo "Found project at: $(pwd)"
else
    echo "ERROR: Backend folder not found!"
    echo "Please check the paths in this script."
    echo
    read -p "Press any key to continue..."
    exit 1
fi

echo "Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found!"
    echo "Please install Python from: https://www.python.org/downloads/"
    read -p "Press any key to continue..."
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "Failed to create virtual environment!"
        read -p "Press any key to continue..."
        exit 1
    fi
fi

source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "Failed to activate virtual environment!"
    read -p "Press any key to continue..."
    exit 1
fi

echo "Installing dependencies..."
venv/bin/python -m pip install -r ../requirements.txt

echo "Starting Django server..."
hypercorn backend.asgi:application --bind 127.0.0.1:1337