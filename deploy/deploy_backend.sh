#!/bin/bash

# Stop any existing backend process
pm2 delete wldl-backend 2>/dev/null

# Navigate to backend directory
cd /opt/wldl/backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# Set environment variables
export FLASK_APP=server.py
export FLASK_ENV=production

# Initialize database (if needed)
python3 init_db.py

# Start the backend with PM2
pm2 start gunicorn --name "wldl-backend" --bind 0.0.0.0:5000 "server:app"

# Save PM2 process list
pm2 save

# Configure PM2 to start on boot
pm2 startup

# Start PM2 on boot
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u wldl --hp /home/wldl

# Save the PM2 process list
pm2 save

echo "Backend deployment complete."
