#!/bin/bash

# Exit on any error
set -e

# Create and activate Python virtual environment
echo "Setting up Python virtual environment..."
python -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
cd backend
pip install -r requirements.txt

# Initialize the database
echo "Initializing database..."
python init_db.py
cd ..

# Start the backend server in the background
echo "Starting backend server..."
cd backend
python server.py &
BACKEND_PID=$!
cd ..

# Go to frontend directory
cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Build the frontend
echo "Building frontend..."
npm run build

# Start the frontend server
echo "Starting frontend server..."
npm start &
FRONTEND_PID=$!

# Function to handle shutdown
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM

# Keep the script running
wait $BACKEND_PID $FRONTEND_PID
npm install

# Build the frontend
echo "Building frontend..."
npm run build

# Start the frontend server
echo "Starting frontend server..."
npm start

# Keep the container running
tail -f /dev/null
