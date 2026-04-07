#!/bin/bash

# Hostinger VPS Deployment Script for koshquest.in
# This script sets up the entire production environment

echo "=== Digital Library VPS Deployment ==="
echo "Domain: koshquest.in"
echo "IP: 72.61.240.92"
echo "This script will set up everything needed for production deployment"

# Update system packages
echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "Step 2: Installing required packages..."
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git sqlite3 supervisor

# Create project directory
echo "Step 3: Creating project directory..."
sudo mkdir -p /var/www/koshquest.in
sudo chown $USER:$USER /var/www/koshquest.in

# Clone or copy project files
echo "Step 4: Setting up project files..."
cd /var/www/koshquest.in

# If you're cloning from GitHub (uncomment if needed)
# git clone https://github.com/Pramod1309/Digital-Library.git .

# If you're uploading files manually, make sure they're in /var/www/koshquest.in/

# Set up Python virtual environment
echo "Step 5: Setting up Python virtual environment..."
cd /var/www/koshquest.in/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create necessary directories
echo "Step 6: Creating necessary directories..."
mkdir -p /var/www/koshquest.in/backend/uploads
mkdir -p /var/www/koshquest.in/frontend/build

# Set up environment variables
echo "Step 7: Setting up production environment..."
cat > /var/www/koshquest.in/backend/.env << EOF
# Production Environment Configuration
SECRET_KEY=wonder-library-secret-key-2024-production-secure-token-koshquest-in-deployment
DATABASE_URL=sqlite:///wonder_learning.db
ENVIRONMENT=production
DOMAIN=koshquest.in
FRONTEND_URL=https://koshquest.in
ALLOWED_ORIGINS=https://koshquest.in
UPLOAD_DIR=uploads
MAX_FILE_SIZE=104857600
EOF

# Set file permissions
echo "Step 8: Setting file permissions..."
sudo chown -R $USER:$USER /var/www/koshquest.in
chmod -R 755 /var/www/koshquest.in
chmod -R 777 /var/www/koshquest.in/backend/uploads

# Build frontend
echo "Step 9: Building frontend..."
cd /var/www/koshquest.in/frontend
npm install
npm run build

# Set up Nginx configuration
echo "Step 10: Setting up Nginx configuration..."
sudo tee /etc/nginx/sites-available/koshquest.in << 'EOF'
server {
    listen 80;
    server_name koshquest.in www.koshquest.in;

    # Frontend static files
    location / {
        root /var/www/koshquest.in/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # File uploads
    location /uploads {
        alias /var/www/koshquest.in/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable the site
echo "Step 11: Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/koshquest.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Set up SSL certificate
echo "Step 12: Setting up SSL certificate..."
sudo certbot --nginx -d koshquest.in -d www.koshquest.in --non-interactive --agree-tos --email admin@koshquest.in

# Set up Supervisor for backend process
echo "Step 13: Setting up Supervisor for backend..."
sudo tee /etc/supervisor/conf.d/koshquest.in.conf << 'EOF'
[program:koshquest-backend]
command=/var/www/koshquest.in/backend/venv/bin/python server.py
directory=/var/www/koshquest.in/backend
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/koshquest.in-backend.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=10
environment=ENVIRONMENT=production
EOF

# Update Supervisor and start the backend
echo "Step 14: Starting backend service..."
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start koshquest-backend

# Set up automatic SSL renewal
echo "Step 15: Setting up automatic SSL renewal..."
sudo crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

# Set up firewall
echo "Step 16: Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Final status check
echo "Step 17: Final status check..."
echo "=== Deployment Summary ==="
echo "Domain: https://koshquest.in"
echo "API: https://koshquest.in/api"
echo "Uploads: https://koshquest.in/uploads"
echo ""
echo "Checking service status:"
sudo systemctl status nginx --no-pager
sudo supervisorctl status koshquest-backend --no-pager

echo ""
echo "=== Deployment Complete! ==="
echo "Your Digital Library is now live at https://koshquest.in"
echo "Backend API is available at https://koshquest.in/api"
echo ""
echo "To check logs:"
echo "  Nginx: sudo journalctl -u nginx"
echo "  Backend: sudo tail -f /var/log/koshquest.in-backend.log"
echo ""
echo "To restart services:"
echo "  Nginx: sudo systemctl restart nginx"
echo "  Backend: sudo supervisorctl restart koshquest-backend"
