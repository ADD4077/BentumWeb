#!/bin/bash
echo "Starting BNTU Bot Frontend..."

if cd /root/BentumWeb/frontend 2>/dev/null; then
    echo "Found project at: $(pwd)"
else
    echo "ERROR: Frontend folder not found!"
    echo "Please check the paths in this script."
    echo
    read -p "Press any key to continue..."
    exit 1
fi

echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found!"
    echo "Please install Node.js from: https://nodejs.org"
    echo
    read -p "Press any key to continue..."
    exit 1
fi

node --version

echo "Starting frontend server..."
echo
echo "Frontend will be available at: http://localhost:5173"
echo "Press Ctrl+C to stop the server"
echo

echo "Installing dependencies..."
npm install

echo
echo "Starting development server..."
npm run dev