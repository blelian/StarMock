# Backend Sign-Off Checklist

Use this checklist to finalize backend sign-off in CI or release candidate validation.

## 1. Preconditions

- [ ] `MONGODB_URI` is reachable from the CI runner.
- [ ] `SESSION_SECRET` is set.
- [ ] `PORT` is available for local server checks (default `3000`).
- [ ] CI runner has outbound internet access for npm install.

## 2. Automated Verification

Run from repository root:

```bash
cd app
npm ci
npm run verify:backend:signoff
```

Expected artifacts are written to `app/artifacts/backend-signoff/`:

- `lint.log`
- `backend-tests.log`
- `db-check.log`
- `seed.log`
- `server.log`
- `health.json`
- `ready.json`
- `integration.log`

## 3. Coverage Gate (Backend API/Service)

- [ ] `npm run test:backend:ci` passes.
- [ ] Coverage report is generated and reviewed for backend modules:
  - `src/routes/auth.js`
  - `src/routes/interviews.js`
  - `src/services/feedback/**/*.js`
  - `src/services/feedbackService.js`
  - `src/config/session.js`
  - `src/middleware/auth.js`
  - `src/validators/api.js`

## 4. Runtime Evidence

- [ ] `/api/health` response captured in `health.json` shows healthy status.
- [ ] `/api/ready` response captured in `ready.json` shows readiness checks passing.
- [ ] Integration flow (`test-integration.js`) passes and is captured in `integration.log`.

## 5. Release Sign-Off Evidence

- [ ] CI run URL attached to release notes.
- [ ] Coverage summary attached to release notes.
- [ ] Deployed environment health/readiness URLs and response snapshots attached.
