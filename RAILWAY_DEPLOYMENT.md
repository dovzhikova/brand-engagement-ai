# Railway Deployment Guide

This guide will help you deploy the Brand Engagement AI Platform to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Railway CLI installed (already done)
- GitHub repository connected (already done)

## Architecture on Railway

The application will be deployed as **4 separate services**:

1. **PostgreSQL** - Database
2. **Redis** - Cache and job queue
3. **Backend** - Node.js API server
4. **Frontend** - React application

## Deployment Steps

### Step 1: Login to Railway

```bash
railway login
```

This will open your browser for authentication.

### Step 2: Initialize Railway Project

```bash
cd /Users/dariadovzhikova/brand-engagement-ai
railway init
```

Select:
- "Create new project"
- Name: "brand-engagement-ai" (or your preferred name)
- Link to your GitHub repository when prompted

### Step 3: Add PostgreSQL Database

```bash
railway add --database postgresql
```

This creates a PostgreSQL instance and automatically sets the `DATABASE_URL` environment variable.

### Step 4: Add Redis

```bash
railway add --database redis
```

This creates a Redis instance and automatically sets the `REDIS_URL` environment variable.

### Step 5: Create Backend Service

```bash
# Create backend service from the backend directory
railway service create backend
railway link backend

# Set the root directory for backend
railway up --service backend --path backend
```

### Step 6: Set Backend Environment Variables

```bash
# Set all required environment variables for backend
railway variables set JWT_SECRET=$(openssl rand -hex 32) --service backend
railway variables set ENCRYPTION_KEY=$(openssl rand -hex 32) --service backend
railway variables set NODE_ENV=production --service backend
railway variables set PORT=3001 --service backend

# Reddit OAuth (you'll need to create a Reddit app first)
railway variables set REDDIT_CLIENT_ID=your-reddit-client-id --service backend
railway variables set REDDIT_CLIENT_SECRET=your-reddit-client-secret --service backend
railway variables set REDDIT_REDIRECT_URI=https://your-frontend-url.railway.app/api/accounts/oauth/callback --service backend
railway variables set REDDIT_USER_AGENT=BrandEngagementAI/1.0 --service backend

# AI Services (choose one or both)
railway variables set AI_PROVIDER=openai --service backend
railway variables set OPENAI_API_KEY=your-openai-api-key --service backend
# OR
# railway variables set AI_PROVIDER=anthropic --service backend
# railway variables set ANTHROPIC_API_KEY=your-anthropic-api-key --service backend
```

**Note:** The `DATABASE_URL` and `REDIS_URL` are automatically set when you add those services.

### Step 7: Create Frontend Service

```bash
# Create frontend service from the frontend directory
railway service create frontend
railway link frontend

# Set the root directory for frontend
railway up --service frontend --path frontend
```

### Step 8: Set Frontend Environment Variables

After backend is deployed, get the backend URL and set it:

```bash
# Get backend URL
railway domain --service backend

# Set frontend env (replace with actual backend URL)
railway variables set VITE_API_URL=https://your-backend-url.railway.app --service frontend
```

### Step 9: Run Database Migrations

After backend is deployed:

```bash
# Connect to backend service
railway run --service backend npx prisma migrate deploy

# Seed the database
railway run --service backend npm run db:seed
```

### Step 10: Generate Public URLs

```bash
# Generate domain for backend
railway domain --service backend

# Generate domain for frontend
railway domain --service frontend
```

## Alternative: Deploy via Railway Dashboard

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Choose your `brand-engagement-ai` repository
4. Railway will auto-detect the monorepo structure

5. **Add Services:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Click "New" → "Database" → "Add Redis"
   - Click "New" → "GitHub Repo" → Select backend path
   - Click "New" → "GitHub Repo" → Select frontend path

6. **Configure each service:**
   - Set environment variables in the Variables tab
   - Set root directory in Settings → Service Settings
   - Generate domain in Settings → Networking

## Environment Variables Reference

### Backend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection (auto-set) | - |
| `REDIS_URL` | Redis connection (auto-set) | - |
| `JWT_SECRET` | JWT signing secret | (auto-generated) |
| `ENCRYPTION_KEY` | For encrypting OAuth tokens | (auto-generated) |
| `REDDIT_CLIENT_ID` | Reddit OAuth client ID | `abc123...` |
| `REDDIT_CLIENT_SECRET` | Reddit OAuth secret | `xyz789...` |
| `REDDIT_REDIRECT_URI` | OAuth callback URL | `https://your-app.railway.app/api/...` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | `sk-...` |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) | `sk-ant-...` |
| `AI_PROVIDER` | AI provider to use | `openai` or `anthropic` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port (auto-set by Railway) | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-frontend.railway.app` |

### Frontend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-backend.railway.app` |

## Post-Deployment

### 1. Update Reddit OAuth Redirect URI

After getting your frontend URL, update the Reddit app settings:
- Go to https://www.reddit.com/prefs/apps
- Edit your app
- Update redirect URI to: `https://your-frontend-url.railway.app/api/accounts/oauth/callback`

### 2. Update Environment Variables

Update the backend environment variable:

```bash
railway variables set REDDIT_REDIRECT_URI=https://your-frontend-url.railway.app/api/accounts/oauth/callback --service backend
railway variables set FRONTEND_URL=https://your-frontend-url.railway.app --service backend
```

### 3. Default Login

After seeding the database, use these credentials:
- Email: `admin@example.com`
- Password: `admin123`

**Important:** Change the admin password immediately after first login!

## Monitoring and Logs

```bash
# View backend logs
railway logs --service backend

# View frontend logs
railway logs --service frontend

# Open Railway dashboard
railway open
```

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is set correctly
- Verify all required environment variables are present
- Check logs: `railway logs --service backend`

### Frontend can't connect to backend
- Verify VITE_API_URL is set correctly
- Check CORS settings in backend (FRONTEND_URL)
- Ensure backend service is running

### Database connection errors
- Ensure Prisma migrations have run
- Check DATABASE_URL format
- Try running migrations manually: `railway run --service backend npx prisma migrate deploy`

## Costs

Railway offers:
- **Hobby Plan**: $5/month + usage
- **Pro Plan**: $20/month + usage

Estimated monthly cost for this app (with moderate usage):
- PostgreSQL: ~$5-10
- Redis: ~$5
- Backend: ~$5
- Frontend: ~$2
- **Total**: ~$17-22/month

## Useful Commands

```bash
# Check service status
railway status

# View all environment variables
railway variables --service backend

# Restart a service
railway restart --service backend

# Delete a service
railway service delete backend

# Connect to PostgreSQL
railway connect postgres

# Connect to Redis
railway connect redis
```

## Next Steps

After deployment:

1. Test the application thoroughly
2. Set up monitoring and alerts
3. Configure backup strategy for PostgreSQL
4. Set up CI/CD for automatic deployments
5. Review and optimize Railway usage

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Repository: https://github.com/dovzhikova/brand-engagement-ai
