#!/bin/bash

# Production Deployment Script for Hostinger
echo "Deploying Digital Library to Production..."
echo "Domain: koshquest.in"
echo "Frontend: https://koshquest.in"
echo "Backend: https://koshquest.in/api"

# Set environment variables for production
export FLASK_ENV=production
export ENVIRONMENT=production
export DOMAIN=koshquest.in
export FRONTEND_URL=https://koshquest.in
export ALLOWED_ORIGINS=https://koshquest.in

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Create upload directory if it doesn't exist
mkdir -p uploads

# Start backend server
echo "Starting backend server in production mode..."
python server.py

echo "Backend server started on production domain!"
echo "API available at: https://koshquest.in/api"
