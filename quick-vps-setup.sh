#!/bin/bash

# Quick VPS Setup Script - Run this immediately after connecting to VPS
echo "=== Quick VPS Setup for koshquest.in ==="

# Basic setup
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget nano

# Create project directory
sudo mkdir -p /var/www/koshquest.in
sudo chown $USER:$USER /var/www/koshquest.in

echo "=== Ready for project upload ==="
echo "Now upload your project files to /var/www/koshquest.in/"
echo "Then run: chmod +x deploy-vps-hostinger.sh && ./deploy-vps-hostinger.sh"
