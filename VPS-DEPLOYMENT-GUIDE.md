# Hostinger VPS Deployment Guide
# Domain: koshquest.in | IP: 72.61.240.92

## Prerequisites
- SSH access: `ssh root@72.61.240.92`
- Domain pointed to VPS: koshquest.in -> 72.61.240.92
- Hostinger KVM2 Plan with Ubuntu/CentOS

## Step-by-Step Deployment Process

### 1. Connect to Your VPS
```bash
ssh root@72.61.240.92
```

### 2. Upload Project Files to VPS

**Option A: Using Git (Recommended)**
```bash
# Clone your repository directly on VPS
cd /var/www/
git clone https://github.com/Pramod1309/Digital-Library.git koshquest.in
cd koshquest.in
```

**Option B: Using SCP (Manual Upload)**
```bash
# From your local machine
scp -r /path/to/your/Digital-Library/* root@72.61.240.92:/var/www/koshquest.in/
```

**Option C: Using Filezilla/SFTP**
- Host: 72.61.240.92
- Username: root
- Password: [your VPS password]
- Port: 22
- Upload all project files to `/var/www/koshquest.in/`

### 3. Run the Automated Deployment Script

Once files are on the VPS, run:
```bash
cd /var/www/koshquest.in
chmod +x deploy-vps-hostinger.sh
./deploy-vps-hostinger.sh
```

### 4. Manual Deployment Steps (if script fails)

#### 4.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

#### 4.2 Install Required Packages
```bash
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git sqlite3 supervisor
```

#### 4.3 Setup Project Structure
```bash
sudo mkdir -p /var/www/koshquest.in
sudo chown $USER:$USER /var/www/koshquest.in
cd /var/www/koshquest.in
```

#### 4.4 Setup Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### 4.5 Create Production Environment
```bash
cat > .env << EOF
SECRET_KEY=wonder-library-secret-key-2024-production-secure-token-koshquest-in-deployment
DATABASE_URL=sqlite:///wonder_learning.db
ENVIRONMENT=production
DOMAIN=koshquest.in
FRONTEND_URL=https://koshquest.in
ALLOWED_ORIGINS=https://koshquest.in
UPLOAD_DIR=uploads
MAX_FILE_SIZE=104857600
EOF
```

#### 4.6 Build Frontend
```bash
cd ../frontend
npm install
npm run build
```

#### 4.7 Setup Nginx
```bash
sudo tee /etc/nginx/sites-available/koshquest.in << 'EOF'
server {
    listen 80;
    server_name koshquest.in www.koshquest.in;

    location / {
        root /var/www/koshquest.in/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

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

    location /uploads {
        alias /var/www/koshquest.in/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/koshquest.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 4.8 Setup SSL Certificate
```bash
sudo certbot --nginx -d koshquest.in -d www.koshquest.in --non-interactive --agree-tos --email admin@koshquest.in
```

#### 4.9 Setup Backend Service
```bash
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

sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start koshquest-backend
```

#### 4.10 Set Permissions
```bash
sudo chown -R www-data:www-data /var/www/koshquest.in
chmod -R 755 /var/www/koshquest.in
chmod -R 777 /var/www/koshquest.in/backend/uploads
```

### 5. Verify Deployment

#### 5.1 Check Service Status
```bash
sudo systemctl status nginx
sudo supervisorctl status koshquest-backend
```

#### 5.2 Check Logs
```bash
# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Backend logs
sudo tail -f /var/log/koshquest.in-backend.log
```

#### 5.3 Test Website
```bash
# Test from server
curl -I https://koshquest.in
curl -I https://koshquest.in/api/health

# Test from your local browser
# https://koshquest.in
# https://koshquest.in/api/health
```

### 6. Troubleshooting Common Issues

#### 6.1 Backend Not Starting
```bash
# Check if port 5000 is in use
sudo netstat -tlnp | grep :5000

# Manually start backend to check errors
cd /var/www/koshquest.in/backend
source venv/bin/activate
python server.py
```

#### 6.2 Nginx Configuration Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo journalctl -u nginx
```

#### 6.3 SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew
```

#### 6.4 Database Issues
```bash
# Check if database exists
ls -la /var/www/koshquest.in/backend/wonder_learning.db

# Check database permissions
sudo chown www-data:www-data /var/www/koshquest.in/backend/wonder_learning.db
```

### 7. Maintenance Commands

#### 7.1 Update Website
```bash
cd /var/www/koshquest.in
git pull origin main
cd frontend && npm run build
sudo supervisorctl restart koshquest-backend
```

#### 7.2 Restart Services
```bash
sudo systemctl restart nginx
sudo supervisorctl restart koshquest-backend
```

#### 7.3 View Logs
```bash
# Real-time log viewing
sudo tail -f /var/log/koshquest.in-backend.log
sudo journalctl -u nginx -f
```

### 8. Security Recommendations

#### 8.1 Firewall Configuration
```bash
sudo ufw status
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### 8.2 Regular Updates
```bash
sudo apt update && sudo apt upgrade -y
```

#### 8.3 Backup Database
```bash
# Create backup script
cat > /home/backup-db.sh << 'EOF'
#!/bin/bash
cp /var/www/koshquest.in/backend/wonder_learning.db /var/www/koshquest.in/backups/wonder_learning_$(date +%Y%m%d_%H%M%S).db
EOF

chmod +x /home/backup-db.sh

# Add to cron for daily backups
echo "0 2 * * * /home/backup-db.sh" | sudo crontab -
```

### 9. Expected URLs After Deployment

- **Frontend**: https://koshquest.in
- **Backend API**: https://koshquest.in/api
- **Admin Login**: https://koshquest.in/admin
- **School Login**: https://koshquest.in/school
- **Health Check**: https://koshquest.in/api/health

### 10. Contact Information

If you encounter issues:
1. Check the logs first
2. Verify all services are running
3. Ensure domain DNS is pointing correctly
4. Check SSL certificate status

## Quick Start Summary

```bash
# 1. Connect to VPS
ssh root@72.61.240.92

# 2. Clone project (if using Git)
cd /var/www/
git clone https://github.com/Pramod1309/Digital-Library.git koshquest.in

# 3. Run deployment script
cd /var/www/koshquest.in
chmod +x deploy-vps-hostinger.sh
./deploy-vps-hostinger.sh

# 4. Verify deployment
curl -I https://koshquest.in
```

Your Digital Library will be live at https://koshquest.in!
