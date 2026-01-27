# 🚀 GitHub Actions Workflows

Comprehensive CI/CD, security, and quality assurance workflows for StarMock.

## 📋 Workflows Overview

### 1. **CI Workflow** (`ci.yml`)
**Triggers:** All branches (push & PRs)

**Purpose:** Fast feedback for every code change

**Jobs:**
- ✅ Lint & Test
  - Format checking (Prettier)
  - ESLint analysis
  - Unit tests
  - Security audit (npm audit)
  - Dependency health check
- 🔒 Security Scan
  - CodeQL analysis for JavaScript/TypeScript
- 🏗️ Build
  - Production build verification
  - Artifact upload

**Badge:**
```markdown
![CI](https://github.com/olwalgeorge/StarMock/actions/workflows/ci.yml/badge.svg)
```

---

### 2. **Test Workflow** (`test.yml`)
**Triggers:** `main` and `develop` branches

**Purpose:** Matrix testing across Node.js versions

**Strategy:**
- Node.js 18.x
- Node.js 20.x

**Jobs:**
- Format checking
- Linting
- Tests
- Build

**Badge:**
```markdown
![Test](https://github.com/olwalgeorge/StarMock/actions/workflows/test.yml/badge.svg)
```

---

### 3. **Code Coverage** (`coverage.yml`)
**Triggers:** `main` branch only

**Purpose:** Track test coverage

**Features:**
- Runs full test suite with coverage
- Installs @vitest/coverage-v8
- Optional Codecov upload
- Coverage artifacts

**Badge:**
```markdown
![Coverage](https://github.com/olwalgeorge/StarMock/actions/workflows/coverage.yml/badge.svg)
```

---

### 4. **PR Quality Checks** (`pr-checks.yml`) 🆕
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

### 5. **Security Workflow** (`security.yml`) 🆕
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

### 6. **Quality Gates** (`quality-gates.yml`) 🆕
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
| CI | ✅ | ✅ | ✅ |
| Test | ❌ | ✅ | ✅ |
| Coverage | ❌ | ❌ | ✅ |
| PR Checks | ✅ (PRs only) | ✅ (PRs only) | ✅ (PRs only) |
| Security | ❌ | ✅ | ✅ |
| Quality Gates | ❌ | ✅ | ✅ |

### Why This Strategy?

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
