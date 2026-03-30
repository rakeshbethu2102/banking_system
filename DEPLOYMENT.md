# 🚀 Deployment Guide - Banking System

## Files Created

✅ **app_production.py** - Production-ready Flask app with SQLAlchemy database support
✅ **Procfile** - For Heroku/Railway deployment
✅ **runtime.txt** - Python version specification
✅ **requirements.txt** - All dependencies
✅ **.gitignore** - Prevents committing sensitive files

---

## Step 1: Test Production App Locally

### 1.1 Install Dependencies
```bash
pip install -r requirements.txt
```

### 1.2 Run Production App
```bash
# On Windows (CMD)
set FLASK_ENV=development
set DATABASE_URL=sqlite:///banking_system.db
python app_production.py

# On Mac/Linux (Bash)
export FLASK_ENV=development
export DATABASE_URL=sqlite:///banking_system.db
python app_production.py
```

### 1.3 Test the API
```bash
# Health check
curl http://localhost:5000/health

# Register
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123","pin":"1234","email":"test@example.com","firstName":"John","lastName":"Doe","phone":"9999999999"}'

# Login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

---

## Step 2: Deploy to Railway.app (Recommended)

### 2.1 Create .env.railway File
```
FLASK_ENV=production
SECRET_KEY=your-random-secret-key-change-this-in-production
FRONTEND_URL=https://your-vercel-app.vercel.app
DATABASE_URL=postgresql://... (Railway auto-generates this)
PORT=5000
```

### 2.2 Push to GitHub
```bash
# Stage all changes
git add .

# Create commit
git commit -m "Add production backend with database support

- Created app_production.py with SQLAlchemy
- Added support for PostgreSQL and SQLite
- Configured CORS for Vercel frontend
- Added Procfile for Railway deployment

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

# Push to main
git push origin main
```

### 2.3 Deploy on Railway

**Option A: Via Web UI**
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `banking_system` repository
6. Railway auto-detects the Python project
7. Click "Deploy Now"

**Option B: Via Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

### 2.4 Configure Environment Variables in Railway

1. Go to Railway Dashboard
2. Open your project
3. Click **Variables** tab
4. Add these variables:
   ```
   FLASK_ENV=production
   SECRET_KEY=your-random-secret-key (generate one with: python -c "import secrets; print(secrets.token_hex(32))")
   FRONTEND_URL=https://your-vercel-app.vercel.app
   DATABASE_URL=postgresql://user:password@host/db (Railway provides this)
   ```

### 2.5 Get Your Backend URL

After deployment completes:
1. Click on the **Deployments** tab
2. Find your production deployment
3. Copy the **Environment URL** (looks like: `https://banking-api-prod.up.railway.app`)

---

## Step 3: Update Frontend to Use Backend URL

### 3.1 Update `.env.production`
```
VITE_API_BASE_URL=https://banking-api-prod.up.railway.app/api
```
(Replace with your actual Railway URL)

### 3.2 Rebuild and Deploy Frontend
```bash
# Build for production
npm run build

# Push to GitHub (Vercel auto-redeploys)
git add .
git commit -m "Update backend API URL for production"
git push origin main

# Vercel will auto-deploy from GitHub
```

---

## Step 4: Test End-to-End

### 4.1 Test Registration on Deployed App
1. Open your Vercel URL: `https://your-vercel-app.vercel.app`
2. Fill registration form
3. Click Register
4. Check browser Console (F12) for errors

### 4.2 Expected Flow
- ✅ Registration → Data saved to PostgreSQL on Railway
- ✅ Login → Token generated
- ✅ Dashboard → Fetches data from backend
- ✅ Account Info → Requires PIN verification

### 4.3 Debug Issues
**If registration fails:**
```bash
# Check Railway logs
railway logs

# Check Vercel logs
vercel logs
```

**If you see CORS errors:**
- Verify FRONTEND_URL in Railway environment variables
- Make sure it matches your Vercel URL exactly

**If you see database errors:**
- Verify DATABASE_URL starts with `postgresql://`
- Check database connection in Railway dashboard

---

## Alternative: Render.com Deployment

If you prefer Render instead of Railway:

### Steps:
1. Go to https://render.com
2. Click "New +"
3. Select "Web Service"
4. Connect GitHub
5. Select your repository
6. Set:
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app_production:app`
7. Add environment variables
8. Click "Create Web Service"

---

## Production Checklist

✅ Backend deployed on Railway/Render
✅ PostgreSQL database connected
✅ CORS enabled with frontend URL
✅ SECRET_KEY generated and set
✅ Frontend API URL points to backend
✅ Frontend deployed on Vercel
✅ Registration creates users in database
✅ Login generates tokens
✅ Protected endpoints require authentication
✅ Database persists across server restarts

---

## Important Security Notes

⚠️ **Change SECRET_KEY** in production
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

⚠️ **Use HTTPS** - Both Vercel and Railway use HTTPS by default

⚠️ **Protect .env** - Never commit `.env` files to GitHub (use `.gitignore`)

⚠️ **Use strong passwords** - Add password validation in production

---

## Monitoring

**Railway Dashboard:**
- Real-time logs
- Deployment history
- Environment variables
- Database status

**Check backend health:**
```bash
curl https://your-api.up.railway.app/health
```

---

## Next Steps

1. **Create GitHub commit** with all production files
2. **Deploy to Railway** following steps above
3. **Update Vercel** with backend URL
4. **Test registration** on live app
5. **Monitor logs** for any issues

Good luck! 🎉
