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

## 6. AI Recording Rollout Gate

- [ ] Feature flags are explicitly set for the release window:
  - `FEATURE_AI_RECORDING_ENABLED`
  - `FEATURE_AI_RECORDING_ROLLOUT_PERCENT`
  - `FEATURE_AUDIO_UPLOADS_ENABLED`
  - `FEATURE_AUDIO_UPLOADS_ROLLOUT_PERCENT`
  - `FEATURE_TRANSCRIPTION_ENABLED`
  - `FEATURE_TRANSCRIPTION_ROLLOUT_PERCENT`
- [ ] Rollout starts at canary (for example `10%`) before increasing.
- [ ] Rollback command/process is documented in release notes (set rollout to `0` or disable flags).

## 7. AI/Transcription SLO Evidence

- [ ] `/api/metrics` snapshot is attached for sign-off.
- [ ] Feedback queue depth metric is stable (`starmock_feedback_queue_depth`).
- [ ] Transcription queue depth metric is stable (`starmock_transcription_queue_depth`).
- [ ] Feedback fallback rate is within threshold (`starmock_feedback_fallback_total` trend).
- [ ] No sustained spike in:
  - `starmock_feedback_provider_errors_total`
  - `starmock_transcription_jobs_total{status="failed"}`

## 8. Operational Runbook Checks

- [ ] Correlation ID is visible in request logs and error payloads (`x-correlation-id`).
- [ ] On-call can trace a failed session end-to-end via correlation/job IDs.
- [ ] Upload security controls validated:
  - short-lived token expiry
  - MIME/size validation
  - replay blocked (`UPLOAD_ALREADY_USED`)
