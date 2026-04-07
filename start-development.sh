#!/bin/bash

# Development Startup Script
echo "Starting Digital Library in Development Mode..."
echo "Domain: localhost"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"

# Set environment variables for development
export FLASK_ENV=development
export ENVIRONMENT=development
export DOMAIN=localhost
export FRONTEND_URL=http://localhost:3000
export ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    cd backend
    python -m venv venv
    source venv/Scripts/activate  # Windows
    # source venv/bin/activate  # Linux/Mac
    pip install -r requirements.txt
    cd ..
fi

# Start backend server
echo "Starting backend server..."
cd backend
source venv/Scripts/activate  # Windows
# source venv/bin/activate  # Linux/Mac
python server.py &
BACKEND_PID=$!
cd ..

# Start frontend server
echo "Starting frontend server..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "Development servers started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
