#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found. Please create one from .env.example"
    exit 1
fi

# Create necessary directories
mkdir -p deploy/ssl
mkdir -p deploy/letsencrypt

# Build and start containers
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Initialize database
echo "Initializing database..."
docker-compose exec backend python init_db.py

# Set up SSL with Let's Encrypt (uncomment and configure for production)
# echo "Setting up SSL with Let's Encrypt..."
# docker-compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot/ -d koshquest.in -d www.koshquest.in --email ${CERTBOT_EMAIL} --agree-tos --no-eff-email --staging

# Restart Nginx to apply SSL configuration
# docker-compose restart nginx

echo "Deployment complete!"
echo "Your application is now running at https://koshquest.in"

# Show container status
echo "\nContainer status:"
docker-compose ps
