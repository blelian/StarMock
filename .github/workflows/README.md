# 🚀 GitHub Actions Workflows# 🚀 GitHub Actions Workflows



Comprehensive CI/CD, security, and quality assurance workflows for StarMock.Comprehensive CI/CD, security, and quality assurance workflows for StarMock.



## 📋 Workflows Overview## 📋 Workflows Overview



### 1. **Deploy to Render** (`deploy-render.yml`) 🚀### 1. **Deploy to Render** (`deploy-render.yml`) 🚀

**Triggers:** **Triggers:** 

- Push to `main` branch (automatic)- Push to `main` branch (automatic)

- Manual dispatch- Manual dispatch



**Purpose:** Full-stack deployment to Render (backend + frontend)**Purpose:** Full-stack deployment to Render (backend + frontend)



**Jobs:****Jobs:**

- 🏗️ **Pre-Deploy Checks**- 🏗️ Build and Test

  - Install dependencies  - Install dependencies

  - Run linting and formatting checks  - Run linting and formatting checks

  - Run unit tests with coverage  - Run unit tests

  - Security audit (npm audit)  - Build production bundle

  - Build production bundle  - Verify build artifacts

  - Verify build artifacts- 🚀 Deploy

- 🚀 **Deploy**  - Triggers Render deploy hook

  - Triggers Render deploy hook via POST request  - Render pulls code and rebuilds

  - Render pulls latest code and rebuilds  - Express backend + React frontend

  - Deploys Express backend + React frontend- 🏥 Post-Deployment Health Check

- 🏥 **Health Check**  - Waits for deployment completion

  - Waits for deployment to stabilize  - Checks `/api/health` endpoint

  - Checks `/api/health` endpoint  - Retries up to 10 times

  - Retries up to 10 times with exponential backoff  - Reports success/failure

  - Reports deployment status

- 📢 **Notifications****Required Secrets:**

  - Posts deployment summary to GitHub- `RENDER_DEPLOY_HOOK_URL`

  - Reports success/failure with details- `RENDER_APP_URL`



**Required Secrets:****Badge:**

- `RENDER_DEPLOY_HOOK_URL` - Webhook URL from Render dashboard```markdown

- `RENDER_APP_URL` - Production app URL (e.g., https://starmock.onrender.com)![Deploy to Render](https://github.com/olwalgeorge/StarMock/actions/workflows/deploy-render.yml/badge.svg)

```

**Badge:**

```markdown---

![Deploy to Render](https://github.com/olwalgeorge/StarMock/actions/workflows/deploy-render.yml/badge.svg)

```### 2. **CI Workflow** (`ci.yml`)

**Triggers:** All branches (push & PRs)

---

**Purpose:** Fast feedback for every code change

### 2. **CI Workflow** (`ci.yml`)

**Triggers:** All branches (push & PRs)**Jobs:**

- ✅ Lint & Test

**Purpose:** Fast feedback for every code change  - Format checking (Prettier)

  - ESLint analysis

**Jobs:**  - Unit tests

- ✅ **Lint & Test**  - Security audit (npm audit)

  - Format checking (Prettier)  - Dependency health check

  - ESLint analysis- 🔒 Security Scan

  - Unit tests  - CodeQL analysis for JavaScript/TypeScript

  - Security audit- 🏗️ Build

- 🔒 **Security Scan**  - Production build verification

  - CodeQL v4 analysis  - Artifact upload

- 🏗️ **Build**

  - Production build verification**Badge:**

```markdown

**Badge:**![CI](https://github.com/olwalgeorge/StarMock/actions/workflows/ci.yml/badge.svg)

```markdown```

![CI](https://github.com/olwalgeorge/StarMock/actions/workflows/ci.yml/badge.svg)

```---



---### 2. **CI Workflow** (`ci.yml`)

**Triggers:** All branches (push & PRs)

### 3. **Test Workflow** (`test.yml`)

