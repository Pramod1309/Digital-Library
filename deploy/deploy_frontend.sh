#!/bin/bash

# Navigate to frontend directory
cd /opt/wldl/frontend

# Install Node.js dependencies
npm install

# Build the React application for production
npm run build

# Set proper permissions
sudo chown -R wldl:wldl /opt/wldl/frontend

# Start the frontend with PM2
pm2 delete wldl-frontend 2>/dev/null
pm2 serve build 3000 --spa --name "wldl-frontend"

# Save PM2 process list
pm2 save

echo "Frontend deployment complete."
