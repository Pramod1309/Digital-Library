# WLDL Deployment Guide

This guide provides step-by-step instructions to deploy the WLDL application to a production environment.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [SSL Configuration](#ssl-configuration)
7. [CI/CD Setup](#cicd-setup)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

- Node.js (v16 or higher)
- Python (3.8 or higher)
- PostgreSQL (for production database)
- PM2 (for Node.js process management)
- Nginx (for reverse proxy and static file serving)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

## Backend Deployment

### 1. Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required system packages
sudo apt install -y python3-pip python3-venv nginx postgresql postgresql-contrib

# Install PM2 globally
npm install -g pm2
```

### 2. Database Setup

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE wldl_production;
CREATE USER wldl_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE wldl_production TO wldl_user;
\q
```

### 3. Backend Configuration

1. Create a production environment file:

```bash
cd backend
cp .env .env.production
```

2. Update `.env.production` with production settings:

```env
# Database
DATABASE_URL=postgresql://wldl_user:your_secure_password@localhost:5432/wldl_production

# App Settings
SECRET_KEY=your-secure-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,www.your-domain.com

# CORS Settings
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com

# File Storage
UPLOAD_FOLDER=/var/www/wldl/uploads
MAX_CONTENT_LENGTH=16 * 1024 * 1024  # 16MB max upload size
```

### 4. Install Dependencies and Run Migrations

```bash
# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python init_db.py
```

### 5. Set Up PM2 Process Manager

```bash
# Create PM2 ecosystem file
pm2 init

# Edit the created file (ecosystem.config.js) with your configuration
module.exports = {
  apps: [{
    name: 'wldl-backend',
    script: 'server.py',
    interpreter: 'python3',
    env: {
      FLASK_ENV: 'production',
      FLASK_APP: 'server.py',
    },
    watch: true,
    ignore_watch: ['node_modules', 'static', 'uploads'],
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G',
  }]
};

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Frontend Deployment

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Create Production Build

```bash
# Create .env.production file
cp .env .env.production
```

Update `.env.production`:
```env
REACT_APP_API_URL=https://your-backend-domain.com/api
NODE_ENV=production
```

### 3. Build the Application

```bash
npm run build
```

### 4. Serve with PM2

```bash
# Install serve globally
npm install -g serve

# Create PM2 configuration for frontend
pm2 serve build 3000 --spa --name "wldl-frontend"

# Save PM2 configuration
pm2 save
```

## Nginx Configuration

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/wldl
```

Add the following configuration (adjust domain names as needed):

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeout for large file uploads
        client_max_body_size 20M;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Static files
    location /static/ {
        alias /path/to/your/static/files/;
        expires 30d;
        access_log off;
    }
    
    # Uploads
    location /uploads/ {
        alias /var/www/wldl/uploads/;
        expires 30d;
        access_log off;
    }
}
```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/wldl /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## SSL Configuration

Install and configure Let's Encrypt SSL certificate:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Set up automatic renewal
echo "0 0,12 * * * root python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null
```

## CI/CD Setup (GitHub Actions)

Create `.github/workflows/deploy.yml` in your repository:

```yaml
name: Deploy WLDL

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    # Backend deployment
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r backend/requirements.txt
    
    - name: Run migrations
      run: |
        cd backend
        python init_db.py
      env:
        DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
        SECRET_KEY: ${{ secrets.PROD_SECRET_KEY }}
    
    # Frontend deployment
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build
      env:
        REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
    
    # Add deployment steps for your hosting provider here
    # Example for deploying to a server via SSH:
    - name: Deploy to production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.PROD_HOST }}
        username: ${{ secrets.PROD_USERNAME }}
        key: ${{ secrets.PROD_SSH_KEY }}
        script: |
          cd /path/to/your/project
          git pull origin main
          cd backend
          source venv/bin/activate
          pip install -r requirements.txt
          python init_db.py
          cd ../frontend
          npm ci
          npm run build
          pm2 restart all
```

## Monitoring and Maintenance

### 1. Set up monitoring with PM2

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Monitor your application
pm2 monit
```

### 2. Set up log rotation for application logs

Create a new logrotate configuration:

```bash
sudo nano /etc/logrotate.d/wldl
```

Add the following configuration:

```
/var/log/wldl/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        /usr/bin/pm2 reloadLogs >/dev/null 2>&1
    endscript
}
```

### 3. Regular maintenance tasks

```bash
# Check for system updates
sudo apt update && sudo apt upgrade -y

