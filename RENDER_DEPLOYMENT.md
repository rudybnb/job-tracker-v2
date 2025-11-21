# Deploy Job Tracker to Render

This guide will help you deploy the Job Tracker app to Render for a stable, always-on production environment.

## Prerequisites

1. **GitHub account** - Render deploys from Git repositories
2. **Render account** - Sign up at [render.com](https://render.com)
3. **Telegram Bot Token** - Your existing bot token
4. **Database** - Render will create a PostgreSQL database automatically

## Step 1: Download Project Files

1. In Manus UI, go to **Code** panel
2. Click **"Download All Files"** button
3. Extract the ZIP file to a folder on your computer

## Step 2: Create GitHub Repository

1. Go to [github.com](https://github.com) and log in
2. Click **"New repository"**
3. Name it: `job-tracker`
4. Set to **Private** (recommended)
5. Click **"Create repository"**

## Step 3: Push Code to GitHub

Open terminal/command prompt in your project folder and run:

```bash
git init
git add .
git commit -m "Initial commit - Job Tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/job-tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Step 4: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Sign up with GitHub (recommended)
4. Authorize Render to access your repositories

## Step 5: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. In Render Dashboard, click **"New +"** → **"Blueprint"**
2. Connect your `job-tracker` repository
3. Render will detect `render.yaml` automatically
4. Click **"Apply"**
5. Render will create:
   - Web Service (job-tracker)
   - PostgreSQL Database (job-tracker-db)

### Option B: Manual Setup

If Blueprint doesn't work, create services manually:

**Create Database:**
1. Click **"New +"** → **"PostgreSQL"**
2. Name: `job-tracker-db`
3. Database: `job_tracker`
4. User: `job_tracker_user`
5. PostgreSQL Version: **16** (latest)
6. Plan: **Starter** ($7/month) or **Free** (sleeps after 90 days)
7. Click **"Create Database"**
8. **Copy the Internal Database URL** (you'll need this)
   - Format: `postgresql://user:password@host:port/database`
   - Example: `postgresql://job_tracker_user:abc123@dpg-xxx.oregon-postgres.render.com/job_tracker`

**Create Web Service:**
1. Click **"New +"** → **"Web Service"**
2. Connect your `job-tracker` repository
3. Name: `job-tracker`
4. Environment: **Node**
5. Build Command: `chmod +x build.sh && ./build.sh`
6. Start Command: `chmod +x start.sh && ./start.sh`
7. Plan: **Starter** ($7/month for always-on)

## Step 6: Configure Environment Variables

In your web service settings, go to **"Environment"** tab and add these variables:

### Required Variables (Must Set)

```
DATABASE_URL=<paste_internal_database_url_from_step_5>
TELEGRAM_BOT_TOKEN=<your_bot_token>
NODE_ENV=production
PORT=3000
```

### Optional Variables (Set if you have them)

```
OWNER_NAME=<your_name>
OWNER_OPEN_ID=<your_manus_open_id>
BUILT_IN_FORGE_API_KEY=<your_manus_api_key>
VITE_FRONTEND_FORGE_API_KEY=<your_frontend_api_key>
VITE_APP_ID=<your_app_id>
VITE_ANALYTICS_WEBSITE_ID=<your_analytics_id>
```

### Auto-Generated Variables (Render creates these)

```
JWT_SECRET=<auto_generated>
VITE_APP_TITLE=Job Tracker
VITE_APP_LOGO=/logo.svg
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
BUILT_IN_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
```

## Step 7: Deploy

1. Click **"Save Changes"**
2. Render will automatically build and deploy
3. Wait 5-10 minutes for first deployment
4. You'll get a URL like: `https://job-tracker-xxxx.onrender.com`

## Step 7.5: Run Database Migrations (CRITICAL)

**After the first successful deployment**, you MUST run migrations to create the database schema:

1. Go to your web service in Render dashboard
2. Click **"Shell"** tab (opens a terminal)
3. Run the migration command:
   ```bash
   pnpm db:push
   ```
4. Wait for completion (should see "Migrations applied successfully")
5. Verify tables were created:
   ```bash
   pnpm drizzle-kit studio
   ```

**Important**: Without this step, your database will be empty and the app will fail to work!

## Step 8: Update Telegram Webhook

Once deployed, update your Telegram bot webhook to point to Render:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://job-tracker-xxxx.onrender.com/api/telegram/webhook"}'
```

Replace:
- `<YOUR_BOT_TOKEN>` with your actual bot token
- `job-tracker-xxxx.onrender.com` with your actual Render URL

## Step 9: Verify Deployment

1. Visit your Render URL
2. You should see the Job Tracker dashboard
3. Send a test message to your Telegram bot
4. Check Render logs for activity

## Step 10: Monitor and Maintain

### View Logs
- In Render Dashboard → Your Service → **"Logs"** tab
- Real-time logs show all activity

### Auto-Deploy on Git Push
- Render automatically redeploys when you push to `main` branch
- Make changes on Manus → Download → Push to GitHub → Auto-deploy

### Database Backups
- Render automatically backs up your database daily
- Access backups in Database → **"Backups"** tab

## Troubleshooting

### Build Fails
- Check Render logs for errors
- Ensure `build.sh` has execute permissions
- Verify `pnpm` is installing correctly

### Database Connection Errors
- Verify `DATABASE_URL` is set correctly
- Check database is running (green status)
- Ensure internal database URL is used (not external)

### Telegram Not Responding
- Verify webhook is set to Render URL
- Check Render logs for incoming requests
- Ensure `TELEGRAM_BOT_TOKEN` is correct

### App Sleeps (Free Plan)
- Free tier sleeps after 15 min inactivity
- Upgrade to **Starter** plan ($7/month) for always-on
- Or use a service like UptimeRobot to ping every 10 min

## Cost Estimate

### Starter Plan (Always-On)
- Web Service: $7/month
- PostgreSQL: $7/month
- **Total: $14/month**

### Free Plan (Sleeps)
- Web Service: Free (sleeps after 15 min)
- PostgreSQL: Free (90 days, then $7/month)
- **Total: $0-7/month** (not recommended for production)

## Support

If you encounter issues:
1. Check Render logs first
2. Review this guide step-by-step
3. Contact Render support (very responsive)

---

**Deployment Workflow:**

```
Manus (Dev/Test) → Make Changes → Test → Download Files
                                            ↓
                                     Push to GitHub
                                            ↓
                                   Render Auto-Deploys
                                            ↓
                              Production (Always-On, Stable)
```

Good luck with your deployment! 🚀
