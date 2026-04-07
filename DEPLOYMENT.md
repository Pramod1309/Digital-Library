# Digital Library - Production Deployment Guide

## Environment Configuration

This project supports both development (localhost) and production (koshquest.in) environments.

### Development Environment (Local)
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Database**: SQLite (backend/wonder_learning.db)

### Production Environment (Hostinger)
- **Frontend**: https://koshquest.in
- **Backend**: https://koshquest.in/api
- **Database**: SQLite (backend/wonder_learning.db)

## Configuration Files

### Frontend Environment Variables

#### Development (.env / .env.development)
```
REACT_APP_BACKEND_URL=http://localhost:5000
REACT_APP_ENVIRONMENT=development
REACT_APP_DOMAIN=localhost
```

#### Production (.env.production)
```
REACT_APP_BACKEND_URL=https://koshquest.in/api
REACT_APP_ENVIRONMENT=production
REACT_APP_DOMAIN=koshquest.in
```

### Backend Environment Variables

#### Development (backend/.env)
```
ENVIRONMENT=development
DOMAIN=localhost
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

#### Production (backend/.env.production)
```
ENVIRONMENT=production
DOMAIN=koshquest.in
FRONTEND_URL=https://koshquest.in
ALLOWED_ORIGINS=https://koshquest.in
```

## Local Development Setup

1. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/Scripts/activate  # Windows
   pip install -r requirements.txt

   # Frontend
   cd ../frontend
   npm install
   ```

2. **Start Development Servers**
   ```bash
   # Use the development script
   ./start-development.sh
   
   # Or start manually:
   # Backend (Terminal 1)
   cd backend
   python server.py
   
   # Frontend (Terminal 2)
   cd frontend
   npm start
   ```

3. **Access Applications**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: backend/wonder_learning.db

## Production Deployment (Hostinger)

### Prerequisites
- Domain: koshquest.in
- Hostinger account with Python support
- SSL certificate (HTTPS required)

### Steps

1. **Upload Files to Hostinger**
   - Upload entire project to Hostinger file manager
   - Ensure all files are in the correct directory structure

2. **Configure Environment**
   - Set environment variables in Hostinger control panel
   - Or use the provided `.env.production` files

3. **Install Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Configure Domain**
   - Point koshquest.in to Hostinger hosting
   - Set up SSL certificate for HTTPS
   - Configure domain to serve frontend from root
   - Configure /api path to serve backend

5. **Start Backend Server**
   ```bash
   cd backend
   python server.py
   ```

6. **Build Frontend (if needed)**
   ```bash
   cd frontend
   npm run build
   # Upload build/ folder to Hostinger public_html
   ```

### Hostinger Configuration

#### Apache/Nginx Configuration
```
# Serve frontend at root
# Proxy /api requests to backend server
# Enable HTTPS
# Handle static files
```

#### Cron Job (Optional)
```bash
# Auto-restart backend server if it crashes
* * * * * cd /path/to/backend && python server.py
```

## Database

The project uses SQLite database:
- **Development**: `backend/wonder_learning.db`
- **Production**: Same file uploaded to Hostinger

### Database Features
- User authentication (Admin/School)
- Resource management
- Support tickets
- Chat system
- Announcements

## CORS Configuration

CORS is automatically configured based on environment:
- **Development**: Allows localhost:3000 and 127.0.0.1:3000
- **Production**: Allows only koshquest.in

## File Uploads

Upload directory: `backend/uploads/`
- Max file size: 100MB
- Supported formats: PDF, images, videos, documents
- Production: Ensure directory permissions on Hostinger

## Security

- JWT authentication
- HTTPS required in production
- CORS protection
- File upload validation
- SQL injection prevention (SQLAlchemy)

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check ALLOWED_ORIGINS environment variable
   - Ensure HTTPS in production

2. **Database Connection**
   - Verify wonder_learning.db exists
   - Check file permissions

3. **File Upload Issues**
   - Check uploads directory permissions
   - Verify file size limits

4. **Domain Not Working**
   - Check DNS settings
   - Verify SSL certificate
   - Check Hostinger configuration

### Environment Detection

The application automatically detects environment based on:
- `ENVIRONMENT` environment variable
- Domain name
- Frontend URL configuration

## Support

For deployment issues:
1. Check Hostinger documentation
2. Verify environment variables
3. Check server logs
4. Ensure all dependencies are installed