# Check disk space
df -h

# Check running services
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Check application logs
pm2 logs
sudo journalctl -u nginx -f
```

## Backup Strategy

### 1. Database Backups

Create a backup script at `/usr/local/bin/backup_wldl_db.sh`:

```bash
#!/bin/bash

# Create backup directory if it doesn't exist
mkdir -p /backups/wldl/database

# Create database dump
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PGPASSWORD=your_db_password pg_dump -U wldl_user -h localhost -d wldl_production > /backups/wldl/database/wldl_backup_${TIMESTAMP}.sql

# Compress the backup
gzip /backups/wldl/database/wldl_backup_${TIMESTAMP}.sql

# Delete backups older than 30 days
find /backups/wldl/database -name "*.sql.gz" -type f -mtime +30 -delete
```

Make it executable:
```bash
chmod +x /usr/local/bin/backup_wldl_db.sh
```

### 2. Uploads Backup

Create a backup script at `/usr/local/bin/backup_wldl_uploads.sh`:

```bash
#!/bin/bash

# Create backup directory if it doesn't exist
mkdir -p /backups/wldl/uploads

# Create a timestamped archive of the uploads directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf /backups/wldl/uploads/uploads_backup_${TIMESTAMP}.tar.gz -C /var/www/wldl uploads

# Delete backups older than 30 days
find /backups/wldl/uploads -name "*.tar.gz" -type f -mtime +30 -delete
```

Make it executable:
```bash
chmod +x /usr/local/bin/backup_wldl_uploads.sh
```

### 3. Set up cron jobs for automated backups

```bash
# Edit crontab
crontab -e

# Add these lines to run backups daily at 2 AM
0 2 * * * /usr/local/bin/backup_wldl_db.sh
30 2 * * * /usr/local/bin/backup_wldl_uploads.sh
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Enable UFW if not already enabled
sudo ufw enable

# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

### 2. SSH Hardening

Edit `/etc/ssh/sshd_config`:

```
Port 2222  # Change default SSH port
PermitRootLogin no
PasswordAuthentication no
X11Forwarding no
MaxAuthTries 3
MaxSessions 2
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Automatic Security Updates

```bash
# Install unattended-upgrades
sudo apt install unattended-upgrades apt-listchanges -y

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Scaling Considerations

### 1. Database Scaling

For higher traffic, consider:
- Setting up PostgreSQL replication
- Using a managed database service (like AWS RDS or Google Cloud SQL)
- Implementing database connection pooling with PgBouncer

### 2. Application Scaling

- Use a load balancer (like Nginx or HAProxy) to distribute traffic across multiple application servers
- Consider containerizing the application with Docker for easier scaling
- Use a process manager like Kubernetes for container orchestration at scale

### 3. Caching

- Implement Redis or Memcached for caching frequently accessed data
- Use CDN for static assets

## Troubleshooting

### Common Issues and Solutions

1. **Application not starting**
   - Check PM2 logs: `pm2 logs`
   - Verify environment variables are set correctly
   - Check if the port is already in use: `sudo lsof -i :8000`

2. **Database connection issues**
   - Verify database service is running: `sudo systemctl status postgresql`
   - Check connection string in environment variables
   - Verify database user permissions

3. **Nginx 502 Bad Gateway**
   - Check if the backend service is running: `pm2 status`
   - Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
   - Verify proxy_pass URL in Nginx config

4. **File upload issues**
   - Check file permissions in uploads directory
   - Verify MAX_CONTENT_LENGTH in backend config
   - Check Nginx client_max_body_size setting

## Conclusion

This deployment guide covers the complete setup of the WLDL application in a production environment. Regular maintenance, monitoring, and backups are essential for keeping the application running smoothly. Adjust the configurations according to your specific requirements and scale the infrastructure as needed based on your application's growth.
