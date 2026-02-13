# 🚀 Deployment Guide# Deployment Guide# Deployment Guide



Automated full-stack deployment for StarMock to Render.



---This document covers automated deployment for StarMock's full-stack application (Express.js backend + React frontend).This document covers the automated deployment pipeline and manual deployment options for StarMock.



## 📋 Overview



**Platform:** Render  ## 🏗️ **Application Architecture**## Table of Contents

**Type:** Full-stack (Express.js backend + React frontend)  

**Deployment:** Automated via GitHub Actions  

**Workflow:** `.github/workflows/deploy-render.yml`

StarMock has:- [Automated Deployment (CD Pipeline)](#automated-deployment-cd-pipeline)

---

- **Backend**: Express.js server (`server.js`) with API endpoints- [GitHub Pages Setup](#github-pages-setup)

## 🏗️ Application Architecture

- **Frontend**: React + Vite application- [Environment Configuration](#environment-configuration)

StarMock is a full-stack application:

- **Deployment**: Render (full-stack) + Vercel (frontend preview)- [Alternative Deployment Platforms](#alternative-deployment-platforms)

- **Backend**: Express.js server (`app/server.js`)

  - API endpoints (e.g., `/api/health`)- [Rollback Procedures](#rollback-procedures)

  - Serves static frontend files from `dist/`

  - Catch-all route for SPA routing## Table of Contents- [Monitoring](#monitoring)



- **Frontend**: React + Vite application

  - Built to `app/dist/` directory

  - Single Page Application (SPA)- [Quick Start](#quick-start)---



---- [Render Deployment (Production)](#render-deployment-production)



## 🚀 Quick Start- [Vercel Deployment (Preview)](#vercel-deployment-preview)## Automated Deployment (CD Pipeline)



### Prerequisites- [Environment Configuration](#environment-configuration)

1. Your team member already deployed to Render

2. You need two pieces of information from them:- [Automated Workflows](#automated-workflows)### GitHub Pages (Default)

   - **Render Deploy Hook URL**

   - **Production App URL**- [Rollback Procedures](#rollback-procedures)



### Setup (One-Time)- [Monitoring & Health Checks](#monitoring--health-checks)The project is automatically deployed to GitHub Pages when code is pushed to the `main` branch.



#### Step 1: Get Render Information- [Troubleshooting](#troubleshooting)



Ask your team member for:**Workflow:** `.github/workflows/deploy.yml`



1. **Deploy Hook URL**---

   - Where: Render Dashboard → Select Service → Settings → Deploy Hook

   - If not created: Click "Create Deploy Hook"**Pipeline Stages:**

   - Example: `https://api.render.com/deploy/srv-xxxxx?key=yyyyy`

## Quick Start1. **Build** - Compiles the application, runs tests, generates production bundle

2. **Production URL**

   - Where: Top of Render service page2. **Deploy** - Uploads to GitHub Pages

   - Example: `https://starmock.onrender.com`

**Current Deployment Status:**3. **Health Check** - Verifies deployment success

#### Step 2: Add GitHub Secrets

- ✅ **Render** - Already deployed (full-stack with backend)4. **Notify** - Reports deployment status

1. Go to your fork: `https://github.com/olwalgeorge/StarMock`

2. Navigate to: **Settings** → **Secrets and variables** → **Actions**- 🆕 **Vercel** - Frontend-only preview deployments (new automation)

3. Click **New repository secret**

4. Add both secrets:**Trigger Methods:**

> Note: Production deployments (the `main` branch) are performed only from the canonical repository (`olwalgeorge/StarMock`) where the production secrets (`RENDER_DEPLOY_HOOK_URL`, `RENDER_APP_URL`) are stored. When workflows run from forks or contributor repositories those production secrets are not available for security reasons. Contributors can add development secrets (`RENDER_DEPLOY_HOOK_URL_DEV`, `RENDER_APP_URL_DEV`) to their forks for testing, or ask a maintainer to trigger a production deploy from the canonical repository (for example via `workflow_dispatch` or `repository_dispatch`).

Additional detail: Production deploys are triggered automatically when code reaches `main` — either via a direct push to `main` in the canonical repository or when a Pull Request is merged into `main`. This workflow is intentionally constrained so that production secrets are never exposed to forks or contributor repositories.



```**Automated Workflows:**- **Automatic**: Push to `main` branch

Name: RENDER_DEPLOY_HOOK_URL

Value: https://api.render.com/deploy/srv-xxxxx?key=yyyyy- `deploy-render.yml` - Deploys to Render on `main` branch push- **Manual**: 



Name: RENDER_APP_URL- `deploy-vercel.yml` - Deploys frontend to Vercel (production + PR previews)  ```bash

Value: https://starmock.onrender.com

```  # Via GitHub UI: Actions → Deploy → Run workflow



#### Step 3: Commit the Workflow---  # Or via GitHub CLI:



The `deploy-render.yml` workflow is ready. Just commit and push it:  gh workflow run deploy.yml



```bash## Render Deployment (Production)  ```

cd "c:\Users\PC\byu classwork\cse499\StarMock"

git add -A

git commit -m "feat: Add automated Render deployment with quality gates"

git push origin olwal-qa### What Render Hosts**Build Artifacts:**

```

✅ **Full Stack Application:**- Stored for 30 days

---

- Express.js backend (`server.js`)- Includes build metadata (commit SHA, timestamp, actor)

## 🔄 How Deployment Works

- API endpoint (`/api/health`)- Downloadable from Actions tab

### Automatic Deployment

- Static frontend (built React app)

When code is pushed to `main` branch:

- SPA routing fallback---

```

1. Pre-Deploy Checks (Quality Gates)

   ├── npm install

   ├── npm run lint (ESLint)### Setup (One-Time)## GitHub Pages Setup

   ├── npm run format:check (Prettier)

   ├── npm test (Vitest unit tests)

   ├── npm audit (security vulnerabilities)

   ├── npm run build (TypeScript + Vite)#### 1. Get Render Deploy Hook URL### Initial Configuration (One-Time)

   └── Verify dist/ folder exists

   

2. Deploy to Render

   ├── POST request to Render deploy hook1. Go to your Render dashboard: https://dashboard.render.com/1. **Enable GitHub Pages:**

   ├── Render receives webhook

   ├── Render pulls latest code from main2. Select your StarMock service   - Go to repository **Settings** → **Pages**

   ├── Render runs build command

   └── Render restarts service with new code3. Go to **Settings** → **Deploy Hook**   - Source: **GitHub Actions**

   

3. Health Check4. Copy the Deploy Hook URL (looks like `https://api.render.com/deploy/srv-xxxxx?key=xxxxx`)   - Click **Save**

   ├── Wait 30 seconds for deployment

   ├── Check /api/health endpoint

   ├── Retry up to 10 times (exponential backoff)

   └── Report success/failure#### 2. Get Render App URL2. **Update Base Path:**

   

4. Notification   - The app is configured for `/StarMock/` base path (repository name)

   └── Post deployment summary to GitHub Actions

```Your live app URL (e.g., `https://starmock-xxxx.onrender.com`)   - Already set in `.env.production`



### Manual Deployment



Trigger deployment manually from GitHub:#### 3. Add GitHub Secrets3. **Verify Deployment:**



1. Go to: **Actions** tab   - After first deploy, your site will be available at:

2. Select: **Deploy to Render**

3. Click: **Run workflow**Go to repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**     ```

4. Select branch: `main`

5. Click: **Run workflow** button     https://olwalgeorge.github.io/StarMock/



---Add these secrets:     ```



## 🛡️ Quality Gates



The deployment workflow includes pre-deploy checks that **must pass** before deploying:| Secret Name | Value | Example |4. **Update README with Live URL:**



| Check | Tool | Threshold ||-------------|-------|---------|   ```markdown

|-------|------|-----------|

| **Code Formatting** | Prettier | 100% formatted || `RENDER_DEPLOY_HOOK_URL` | Deploy hook URL from step 1 | `https://api.render.com/deploy/srv-...` |   ## 🌐 Live Demo

| **Linting** | ESLint | 0 errors |

| **Unit Tests** | Vitest | All tests pass || `RENDER_APP_URL` | Your Render app URL | `https://starmock-xxxx.onrender.com` |   [View StarMock Live](https://olwalgeorge.github.io/StarMock/)

| **Security** | npm audit | No high/critical |

| **Build** | TypeScript + Vite | Successful build |   ```



**If any check fails, deployment is blocked** ❌#### 4. Verify Render Configuration



This prevents broken code from reaching production.### Permissions



---Ensure your Render service has:



## 📊 Deployment StatusThe deploy workflow requires:



### Check Status**Build Command:**- `contents: read` - Read repository code



**GitHub Actions:**```bash- `pages: write` - Write to GitHub Pages

```bash

# View workflow runscd app && npm install && npm run build- `id-token: write` - Generate deployment token

https://github.com/olwalgeorge/StarMock/actions/workflows/deploy-render.yml

```

# Check latest deployment

Actions → Deploy to Render → Click latest runThese are already configured in `deploy.yml`.

```

**Start Command:**

**Render Dashboard:**

```bash```bash---

# View deployment logs

https://dashboard.render.com/cd app && npm start



# Navigate to: Your Service → Events → View Logs```## Environment Configuration

```



### Health Check Endpoint

**Environment Variables** (in Render dashboard):### Environment Files

The backend exposes a health check endpoint:

```

```bash

# Check if deployment is liveNODE_ENV=production```

curl https://starmock.onrender.com/api/health

PORT=10000app/

# Expected response:

{```├── .env.example       # Template with all variables

  "status": "ok",

  "timestamp": "2026-01-27T12:34:56.789Z"├── .env.production    # Production settings (committed)

}

```### Automated Deployment└── .env.local         # Local overrides (gitignored)



---```



## 🔙 Rollback Procedures**Triggers automatically when:**



### Option 1: Revert via GitHub- Code is pushed to `main` branch### Using Environment Variables



```bash

# Find the last working commit

git log --oneline**Manual trigger:****In Code:**



# Revert to that commit```bash```typescript

git revert <commit-sha>

git push origin main# Via GitHub UI// Access environment variables with VITE_ prefix



# This triggers automatic re-deploymentActions → Deploy to Render → Run workflowconst apiUrl = import.meta.env.VITE_API_URL

```

const appName = import.meta.env.VITE_APP_NAME

### Option 2: Rollback in Render Dashboard

# Via GitHub CLIconst isDev = import.meta.env.DEV

1. Go to Render Dashboard

2. Select your servicegh workflow run deploy-render.ymlconst isProd = import.meta.env.PROD

3. Click **Manual Deploy** tab

4. Find previous successful deployment``````

5. Click **Redeploy**



### Option 3: Emergency Rollback

### Deployment Pipeline**Available by Default:**

```bash

# Hard reset to last working commit (DESTRUCTIVE)- `import.meta.env.MODE` - `development` or `production`

git reset --hard <commit-sha>

git push --force origin main1. **Build and Test** (runs first)- `import.meta.env.DEV` - Boolean, true in development



# Use with caution - rewrites history   - Install dependencies- `import.meta.env.PROD` - Boolean, true in production

```

   - Lint code- `import.meta.env.BASE_URL` - Base path from vite config

---

   - Check formatting

## 🐛 Troubleshooting

   - Run tests### Local Development

### Deployment Failed in GitHub Actions

   - Build frontend

**Symptom:** Red X on workflow run

   - Verify build artifacts1. Copy example file:

**Steps:**

1. Click the failed workflow run   ```bash

2. Expand the failed job/step

3. Read error message2. **Deploy** (if tests pass)   cd app



**Common Issues:**   - Triggers Render deploy hook   cp .env.example .env.local



| Error | Cause | Fix |   - Render automatically:   ```

|-------|-------|-----|

| `npm test failed` | Failing tests | Fix tests locally, push again |     - Pulls latest code

| `npm run lint failed` | ESLint errors | Run `npm run lint:fix` |

| `npm audit failed` | Vulnerable dependencies | Run `npm audit fix` |     - Runs build command2. Edit `.env.local` with your settings

| `Secret not found` | Missing GitHub secret | Add `RENDER_DEPLOY_HOOK_URL` |

| `Build failed` | TypeScript/Vite error | Check build locally with `npm run build` |     - Restarts service



### Health Check Failed     - Serves new version3. Start dev server:



**Symptom:** "❌ Health check failed after 10 retries"   ```bash



**Steps:**3. **Health Check** (verifies deployment)   npm run dev

1. Check Render deployment logs:

   ```   - Waits 60 seconds for deployment   ```

   Render Dashboard → Service → Logs

   ```   - Checks `/api/health` endpoint

2. Look for startup errors

3. Verify `/api/health` endpoint manually:   - Retries up to 10 times### Adding New Variables

   ```bash

   curl https://your-app.onrender.com/api/health   - Reports success/failure

   ```

1. Add to `.env.example` (documentation)

**Common Causes:**

- Build failed on Render (check logs)### Render Build Process2. Add to `.env.production` (production value)

- Start command incorrect (should be `node server.js`)

- Port binding issue (Express should use `process.env.PORT`)3. Use in code with `import.meta.env.VITE_YOUR_VAR`



### Render Build FailedWhen deployed, Render automatically:4. **Important**: Only `VITE_` prefixed variables are exposed to client



**Symptom:** Deployment shows "Build Failed" in Render dashboard```bash



**Steps:**# 1. Clone repository---

1. Check Render build logs

2. Verify build command in Render settings:git clone <your-repo>

   ```bash

   # Should be:## Alternative Deployment Platforms

   cd app && npm install && npm run build

   ```# 2. Run build command

3. Verify start command:

   ```bashcd app && npm install && npm run build### Vercel

   # Should be:

   cd app && npm start

   ```

# 3. Start application**One-Click Deploy:**

### Deployment Triggered But Nothing Happens

cd app && npm start```bash

**Symptom:** GitHub Actions shows success, but Render shows no new deployment

# Install Vercel CLI

**Steps:**

1. Verify `RENDER_DEPLOY_HOOK_URL` is correct# 4. Server starts on PORT=10000npm i -g vercel

2. Check Render's "Events" tab for webhook received

3. Ensure Render service is not paused# Serves frontend from /dist

4. Try manual deploy in Render dashboard

# API available at /api/*# Deploy

---

```cd app

## 🔧 Configuration

vercel --prod

### Render Settings

---```

**Build Command:**

```bash

cd app && npm install && npm run build

```## Vercel Deployment (Preview)**Configuration** (`vercel.json`):



**Start Command:**```json

```bash

cd app && npm start### What Vercel Hosts{

```

✅ **Frontend Only:**  "buildCommand": "npm run build",

**Environment Variables:**

```bash- React application (built with Vite)  "outputDirectory": "dist",

NODE_ENV=production

PORT=10000  # Render assigns this automatically- Static assets (JS, CSS, images)  "framework": "vite"

```

- Client-side routing}

### GitHub Secrets Required

```

| Secret Name | Purpose | Example |

|-------------|---------|---------|❌ **Does NOT include:**

| `RENDER_DEPLOY_HOOK_URL` | Triggers deployment | `https://api.render.com/deploy/srv-...` |

| `RENDER_APP_URL` | Health check endpoint | `https://starmock.onrender.com` |- Express.js backend### Netlify



---- `/api/health` endpoint



## 🔐 Security Notes**Deploy via CLI:**



### Deploy Hook URL**Use Case:** Fast frontend previews for PRs (no backend functionality)```bash



- **Keep it secret!** Anyone with this URL can trigger deployments# Install Netlify CLI

- Don't commit it to your repository

- Don't share it publicly### Setup (One-Time)npm i -g netlify-cli

- Rotate it if compromised (Render Dashboard → Delete → Create New)



### Auto-Deploy vs CI/CD

#### 1. Create Vercel Account# Deploy

Your team might have **Render Auto-Deploy** enabled:

- **Auto-Deploy**: Render watches GitHub and deploys on every push (no quality checks)cd app

- **CI/CD Workflow**: Our workflow runs tests first, then deploys (safer)

1. Go to https://vercel.com/signupnetlify deploy --prod --dir=dist

**Recommendation:** Disable Render Auto-Deploy and use CI/CD exclusively

2. Sign up with GitHub```

To disable:

1. Render Dashboard → Service → Settings

2. Find "Auto-Deploy" toggle

3. Turn it OFF#### 2. Link Repository (Option A - Recommended)**Configuration** (`netlify.toml`):

4. Save changes

```toml

---

**Via Vercel Dashboard:**[build]

## 📈 Monitoring

1. Click **Add New** → **Project**  command = "npm run build"

### Key Metrics to Watch

2. Import `olwalgeorge/StarMock`  publish = "dist"

1. **Deployment Success Rate**

   - Target: >95%3. Configure:

   - Check: GitHub Actions history

   - **Framework Preset:** Vite[[redirects]]

2. **Build Time**

   - Target: <5 minutes   - **Root Directory:** `app`  from = "/*"

   - Check: GitHub Actions duration

   - **Build Command:** `npm run build`  to = "/index.html"

3. **Health Check Response Time**

   - Target: <200ms   - **Output Directory:** `dist`  status = 200

   - Check: `/api/health` endpoint

4. Click **Deploy**```

4. **Uptime**

   - Target: 99.9%

   - Check: Render dashboard

#### 3. Get Vercel Token (Option B - CLI Automation)### Docker Deployment

### Setting Up Alerts



**Render:**

- Dashboard → Service → Settings → Notifications**If using GitHub Actions automation:****Dockerfile** (place in `app/`):

- Add email or Slack webhook

- Enable "Deploy Failed" notifications```dockerfile



**GitHub:**1. Go to https://vercel.com/account/tokensFROM node:20-alpine AS builder

- Watch repository for workflow failures

- Enable email notifications for failed Actions2. Create new token (name: "GitHub Actions")WORKDIR /app



---3. Copy the tokenCOPY package*.json ./



## 📚 Additional ResourcesRUN npm ci



- [Render Deploy Hooks Documentation](https://render.com/docs/deploy-hooks)#### 4. Get Vercel Project IDCOPY . .

- [GitHub Actions Workflows Guide](.github/workflows/README.md)

- [Express.js Deployment Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)RUN npm run build

- [Vite Production Build](https://vitejs.dev/guide/build.html)

```bash

---

# Install Vercel CLIFROM nginx:alpine

## 🆘 Getting Help

npm i -g vercelCOPY --from=builder /app/dist /usr/share/nginx/html

**If deployment issues persist:**

COPY nginx.conf /etc/nginx/conf.d/default.conf

1. Check workflow logs in GitHub Actions

2. Check deployment logs in Render dashboard# LoginEXPOSE 80

3. Verify all GitHub secrets are set correctly

4. Test health endpoint manuallyvercel loginCMD ["nginx", "-g", "daemon off;"]

5. Review this troubleshooting guide

6. Contact team member who set up Render originally```



---# Link project



**Last Updated:** January 2026  cd app**Build & Run:**

**Maintained by:** StarMock QA Team

vercel link```bash

docker build -t starmock:latest ./app

# Get project info (copy projectId)docker run -p 8080:80 starmock:latest

cat .vercel/project.json```

```

### Azure Static Web Apps

#### 5. Add GitHub Secrets

```bash

Add these secrets to your repository:# Install Azure Static Web Apps CLI

npm i -g @azure/static-web-apps-cli

| Secret Name | Value |

|-------------|-------|# Deploy

| `VERCEL_TOKEN` | Token from Vercel dashboard |cd app

| `VERCEL_ORG_ID` | Your Vercel team/org ID |swa deploy --app-location . --output-location dist

| `VERCEL_PROJECT_ID` | Project ID from `.vercel/project.json` |```



### Automated Deployment---



**Production (main branch):**## Rollback Procedures

- Triggers on push to `main`

- Deploys to: `https://star-mock.vercel.app` (or your custom domain)### Option 1: Revert via Git



**Preview (PRs):**```bash

- Triggers on every PR# Find the last working commit

- Creates unique preview URLgit log --oneline

- Comments on PR with preview link

- Example: `https://star-mock-pr-123.vercel.app`# Revert to that commit

git revert <commit-sha>

### Vercel Configurationgit push origin main



Create `app/vercel.json`:# Deployment will automatically trigger

```

```json

{### Option 2: Re-run Previous Workflow

  "buildCommand": "npm run build",

  "outputDirectory": "dist",1. Go to **Actions** tab

  "framework": "vite",2. Find successful deployment

  "installCommand": "npm install",3. Click **Re-run all jobs**

  "devCommand": "npm run dev",

  "rewrites": [### Option 3: Download Previous Artifact

    {

      "source": "/(.*)",1. Go to **Actions** → Successful deploy run

      "destination": "/index.html"2. Download `production-build` artifact

    }3. Manual deploy:

  ]   ```bash

}   unzip production-build.zip

```   # Upload to hosting platform manually

   ```

**Note:** Add this file if you want more control over Vercel builds.

### Emergency Rollback

---

If automated deployment fails:

## Environment Configuration

1. **Disable workflow:**

### Environment Files   ```bash

   # Rename workflow file temporarily

```   git mv .github/workflows/deploy.yml .github/workflows/deploy.yml.disabled

app/   git commit -m "chore: temporarily disable deployment"

├── .env.example       # Template (committed)   git push

├── .env.production    # Production settings (committed)   ```

├── .env.local         # Local overrides (gitignored)

└── .env               # Development (gitignored)2. **Deploy manually** using previous build

```

3. **Investigate and fix** deployment issue

### Current Variables

4. **Re-enable workflow**

**`.env.production`:**

```bash---

VITE_APP_NAME=StarMock

VITE_APP_VERSION=0.0.0## Monitoring

VITE_BASE_PATH=/

```### Deployment Status



### Adding Backend API URL**Check deployment:**

```bash

For production deployments where frontend calls backend:# Via GitHub CLI

gh run list --workflow=deploy.yml

**Add to `.env.production`:**

```bash# View latest run

# Render backend URLgh run view --workflow=deploy.yml

VITE_API_URL=https://starmock-xxxx.onrender.com/api```

```

**View logs:**

**Use in code:**```bash

```typescriptgh run view <run-id> --log

// src/config.ts```

export const API_URL = import.meta.env.VITE_API_URL || '/api'

### Build Info Endpoint

// Usage

const response = await fetch(`${API_URL}/health`)Every deployment includes build metadata at `/build-info.json`:

```

```json

### Platform-Specific Env Vars{

  "buildTime": "2026-01-27T12:00:00Z",

**Render (Backend):**  "commit": "abc123...",

Set in Render dashboard → Environment:  "branch": "main",

```  "workflow": "123456789",

NODE_ENV=production  "actor": "username"

PORT=10000}

``````



**Vercel (Frontend):****Access it:**

Set in Vercel dashboard → Settings → Environment Variables:```bash

```curl https://olwalgeorge.github.io/StarMock/build-info.json

VITE_API_URL=https://starmock-xxxx.onrender.com/api```

```

### Health Checks

---

The pipeline includes automated health checks after deployment. Monitor:

## Automated Workflows

1. **GitHub Actions Summary** - Shows deployment status

### deploy-render.yml2. **Deployment URL** - Verify site loads

3. **Browser Console** - Check for runtime errors

**File:** `.github/workflows/deploy-render.yml`4. **Build Info** - Verify correct version deployed



**Triggers:**### Setting Up Monitoring (Optional)

- Push to `main` branch

- Manual dispatch**Add error tracking** (e.g., Sentry):



**Jobs:**1. Install Sentry:

1. Build and Test   ```bash

2. Deploy (triggers Render webhook)   npm install @sentry/react

3. Health Check (verifies `/api/health`)   ```



**Required Secrets:**2. Configure in `main.tsx`:

- `RENDER_DEPLOY_HOOK_URL`   ```typescript

- `RENDER_APP_URL`   import * as Sentry from '@sentry/react'

   

### deploy-vercel.yml   if (import.meta.env.PROD) {

     Sentry.init({

**File:** `.github/workflows/deploy-vercel.yml`       dsn: import.meta.env.VITE_SENTRY_DSN,

       environment: import.meta.env.MODE,

**Triggers:**     })

- Push to `main` (production)   }

- Pull requests (preview)   ```

- Manual dispatch

3. Add to `.env.production`:

**Jobs:**   ```

1. Test and Build   VITE_SENTRY_DSN=your_sentry_dsn

2. Deploy to Vercel   ```

3. Comment on PR (preview deployments)

---

**Required Secrets:**

- `VERCEL_TOKEN`## Deployment Checklist

- `VERCEL_ORG_ID` (optional, for teams)

- `VERCEL_PROJECT_ID` (optional, for CLI)Before deploying to production:



### Workflow Dependencies- [ ] All tests passing (`npm test`)

- [ ] Linting passes (`npm run lint`)

Both workflows run **tests before deploying:**- [ ] Build succeeds (`npm run build`)

```yaml- [ ] Environment variables configured

- Run linting- [ ] GitHub Pages enabled in repository settings

- Check formatting  - [ ] Base path set correctly in `.env.production`

- Run unit tests- [ ] README updated with live URL

- Build application- [ ] Deployment workflow permissions granted

✅ Only deploy if all pass

```---



---## Troubleshooting



## Rollback Procedures### Deployment fails with "Permission denied"



### Render Rollback**Solution:** Enable GitHub Pages and verify workflow permissions in Settings → Actions.



**Option 1: Via Render Dashboard**### Site shows 404 on GitHub Pages

1. Go to Render dashboard → Your service

2. Click **Deploys** tab**Solution:** Check base path configuration:

3. Find last working deployment- `.env.production` has `VITE_BASE_PATH=/StarMock/`

4. Click **Rollback to this deploy**- `vite.config.ts` reads `process.env.VITE_BASE_PATH`



**Option 2: Via Git**### Assets not loading (404 errors)

```bash

# Revert to previous commit**Solution:** Base path mismatch. Verify:

git revert <bad-commit-sha>```bash

git push origin main# In browser console:

console.log(import.meta.env.BASE_URL)

# Deployment will trigger automatically# Should be '/StarMock/' not '/'

``````



**Option 3: Re-trigger Old Deployment**### Build artifacts missing

1. Go to GitHub **Actions** tab

2. Find successful `Deploy to Render` run**Solution:** Check workflow run logs:

3. Click **Re-run all jobs**```bash

gh run view --workflow=deploy.yml --log | grep -A 10 "Build production bundle"

### Vercel Rollback```



**Via Vercel Dashboard:**### Deployment stuck on old version

1. Go to project → **Deployments**

2. Find last working deployment**Solution:** Hard refresh browser cache:

3. Click **⋮** → **Promote to Production**- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

- Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

**Instant rollback** (Vercel keeps all deployments)

---

### Emergency Procedures

## Security Considerations

**If both deployments fail:**

- Never commit `.env.local` (gitignored by default)

1. **Disable auto-deploy:**- Only `VITE_` prefixed variables are exposed to client

   ```bash- Sensitive keys belong in GitHub Secrets

   # Temporarily rename workflow- Review deployment logs for leaked credentials

   git mv .github/workflows/deploy-render.yml .github/workflows/deploy-render.yml.disabled

   git commit -m "chore: disable auto-deploy"**Using Secrets in Deployment:**

   git push

   ```1. Add to GitHub Secrets (Settings → Secrets → Actions)

2. Reference in workflow:

2. **Deploy manually from known good commit:**   ```yaml

   ```bash   - name: Build

   git checkout <good-commit-sha>     env:

   # Manually deploy via platform dashboard       VITE_API_KEY: ${{ secrets.VITE_API_KEY }}

   ```     run: npm run build

   ```

3. **Fix issue, re-enable:**

   ```bash---

   git mv .github/workflows/deploy-render.yml.disabled .github/workflows/deploy-render.yml

   git commit -m "chore: re-enable auto-deploy"## Next Steps

   git push

   ```1. **Enable GitHub Pages** (see setup instructions above)

2. **Run first deployment** (push to main or manual trigger)

---3. **Verify live site** at deployment URL

4. **Update README** with live demo link

## Monitoring & Health Checks5. **Set up monitoring** (optional but recommended)



### Render MonitoringFor questions or issues, check the [workflow logs](../../actions/workflows/deploy.yml) or open an issue.


**Health Endpoint:**
```bash
curl https://your-app.onrender.com/api/health
# Expected: {"status":"ok"}
```

**Render Dashboard:**
- Metrics: CPU, Memory, Network
- Logs: Real-time log streaming
- Events: Deployment history

**Automated Checks:**
- GitHub Action checks health after deploy
- Retries up to 10 times over 2.5 minutes

### Vercel Monitoring

**Vercel Analytics** (built-in):
- Web Vitals (LCP, FID, CLS)
- Real user metrics
- Traffic analytics

**Enable in Vercel dashboard:**
Settings → Analytics → Enable

### Manual Health Checks

**After deployment, verify:**

1. **Backend (Render):**
   ```bash
   # Health check
   curl https://your-app.onrender.com/api/health
   
   # Frontend (served by backend)
   curl -I https://your-app.onrender.com
   ```

2. **Frontend (Vercel):**
   ```bash
   # Check if site loads
   curl -I https://star-mock.vercel.app
   
   # Check for build info
   curl https://star-mock.vercel.app/_vercel/insights/script.js
   ```

### Setting Up Alerts

**Render:**
1. Dashboard → Service → Notifications
2. Enable "Deploy failed" notifications
3. Add email/Slack webhook

**Vercel:**
1. Dashboard → Integrations
2. Add Slack or Discord integration
3. Get notified on deployments

---

## Troubleshooting

### Render Issues

**Problem: Deployment triggered but health check fails**

**Solutions:**
1. Check Render logs:
   ```bash
   # Via Render dashboard
   Service → Logs → View live logs
   ```

2. Verify build command:
   ```bash
   # Should be:
   cd app && npm install && npm run build
   ```

3. Check start command:
   ```bash
   # Should be:
   cd app && npm start
   ```

4. Verify PORT environment variable:
   ```
   PORT=10000  # Set in Render dashboard
   ```

**Problem: Deploy hook returns 404**

**Solution:** Regenerate deploy hook in Render dashboard and update GitHub secret

**Problem: Build fails with "Module not found"**

**Solution:** 
```bash
# Ensure package-lock.json is committed
git add app/package-lock.json
git commit -m "chore: add lockfile"
git push
```

### Vercel Issues

**Problem: Missing VERCEL_TOKEN error**

**Solution:** Add secret to GitHub repository settings

**Problem: Build fails with "No package.json"**

**Solution:** Verify root directory is set to `app` in Vercel settings

**Problem: 404 on routes (e.g., `/about`)**

**Solution:** Add `vercel.json` with SPA routing config (see above)

### GitHub Actions Issues

**Problem: Workflow doesn't trigger**

**Solutions:**
1. Check workflow file syntax:
   ```bash
   # Validate YAML
   yamllint .github/workflows/deploy-render.yml
   ```

2. Verify branch name matches trigger:
   ```yaml
   on:
     push:
       branches: [ main ]  # Must match your branch
   ```

3. Check Actions are enabled:
   Settings → Actions → General → Allow all actions

**Problem: Secrets not found**

**Solution:**
1. Verify secrets exist: Settings → Secrets and variables → Actions
2. Check exact secret names (case-sensitive)
3. Re-add secret if needed

---

## Deployment Checklist

### Before First Deployment

**Render:**
- [ ] Service created and deployed manually once
- [ ] Deploy hook URL copied
- [ ] App URL noted
- [ ] GitHub secrets added (`RENDER_DEPLOY_HOOK_URL`, `RENDER_APP_URL`)
- [ ] Build and start commands verified
- [ ] Environment variables set (NODE_ENV, PORT)

**Vercel (Optional):**
- [ ] Vercel account created
- [ ] Project linked via dashboard OR
- [ ] Vercel token generated
- [ ] Project ID obtained
- [ ] GitHub secrets added

**Repository:**
- [ ] All tests passing locally
- [ ] Code pushed to `main` branch
- [ ] Workflows validated (check syntax)

### After Deployment

- [ ] Verify Render app loads: `https://your-app.onrender.com`
- [ ] Check health endpoint: `https://your-app.onrender.com/api/health`
- [ ] Verify frontend routes work
- [ ] Check GitHub Actions logs for errors
- [ ] Enable monitoring/alerts (optional)

---

## Best Practices

1. **Always deploy from `main` branch**
   - Feature branches → PR → review → merge → auto-deploy

2. **Test before merging**
   - All workflows run tests before deploying
   - Don't skip tests!

3. **Use environment variables**
   - Never commit secrets
   - Use platform-specific env var managers

4. **Monitor deployments**
   - Check Actions tab after push
   - Verify health checks pass
   - Review platform dashboards

5. **Keep dependencies updated**
   - Dependabot handles this automatically
   - Review and merge dependency PRs weekly

6. **Document changes**
   - Update this file when adding new deployment targets
   - Note any manual configuration steps

---

## Next Steps

1. **Set up Render secrets** (if not done):
   ```bash
   # Add RENDER_DEPLOY_HOOK_URL and RENDER_APP_URL
   # to repository Settings → Secrets
   ```

2. **Test deployment**:
   ```bash
   # Push to main to trigger
   git push origin main
   
   # Or manual trigger
   gh workflow run deploy-render.yml
   ```

3. **Optional: Set up Vercel** for frontend previews

4. **Enable monitoring** in both platforms

5. **Configure alerts** for deployment failures

---

## Support

- **Render Docs**: https://docs.render.com/
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Actions**: https://docs.github.com/en/actions

For issues, check workflow logs:
```bash
# List recent runs
gh run list --workflow=deploy-render.yml

# View specific run logs
gh run view <run-id> --log
```
## AI Recording Rollout and Runbook (2026-02-12)

### Required Environment Variables
- `FEEDBACK_PROVIDER` (`rule_based|openai|ai_model`)
- `TRANSCRIPTION_PROVIDER` (`mock|openai`)
- `UPLOAD_SIGNING_SECRET`
- `UPLOAD_URL_TTL_SECONDS`
- `UPLOAD_MAX_AUDIO_BYTES`
- `FEATURE_AI_RECORDING_ENABLED`
- `FEATURE_AI_RECORDING_ROLLOUT_PERCENT`
- `FEATURE_AUDIO_UPLOADS_ENABLED`
- `FEATURE_AUDIO_UPLOADS_ROLLOUT_PERCENT`
- `FEATURE_TRANSCRIPTION_ENABLED`
- `FEATURE_TRANSCRIPTION_ROLLOUT_PERCENT`

### Rollout Procedure
1. Deploy with all three feature flags enabled but rollout at `10%`.
2. Monitor `/api/metrics` and logs for at least 30-60 minutes:
   - `starmock_feedback_queue_depth`
   - `starmock_transcription_queue_depth`
   - `starmock_feedback_fallback_total`
   - `starmock_feedback_provider_errors_total`
3. Increase rollout to `50%` when stable.
4. Increase rollout to `100%` only after error/fallback and queue metrics remain within SLO.

### Alert Thresholds (Starter)
- Feedback queue depth > `50` for 10 minutes.
- Transcription queue depth > `50` for 10 minutes.
- Feedback provider fallback ratio > `5%` sustained over 15 minutes.
- Feedback provider error spike > `2%` sustained over 15 minutes.
- Upload failures (`starmock_audio_upload_total{status!="success"}`) rising sharply over baseline.

### Fast Rollback
If incidents occur:
1. Set `FEATURE_AI_RECORDING_ROLLOUT_PERCENT=0`.
2. Set `FEATURE_AUDIO_UPLOADS_ROLLOUT_PERCENT=0`.
3. Set `FEATURE_TRANSCRIPTION_ROLLOUT_PERCENT=0`.
4. Optionally set:
   - `FEATURE_AI_RECORDING_ENABLED=false`
   - `FEATURE_AUDIO_UPLOADS_ENABLED=false`
   - `FEATURE_TRANSCRIPTION_ENABLED=false`
5. Redeploy and verify `/api/features` reflects disabled flags.

### Incident Triage
1. Capture `x-correlation-id` from failing client response.
2. Search logs by `correlationId`.
3. Check related job records:
   - `FeedbackJob` (`queued|processing|failed`)
   - `TranscriptionJob` (`uploaded|transcribing|failed`)
4. Validate upload token expiry/replay failures if audio upload is impacted.
