# 🚀 StarMock CI/CD Pipeline Documentation

## Overview
This document explains the complete CI/CD pipeline for the StarMock project, from local development to production deployment.

## 📋 Pipeline Flow

### 1. Local Development → Git Push

#### Pre-commit Hooks (Automatic)
When you commit code locally, these checks run automatically:

```bash
🔍 Running pre-commit checks...
🎨 Running ESLint...          # Code linting (always runs)
💅 Checking Prettier formatting...  # Code formatting validation (always runs)
🧪 Running tests...           # Unit tests (optional - can be skipped)
✅ All pre-commit checks passed!
```

**Skipping tests in pre-commit:**
```bash
# Skip tests for faster commits
SKIP_TESTS=true git commit -m "your message"

# Or set it permanently for your session
export SKIP_TESTS=true
```

**What happens if checks fail:**
- ❌ Commit is blocked
- 🔧 Fix linting/formatting issues: `npm run lint:fix` and `npm run format`
- 🧪 Fix test failures and re-run: `npm test` (if tests are enabled)

#### Git Push Triggers
Pushing to these branches triggers the CI/CD pipeline:
- `main` → Production deployment
- `olwal-qa` → Development deployment (for testing)

---

## 2. GitHub Actions CI/CD Pipeline

### Stage 1: Quality Checks 🧹
```yaml
jobs:
  quality-checks:     # Code quality validation
  tests:             # Unit tests
  security:          # Security scanning
```

**Checks performed:**
- ESLint (code quality)
- Prettier (formatting)
- Vitest (unit tests)
- Security audit
- Coverage reports

**Duration:** ~2-3 minutes

---

### Stage 2: Build 🏗️
```yaml
jobs:
  build:            # Application build
```

**Actions:**
- Install dependencies
- TypeScript compilation
- Vite production build
- Generate build artifacts

**Duration:** ~1-2 minutes

---

### Stage 3: Deploy 🚀
```yaml
jobs:
  deploy:           # Deployment logic
  healthcheck:      # Post-deployment verification
  dashboard:        # Status reporting
```

#### Deployment Logic:
The pipeline automatically determines where to deploy based on:
- **Repository + Branch combination**

| Repository | Branch | Environment | Secrets Used |
|------------|--------|-------------|--------------|
| `olwalgeorge/StarMock` | Any branch | Development | `RENDER_*_DEV` |
| `blelian/StarMock` | `main` | Production | `RENDER_*` |
| `blelian/StarMock` | Other branches | Development | `RENDER_*_DEV` (if configured) |

#### Health Check 🔍
After deployment, the pipeline:
- Waits for the app to be ready
- Makes HTTP requests to verify deployment
- Retries up to 3 times with backoff
- Fails the deployment if health checks fail

**Duration:** ~3-5 minutes

---

## 3. Deployment Environments

### Development Environment (Fork)
- **Repository:** `olwalgeorge/StarMock`
- **URL:** Configured via `RENDER_APP_URL_DEV`
- **Trigger:** Push to any branch
- **Purpose:** Feature testing, QA validation

### Production Environment (Upstream)
- **Repository:** `blelian/StarMock`
- **URL:** Configured via `RENDER_APP_URL`
- **Trigger:** Push/merge to `main` branch
- **Purpose:** Live production application

---

## 4. Manual Deployment Options

### Emergency Deployment
Use GitHub Actions "Workflow dispatch" with `skip_tests: true` for urgent fixes.

### Branch-Specific Testing
Push to `olwal-qa` branch to test in development environment before merging to main.

---

## 5. Troubleshooting Guide

### Pre-commit Hook Issues
```bash
# Fix linting issues
npm run lint:fix

# Fix formatting issues
npm run format

# Run tests
npm test

# Skip tests for faster commits (when working on non-test changes)
SKIP_TESTS=true git commit -m "your message"
```

### Pipeline Failures
1. **Check GitHub Actions logs** for detailed error messages
2. **Common issues:**
   - Missing environment variables
   - Test failures
   - Build errors
   - Health check timeouts

### Deployment Issues
- **Fork deployments fail:** Check `RENDER_*_DEV` secrets in fork repo
- **Main deployment fails:** Check `RENDER_*` secrets in upstream repo
- **Health check fails:** Verify Render app is running and accessible

---

## 6. Repository Secrets Configuration

### Fork Repository (`olwalgeorge/StarMock`)
```
RENDER_DEPLOY_HOOK_URL_DEV    # Development deployment webhook
RENDER_APP_URL_DEV           # Development app URL for health checks
```

### Upstream Repository (`blelian/StarMock`)
```
RENDER_DEPLOY_HOOK_URL       # Production deployment webhook
RENDER_APP_URL              # Production app URL for health checks
RENDER_DEPLOY_HOOK_URL_DEV   # Optional: Development deployment webhook
RENDER_APP_URL_DEV          # Optional: Development app URL for branch testing
```

---

## 7. Team Workflow Recommendations

### For Developers:
1. **Always create feature branches** from `main`
2. **Test locally** before pushing
3. **Push to `olwal-qa`** for QA testing before merging
4. **Create PRs** for code review

### For QA Team:
1. **Monitor `olwal-qa` deployments** for testing
2. **Check health check results** in GitHub Actions
3. **Verify deployments** in development environment
4. **Approve PRs** only after successful testing

### For Release:
1. **Merge approved PRs** to `main`
2. **Monitor production deployment** in GitHub Actions
3. **Verify production health checks** pass
4. **Communicate deployment status** to stakeholders

---

## 8. Monitoring & Alerts

### GitHub Actions Dashboard
- Real-time pipeline status
- Build/deployment logs
- Test results and coverage
- Deployment targets and status

### Health Check Monitoring
- Automatic post-deployment verification
- HTTP status code validation
- Response time monitoring
- Retry logic with exponential backoff

### Notification Channels
- GitHub PR comments for deployment status
- Email notifications for pipeline failures
- Slack integration (if configured)

---

## 9. Performance Metrics

### Typical Pipeline Times:
- **Quality Checks:** 2-3 minutes
- **Build:** 1-2 minutes
- **Deploy:** 3-5 minutes
- **Total:** 6-10 minutes

### Success Rates:
- Target: >95% success rate
- Monitor failure patterns
- Address recurring issues promptly

---

## 10. Emergency Procedures

### For Critical Issues:
1. **Use emergency deployment** with test skipping
2. **Direct push to main** (only for critical fixes)
3. **Monitor deployment closely**
4. **Rollback plan ready** (previous working commit)

### Contact Information:
- **QA Lead:** [Your Name]
- **DevOps:** [Responsible Person]
- **Emergency Contact:** [On-call Person]

---

*Last updated: January 29, 2026*
*Document maintained by: QA Team*</content>
<parameter name="filePath">c:\Users\PC\byu classwork\cse499\StarMock\CICD_GUIDE.md