# Push Job Tracker to Existing GitHub Repository

## Quick Steps to Update Your Repository

Follow these steps to push your updated Job Tracker code to your existing **rudybnb/Job-Tracker** repository.

---

## Step 1: Download Project Files

1. In Manus UI, click the **Code** panel (top right)
2. Click **"Download All Files"** button
3. Extract the ZIP file to a folder on your computer

---

## Step 2: Push to GitHub

Open **Terminal** (Mac/Linux) or **Command Prompt** (Windows) in the extracted folder and run these commands:

### Initialize Git and Push

```bash
# Initialize git repository
git init

# Add all files
git add .

# Commit with message
git commit -m "Updated Job Tracker with Render deployment config"

# Set main branch
git branch -M main

# Connect to your existing repository
git remote add origin https://github.com/rudybnb/Job-Tracker.git

# Push to GitHub (this will update your existing repo)
git push -u origin main --force
```

**Note:** The `--force` flag is needed because we're replacing the existing code. This is safe since you're updating your own repository.

---

## Step 3: Verify Upload

1. Go to https://github.com/rudybnb/Job-Tracker
2. Refresh the page
3. You should see all your updated files including:
   - `render.yaml`
   - `build.sh`
   - `start.sh`
   - `RENDER_DEPLOYMENT.md`

---

## What if I get an error?

### Error: "remote origin already exists"

Run this first, then try again:
```bash
git remote remove origin
git remote add origin https://github.com/rudybnb/Job-Tracker.git
git push -u origin main --force
```

### Error: "Permission denied"

GitHub may ask you to authenticate. You have two options:

**Option A: Use Personal Access Token (Recommended)**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "Job Tracker Deploy"
4. Check the **repo** checkbox
5. Click "Generate token"
6. Copy the token (you won't see it again!)
7. When pushing, use this format:
   ```bash
   git remote set-url origin https://YOUR_TOKEN@github.com/rudybnb/Job-Tracker.git
   git push -u origin main --force
   ```

**Option B: Use GitHub CLI**
```bash
gh auth login
# Follow the prompts to authenticate
git push -u origin main --force
```

---

## Next Steps

Once your code is on GitHub, proceed to **RENDER_DEPLOYMENT.md** Step 4 to deploy to Render!

---

**Quick Reference:**

```
Download Files → Extract → Open Terminal → Run Git Commands → Verify on GitHub → Deploy to Render
```

Good luck! 🚀
