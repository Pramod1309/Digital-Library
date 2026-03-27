#!/bin/bash

# Update and upgrade system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx python3-pip python3-venv nodejs npm git

# Install PM2 for process management
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Create a system user for the application
sudo useradd --system --shell /bin/false --home-dir /opt/wldl wldl

# Set up application directory
sudo mkdir -p /opt/wldl/{frontend,backend,logs}

# Set permissions
sudo chown -R wldl:wldl /opt/wldl
sudo chmod -R 755 /opt/wldl

echo "Server setup complete. Please proceed with deployment."