**Triggers:** `main` and `develop` branches**Purpose:** Fast feedback for every code change



**Purpose:** Matrix testing across Node.js versions**Jobs:**

- ✅ Lint & Test

**Strategy:**  - Format checking (Prettier)

- Node.js 18.x  - ESLint analysis

- Node.js 20.x  - Unit tests

  - Security audit (npm audit)

**Badge:**  - Dependency health check

```markdown- 🔒 Security Scan

![Test](https://github.com/olwalgeorge/StarMock/actions/workflows/test.yml/badge.svg)  - CodeQL v4 analysis for JavaScript/TypeScript

```- 🏗️ Build

  - Production build verification

---  - Artifact upload



### 4. **Code Coverage** (`coverage.yml`)**Badge:**

**Triggers:** `main` branch only```markdown

![CI](https://github.com/olwalgeorge/StarMock/actions/workflows/ci.yml/badge.svg)

**Purpose:** Track test coverage metrics```



**Badge:**---

```markdown

![Coverage](https://github.com/olwalgeorge/StarMock/actions/workflows/coverage.yml/badge.svg)### 3. **Test Workflow** (`test.yml`)

```**Triggers:** `main` and `develop` branches



---**Purpose:** Matrix testing across Node.js versions



### 5. **PR Quality Checks** (`pr-checks.yml`)**Strategy:**

**Triggers:** Pull requests- Node.js 18.x

- Node.js 20.x

**Purpose:** Enforce PR quality standards

**Jobs:**

**Badge:**- Format checking

```markdown- Linting

![PR Checks](https://github.com/olwalgeorge/StarMock/actions/workflows/pr-checks.yml/badge.svg)- Tests

```- Build



---**Badge:**

```markdown

### 6. **Security Workflow** (`security.yml`)![Test](https://github.com/olwalgeorge/StarMock/actions/workflows/test.yml/badge.svg)

**Triggers:** ```

- Push to `main`/`develop`

- PRs to `main`/`develop`---

- Weekly schedule (Mondays)

### 3. **Test Workflow** (`test.yml`)

**Purpose:** Comprehensive security analysis**Triggers:** `main` and `develop` branches



**Badge:****Purpose:** Matrix testing across Node.js versions

```markdown

![Security](https://github.com/olwalgeorge/StarMock/actions/workflows/security.yml/badge.svg)**Strategy:**

```- Node.js 18.x

- Node.js 20.x

---

**Jobs:**

### 7. **Quality Gates** (`quality-gates.yml`)- Format checking

**Triggers:** PRs and pushes to `main`/`develop`- Linting

- Tests

**Purpose:** Enforce code quality standards- Build



**Badge:****Badge:**

```markdown```markdown

