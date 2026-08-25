# ProjectB Deployment Guide

## Overview
ProjectB has been configured with Neon PostgreSQL database integration and is ready for deployment to lite.ragsignal.com.

## Build Status
- ✅ Build completed successfully
- ✅ Server bundle created: `dist/server.cjs` (74.8 kB)
- ✅ Client assets built: `dist/assets/` (968 kB JS + 50 kB CSS)
- ✅ Database schema initialized in Neon

## Database Configuration
- **Host**: ep-shy-scene-za6dxtvg-pooler.c-2.eu-west-2.aws.neon.tech
- **Port**: 5432 (via pooler)
- **Database**: neondb
- **User**: neondb_owner
- **Connection String**: Set in `.env` as `DATABASE_URL`

### Database Tables Created
1. `users` - User management (id, email, name, timestamps)
2. `projects` - Project data (id, user_id, name, description, timestamps)
3. `analysis_results` - Analysis results storage (id, project_id, data JSONB, timestamps)

## Environment Variables
Required `.env` configuration:
```
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=verify-full
FIREBASE_PROJECT_ID=gen-lang-client-0394969450
VITE_API_URL=https://lite.ragsignal.com/api
NODE_ENV=production
PORT=3000
```

## Deployment Steps

### Option 1: Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start dist/server.cjs --name "projectb"
pm2 save
pm2 startup
```

### Option 2: Using Docker
```bash
# Build Docker image
docker build -t projectb .

# Run container
docker run -d \
  -e DATABASE_URL="..." \
  -p 3000:3000 \
  --name projectb \
  projectb
```

### Option 3: Direct Node.js
```bash
node dist/server.cjs
```

## Deployment to lite.ragsignal.com

### Steps:
1. SSH into the server:
   ```bash
   ssh user@lite.ragsignal.com
   ```

2. Clone or pull the repository:
   ```bash
   cd /var/www/projectb
   git pull origin main
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

5. Build the application:
   ```bash
   npm run build
   ```

6. Start the application:
   ```bash
   npm run start
   # or with PM2
   pm2 start dist/server.cjs --name "projectb"
   ```

7. Configure reverse proxy (Nginx/Apache) to listen on port 3000

8. Verify deployment:
   ```bash
   curl https://lite.ragsignal.com/api/health
   ```

## Features Deployed
- ✅ Dark mode with system preference fallback
- ✅ Local persistence (localStorage)
- ✅ Firebase integration
- ✅ Perplexity Sonar engine support
- ✅ Advanced competitor categorization
- ✅ Firecrawl integration support
- ✅ PostgreSQL/Neon database backend

## Monitoring
- Monitor application logs: `pm2 logs projectb`
- Check database connections: Use Neon dashboard
- Monitor CPU/Memory: `pm2 plus` (PM2 monitoring)

## Rollback
To rollback to a previous version:
```bash
git checkout <previous-commit>
npm run build
pm2 restart projectb
```

## Support
Database is managed through Neon Console at: https://console.neon.tech
