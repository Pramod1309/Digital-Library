FROM node:18-alpine AS builder

WORKDIR /app

Copy package files
COPY package*.json ./

Install dependencies with legacy peer deps for React 19
RUN npm install --legacy-peer-deps

Copy source code
COPY . .

Build the application
RUN npm run build

Production stage - Serve with nginx
FROM nginx:alpine

Copy built assets from builder
COPY --from=builder /app/build /usr/share/nginx/html

Copy nginx configuration if exists
COPY deploy/nginx/nginx.conf /etc/nginx/conf.d/default.conf 2>/dev/null || echo "server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

Expose port
EXPOSE 80

Start Nginx
CMD ["nginx", "-g", "daemon off;"]