![Quality Gates](https://github.com/olwalgeorge/StarMock/actions/workflows/quality-gates.yml/badge.svg)![Test](https://github.com/olwalgeorge/StarMock/actions/workflows/test.yml/badge.svg)

``````



------



## 🔐 Required Secrets### 4. **Code Coverage** (`coverage.yml`)

**Triggers:** `main` branch only

### Render Deployment

Add these in: **Settings → Secrets and variables → Actions****Purpose:** Track test coverage



```**Features:**

RENDER_DEPLOY_HOOK_URL- Runs full test suite with coverage

└── Webhook URL from Render dashboard- Installs @vitest/coverage-v8

    Example: https://api.render.com/deploy/srv-xxxxx?key=yyyyy- Optional Codecov upload

- Coverage artifacts

RENDER_APP_URL

└── Your production app URL**Badge:**

    Example: https://starmock.onrender.com```markdown

```![Coverage](https://github.com/olwalgeorge/StarMock/actions/workflows/coverage.yml/badge.svg)

```

**How to get them:**

1. Go to Render Dashboard---

2. Select your service

3. Navigate to **Settings** tab### 4. **Code Coverage** (`coverage.yml`)

4. Scroll to **Deploy Hook** section**Triggers:** `main` branch only

5. Click **Create Deploy Hook**

6. Copy the generated URL → `RENDER_DEPLOY_HOOK_URL`**Purpose:** Track test coverage

7. Copy your app URL from the top → `RENDER_APP_URL`

**Features:**

---- Runs full test suite with coverage

- Installs @vitest/coverage-v8

## 📊 Workflow Quality Score- Optional Codecov upload

- Coverage artifacts

| Category | Score | Details |

|----------|-------|---------|**Badge:**

| **Testing** | A | Unit tests, matrix testing, coverage |```markdown

| **Security** | A+ | CodeQL v4, secret scanning, audits |![Coverage](https://github.com/olwalgeorge/StarMock/actions/workflows/coverage.yml/badge.svg)

| **Quality** | A | Linting, formatting, quality gates |```

| **Deployment** | A | Automated with health checks |

| **Overall** | **A (95/100)** | Production-ready CI/CD |---



---### 5. **PR Quality Checks** (`pr-checks.yml`)

**Triggers:** Pull requests (when opened/updated)

## 🚀 Quick Start

**Purpose:** Enforce PR quality standards

### 1. Get Render Secrets

Ask your team member who deployed for:**Checks:**

- Render production URL- 📏 PR Size Analysis

- Deploy hook URL (or access to create one)  - Warns if >20 files or >500 lines changed

  - Auto-comments with recommendations

### 2. Add Secrets to GitHub- 📝 PR Title Format

```bash  - Validates Conventional Commits format

Settings → Secrets and variables → Actions → New repository secret  - Suggests corrections

```- 🚨 Breaking Changes Detection

- 📌 TODO/FIXME Scanner

### 3. Commit and Push- ✅ Commit Message Validation

All workflows activate automatically when merged to `main`.- 🔍 Code Quality Analysis

  - Linting with error reporting

### 4. Test Deployment  - Format checking

```bash  - Test coverage

Actions → Deploy to Render → Run workflow (manual trigger)- 🔐 Dependency Review

```  - Security vulnerability scan

  - License compliance

---

**Badge:**

**Last Updated:** January 2026  ```markdown

**Maintained by:** StarMock QA Team![PR Checks](https://github.com/olwalgeorge/StarMock/actions/workflows/pr-checks.yml/badge.svg)

```

---

### 5. **PR Quality Checks** (`pr-checks.yml`)
**Triggers:** Pull requests (when opened/updated)

**Purpose:** Enforce PR quality standards

**Checks:**
- 📏 PR Size Analysis
  - Warns if >20 files or >500 lines changed
  - Auto-comments with recommendations
- 📝 PR Title Format
  - Validates Conventional Commits format
  - Suggests corrections
- 🚨 Breaking Changes Detection
- 📌 TODO/FIXME Scanner
- ✅ Commit Message Validation
- 🔍 Code Quality Analysis
  - Linting with error reporting
  - Format checking
  - Test coverage
- 🔐 Dependency Review
  - Security vulnerability scan
  - License compliance

**Badge:**
```markdown
![PR Checks](https://github.com/olwalgeorge/StarMock/actions/workflows/pr-checks.yml/badge.svg)
```

---

### 6. **Security Workflow** (`security.yml`)
**Triggers:** 
- Push to `main`/`develop`
- PRs to `main`/`develop`
- Weekly schedule (Mondays at 00:00)
- Manual dispatch

**Purpose:** Comprehensive security analysis

**Jobs:**
- 🛡️ Vulnerability Scan
  - npm audit with severity thresholds
  - Fails on critical/high vulnerabilities
  - Uploads audit results
- 🔍 CodeQL Analysis
  - Security & quality queries
  - JavaScript/TypeScript analysis
- 🔑 Secret Scanning
  - TruffleHog OSS integration
  - Detects exposed secrets/keys
- 📦 Dependency Check
  - Outdated dependencies
  - Package integrity verification

**Badge:**
```markdown
![Security](https://github.com/olwalgeorge/StarMock/actions/workflows/security.yml/badge.svg)
```

---

### 6. **Security Workflow** (`security.yml`)
**Triggers:** 
- Push to `main`/`develop`
- PRs to `main`/`develop`
- Weekly schedule (Mondays at 00:00)
- Manual dispatch

**Purpose:** Comprehensive security analysis

**Jobs:**
- 🛡️ Vulnerability Scan
  - npm audit with severity thresholds
  - Fails on critical/high vulnerabilities
  - Uploads audit results
- 🔍 CodeQL Analysis (v4)
  - Security & quality queries
  - JavaScript/TypeScript analysis
- 🔑 Secret Scanning
  - TruffleHog OSS integration
  - Detects exposed secrets/keys
- 📦 Dependency Check
  - Outdated dependencies
  - Package integrity verification

**Badge:**
```markdown
![Security](https://github.com/olwalgeorge/StarMock/actions/workflows/security.yml/badge.svg)
```

---

### 7. **Quality Gates** (`quality-gates.yml`)
**Triggers:** PRs and pushes to `main`/`develop`

**Purpose:** Enforce code quality standards

**Jobs:**
- 📊 Code Coverage Analysis
  - Test coverage with thresholds
  - Coverage reports
  - PR comments with metrics
- 📐 Quality Metrics
  - ESLint with error reporting
  - Code formatting verification
  - Complexity analysis
  - File size monitoring
- ⚡ Performance Check
  - Build time measurement
  - Bundle size analysis
  - Largest file identification

**Badge:**
```markdown
![Quality Gates](https://github.com/olwalgeorge/StarMock/actions/workflows/quality-gates.yml/badge.svg)
```

---

### 7. **Quality Gates** (`quality-gates.yml`)
**Triggers:** PRs and pushes to `main`/`develop`

**Purpose:** Enforce code quality standards

**Jobs:**
- 📊 Code Coverage Analysis
  - Test coverage with thresholds
  - Coverage reports
  - PR comments with metrics
- 📐 Quality Metrics
  - ESLint with error reporting
  - Code formatting verification
  - Complexity analysis
  - File size monitoring
- ⚡ Performance Check
  - Build time measurement
  - Bundle size analysis
  - Largest file identification

**Badge:**
```markdown
![Quality Gates](https://github.com/olwalgeorge/StarMock/actions/workflows/quality-gates.yml/badge.svg)
```

---

## 🔄 Dependabot Configuration

**File:** `.github/dependabot.yml`

**Features:**
- 📦 Weekly npm dependency updates
- 🔄 Weekly GitHub Actions updates
- 📊 Grouped updates (patch, dev, testing)
- 🔒 Ignores major React updates (breaking changes)
- 🏷️ Auto-labeling and assignment

**Update Schedule:**
- Every Monday at 09:00
- Maximum 5 PRs for npm
- Maximum 3 PRs for GitHub Actions

---

## 🎯 Workflow Strategy

### Branch-Based Execution

| Workflow | All Branches | main/develop | main Only |
|----------|:------------:|:------------:|:---------:|
| Deploy to Render | ❌ | ❌ | ✅ |
| Deploy to Vercel | ✅ (PRs) | ✅ | ✅ |
| CI | ✅ | ✅ | ✅ |
| Test | ❌ | ✅ | ✅ |
| Coverage | ❌ | ❌ | ✅ |
| PR Checks | ✅ (PRs only) | ✅ (PRs only) | ✅ (PRs only) |
| Security | ❌ | ✅ | ✅ |
| Quality Gates | ❌ | ✅ | ✅ |

### Why This Strategy?

**Main Branch Only:**
- **Deploy to Render**: Production deployments (full-stack with backend)
- **Coverage**: Baseline coverage tracking

**All Branches with PRs:**
- **Deploy to Vercel**: Frontend preview deployments on PRs

**Feature Branches (`olwal-qa`, etc.):**
- CI runs on every push (fast feedback)
- PR Checks run when creating PR
- Lighter CI load

**Protected Branches (`main`, `develop`):**
- Full test matrix
- Security scans
- Quality gates
- Coverage tracking

**Main Branch:**
- Everything above
- Code coverage reports
- Production-ready validation

---

## 📊 Status Badges

Add to your README.md:

```markdown
## CI/CD Status

[![CI](https://github.com/olwalgeorge/StarMock/actions/workflows/ci.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/ci.yml)
[![Test](https://github.com/olwalgeorge/StarMock/actions/workflows/test.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/test.yml)
[![Coverage](https://github.com/olwalgeorge/StarMock/actions/workflows/coverage.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/coverage.yml)
[![Security](https://github.com/olwalgeorge/StarMock/actions/workflows/security.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/security.yml)
[![Quality Gates](https://github.com/olwalgeorge/StarMock/actions/workflows/quality-gates.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/quality-gates.yml)
[![PR Checks](https://github.com/olwalgeorge/StarMock/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/pr-checks.yml)
```

---

## 🛠️ Local Testing

Test workflows locally before pushing:

```bash
cd app

# Run all quality checks
npm run lint
npm run format:check
npm test -- --run
npm run build

# Check for security vulnerabilities
npm audit

# Check for outdated dependencies
npm outdated
```

---

## 🔍 Troubleshooting

### Workflow Not Running
1. Check branch triggers in workflow file
2. Verify `.github/workflows/` directory location
3. Check workflow syntax with GitHub's validator

### Tests Failing in CI but Pass Locally
1. Ensure `package-lock.json` is committed
2. Check Node.js version match (20.x recommended)
3. Verify all dependencies are in `package.json`

### Security Audit Failures
```bash
# Check locally
cd app
npm audit

# Fix automatically
npm audit fix

# For breaking changes
npm audit fix --force
```

### Linting Errors
```bash
# Check locally
cd app
npm run lint

# Auto-fix
npm run lint:fix
```

### Format Check Failures
```bash
# Check locally
cd app
npm run format:check

# Auto-fix
npm run format
```

---

## 🎓 Best Practices

### For Contributors

**Before Creating a PR:**
1. ✅ Run `npm run lint:fix`
2. ✅ Run `npm run format`
3. ✅ Run `npm test -- --run`
4. ✅ Run `npm run build`
5. ✅ Check `npm audit`

**PR Guidelines:**
- Keep PRs small (<20 files, <500 lines)
- Use Conventional Commits format
- Add tests for new features
- Update documentation
- Respond to automated feedback

**Conventional Commits Format:**
```
<type>(<scope>): <description>

Examples:
feat: add user authentication
fix(api): resolve race condition
docs: update testing guide
test: add unit tests for App
```

### For Maintainers

**Branch Protection:**
- Require PR reviews
- Require status checks to pass
- Require up-to-date branches
- Restrict force pushes

**Recommended Required Checks:**
- CI / lint-and-test
- CI / security-scan
- CI / build
- PR Quality Checks / code-quality
- Security / vulnerability-scan

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev/)
- [ESLint Documentation](https://eslint.org/)
- [Prettier Documentation](https://prettier.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [CodeQL Documentation](https://codeql.github.com/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

---

## 🔐 Security

All workflows follow security best practices:
- ✅ Minimal permissions (principle of least privilege)
- ✅ No secrets in logs
- ✅ Dependency pinning recommended
- ✅ Regular security scans
- ✅ Automated dependency updates

---

## 📞 Support

Issues with workflows? Check:
1. [GitHub Actions tab](https://github.com/olwalgeorge/StarMock/actions)
2. Workflow run logs
3. This documentation
4. Open an issue with workflow logs attached
