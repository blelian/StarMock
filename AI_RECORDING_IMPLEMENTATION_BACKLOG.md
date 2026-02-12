# AI + Recording Implementation Backlog

Last updated: February 12, 2026
Source roadmap: `AI_RECORDING_PRODUCTION_ROADMAP.md`

## How To Use This Backlog
- Each epic maps directly to a roadmap phase.
- Each story includes target files/endpoints and acceptance criteria.
- Use story IDs as ticket IDs (or copy into Jira/GitHub issues).

## Delivery Workflow (Coding -> Review -> Release)

### 1) Ticket Intake
- Confirm story scope, dependencies, and definition of done.
- Confirm API contract changes before coding.

### 2) Implementation
- Use short-lived branch per story (`feat/ai-10x-*`).
- Keep commits small and logically scoped.
- Add/adjust tests in the same PR as code changes.

### 3) Verification
- Run backend tests: `npm run test:backend`
- Run backend coverage: `npm run test:backend:coverage`
- Run lint: `npm run lint`
- Run any story-specific integration checks.

### 4) Review
- Reviewer validates behavior changes, fallback behavior, and failure handling.
- Reviewer checks security constraints for any audio/upload/provider code.
- Reviewer confirms observability hooks are present for new async paths.

### 5) Release
- Canary rollout by feature flag where applicable.
- Monitor SLO/error dashboards before increasing rollout percentage.
- Keep rollback steps in PR description for each epic.

## Epic E1: Async Feedback Orchestration (Phase 1)

### Story E1-S1: Add feedback job persistence model
- Files:
  - `app/src/models/FeedbackJob.js` (new)
  - `app/src/models/index.js`
- Acceptance criteria:
  1. Job status supports `queued`, `processing`, `completed`, `failed`.
  2. Model stores `sessionId`, `userId`, `attempts`, `lastError`, `startedAt`, `completedAt`.
  3. Indexes support fast lookup by status and created time.
  4. Duplicate jobs for the same session are prevented by unique guard.
- Task checklist:
  - [ ] Create model schema and indexes.
  - [ ] Export model from central model index.
  - [ ] Add lightweight model tests for status transitions.

### Story E1-S2: Trigger job creation on session completion
- Endpoints:
  - `POST /api/sessions/:id/complete`
- Files:
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Completing a valid session creates/enqueues one feedback job.
  2. Endpoint response is fast and does not synchronously evaluate feedback.
  3. Repeated completion calls remain idempotent.
- Task checklist:
  - [ ] Refactor completion route to create job.
  - [ ] Prevent duplicate jobs under retries/race conditions.
  - [ ] Keep existing session completion behavior intact.

### Story E1-S3: Add feedback job status read endpoint
- Endpoints:
  - `GET /api/sessions/:id/feedback-status` (new)
- Files:
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Returns job status for authenticated session owner only.
  2. Returns clear terminal states (`completed`, `failed`) and retry metadata.
  3. Returns 404 when session/job not found.
- Task checklist:
  - [ ] Add endpoint and auth guards.
  - [ ] Return consistent API shape for frontend polling.
  - [ ] Add route tests for unauthorized/not-found/success cases.

### Story E1-S4: Update feedback read endpoint behavior
- Endpoints:
  - `GET /api/sessions/:id/feedback`
- Files:
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Endpoint reads existing reports only; no synchronous generation.
  2. If generation is still running, returns explicit “not-ready” response.
  3. If generation failed, returns failure details safe for client display.
- Task checklist:
  - [ ] Remove generation loop from read path.
  - [ ] Wire response to job status.
  - [ ] Update tests for ready/not-ready/failed paths.

## Epic E2: LLM Provider Integration (Phase 2)

### Story E2-S1: Add OpenAI provider implementation
- Files:
  - `app/src/services/feedback/providers/openAIProvider.js` (new)
  - `app/src/services/feedback/index.js`
- Acceptance criteria:
  1. Provider follows current provider contract (`evaluate({ responseText, question })`).
  2. Provider returns response matching persisted feedback schema.
  3. Provider can be selected via `FEEDBACK_PROVIDER`.
- Task checklist:
  - [ ] Implement provider module.
  - [ ] Register provider in provider registry.
  - [ ] Add provider unit tests (success and malformed response).

### Story E2-S2: Add schema validation for evaluator output
- Files:
  - `app/src/services/feedback/validation.js` (new)
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Invalid provider payloads are rejected before saving.
  2. Validation errors are logged and trigger fallback.
  3. Response contract remains backward compatible.
- Task checklist:
  - [ ] Add payload validator.
  - [ ] Validate before `FeedbackReport` save.
  - [ ] Add tests for invalid payload handling.

### Story E2-S3: Add retry, timeout, and fallback policy
- Files:
  - `app/src/services/feedback/index.js`
  - `app/src/services/feedback/providers/openAIProvider.js`
- Acceptance criteria:
  1. Timeout and bounded retries are applied for LLM calls.
  2. Failures fall back to `rule_based`.
  3. Fallback path is observable via metadata.
- Task checklist:
  - [ ] Add timeout and retry wrapper.
  - [ ] Add fallback decision path.
  - [ ] Test provider outage and fallback behavior.

### Story E2-S4: Persist evaluator metadata
- Files:
  - `app/src/models/FeedbackReport.js`
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Stored metadata includes provider/model/latency/promptVersion/tokenUsage.
  2. Existing reports remain readable.
  3. API returns metadata for diagnostics.
- Task checklist:
  - [ ] Extend model schema.
  - [ ] Update report creation logic.
  - [ ] Add compatibility tests for old/new records.

## Epic E3: Recording Capture + Upload (Phase 3)

### Story E3-S1: Implement browser recording controls
- Files:
  - `app/public/components/interview-redirect.js`
  - `app/public/interview.html`
- Acceptance criteria:
  1. UI supports idle/recording/stopped/uploading states.
  2. User can start/stop recording and preview duration.
  3. Browser fallback message appears if recording API unsupported.
- Task checklist:
  - [ ] Add `MediaRecorder` flow.
  - [ ] Add stateful UI messaging.
  - [ ] Add cleanup for stream/track resources.

### Story E3-S2: Add signed upload URL endpoint
- Endpoints:
  - `POST /api/uploads/audio/presign` (new)
- Files:
  - `app/src/routes/uploads.js` (new)
  - `app/src/routes/index.js`
- Acceptance criteria:
  1. Authenticated users can request short-lived upload URL.
  2. Response includes object key and expiry metadata.
  3. Endpoint rejects unsupported MIME types and oversized payload intents.
- Task checklist:
  - [ ] Add upload route.
  - [ ] Add auth + validation guards.
  - [ ] Add route tests.

### Story E3-S3: Persist uploaded audio reference on response
- Endpoints:
  - `POST /api/sessions/:id/responses`
- Files:
  - `app/src/models/InterviewResponse.js`
  - `app/src/validators/api.js`
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Endpoint accepts text and audio-transcript modes.
  2. Audio metadata and reference are stored with response.
  3. Validation prevents invalid combinations of text/audio fields.
- Task checklist:
  - [ ] Extend validator for response types.
  - [ ] Update route logic.
  - [ ] Add tests for text-only/audio-transcript payloads.

## Epic E4: Transcription Pipeline (Phase 4)

### Story E4-S1: Add transcription job worker contract
- Files:
  - `app/src/services/transcription/index.js` (new)
  - `app/src/models/TranscriptionJob.js` (new, optional if separate from FeedbackJob)
- Acceptance criteria:
  1. Audio responses can transition from uploaded -> transcribing -> ready/failed.
  2. Worker interface is swappable by provider.
  3. Retries and final failure state are persisted.
- Task checklist:
  - [ ] Define transcription job model/service.
  - [ ] Add lifecycle state transitions.
  - [ ] Add tests for retry/terminal failure.

### Story E4-S2: Store transcript quality metadata
- Files:
  - `app/src/models/InterviewResponse.js`
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Transcript text, confidence, and timing metadata are persisted.
  2. Low-confidence transcripts are flagged for user review.
  3. Existing text responses remain unaffected.
- Task checklist:
  - [ ] Extend response schema for transcript metadata.
  - [ ] Update serialization on response APIs.
  - [ ] Add backward compatibility tests.

### Story E4-S3: Add transcript edit step in frontend
- Files:
  - `app/public/components/interview-redirect.js`
  - `app/public/interview.html`
- Acceptance criteria:
  1. Users can review and edit transcript before final submit.
  2. Edited transcript is persisted as final response text.
  3. Clear warning shown when confidence is below threshold.
- Task checklist:
  - [ ] Add transcript review UI.
  - [ ] Add submit flow for reviewed transcript.
  - [ ] Add frontend behavior tests where feasible.

## Epic E5: Security + Compliance Hardening (Phase 5)

### Story E5-S1: Enforce AI/STT env configuration
- Files:
  - `app/src/config/validateEnv.js`
- Acceptance criteria:
  1. Required envs are validated conditionally by chosen providers.
  2. Startup fails clearly when required provider secrets are missing.
  3. Validation messages do not leak secret values.
- Task checklist:
  - [ ] Add required vars for feedback/transcription providers.
  - [ ] Add conditional checks by provider selection.
  - [ ] Add env validation tests.

### Story E5-S2: Tighten upload and access controls
- Files:
  - `app/src/routes/uploads.js`
  - `app/src/middleware/validate.js`
- Acceptance criteria:
  1. Signed URLs are short-lived and scoped by user/session.
  2. MIME type, size, and optional duration checks are enforced.
  3. Unauthorized access and replay attempts are blocked.
- Task checklist:
  - [ ] Add strict upload validators.
  - [ ] Bind uploads to user/session ownership.
  - [ ] Add security tests for unauthorized access.

### Story E5-S3: Add rate limits for expensive endpoints
- Files:
  - `app/server.js`
  - `app/src/routes/uploads.js`
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Upload, transcription trigger, and feedback paths have route-specific limits.
  2. Limits fail gracefully with consistent error payload.
  3. Limits are configurable by environment.
- Task checklist:
  - [ ] Add dedicated rate limiters.
  - [ ] Apply to high-cost routes.
  - [ ] Add integration tests for throttling behavior.

## Epic E6: Observability + SLO Tracking (Phase 6)

### Story E6-S1: Add request/job correlation IDs
- Files:
  - `app/server.js`
  - `app/src/middleware/requestContext.js` (new)
- Acceptance criteria:
  1. Every request has a correlation ID.
  2. Async jobs retain parent correlation/session context.
  3. Errors include correlation ID for debugging.
- Task checklist:
  - [ ] Add middleware for correlation IDs.
  - [ ] Thread ID through job and provider calls.
  - [ ] Validate presence in logs.

### Story E6-S2: Add structured metrics for AI + recording flows
- Files:
  - `app/src/services/metrics/index.js` (new)
  - `app/server.js`
  - `app/src/routes/interviews.js`
- Acceptance criteria:
  1. Metrics track feedback latency/error/fallback rates.
  2. Metrics track transcription latency/error and queue depth.
  3. Metrics expose data for dashboard/alerts.
- Task checklist:
  - [ ] Define metric counters/histograms.
  - [ ] Instrument routes/services.
  - [ ] Add docs for dashboard wiring.

### Story E6-S3: Add operational alert and runbook documentation
- Files:
  - `AI_RECORDING_PRODUCTION_ROADMAP.md`
  - `DEPLOYMENT.md`
  - `BACKEND_SIGNOFF_CHECKLIST.md`
- Acceptance criteria:
  1. SLO thresholds and alert conditions are documented.
  2. On-call runbook includes diagnosis + rollback steps.
  3. Signoff checklist references required dashboard evidence.
- Task checklist:
  - [ ] Add alert thresholds.
  - [ ] Add runbook steps.
  - [ ] Add signoff criteria links.

## Epic E7: Test Matrix + Rollout (Phase 7)

### Story E7-S1: Expand backend tests for async and provider scenarios
- Files:
  - `app/src/backend-tests/interviews.routes.test.ts`
  - `app/src/backend-tests/feedback.provider.test.ts`
  - `app/src/backend-tests/feedback.service.test.ts`
- Acceptance criteria:
  1. Tests cover queued/processing/completed/failed feedback paths.
  2. Tests cover LLM timeout/fallback behavior.
  3. Tests cover validation errors for new schemas.
- Task checklist:
  - [ ] Add route tests for job orchestration.
  - [ ] Add provider fallback tests.
  - [ ] Add negative contract tests.

### Story E7-S2: Add e2e scenarios for text/audio/mixed workflows
- Files:
  - `app/e2e/ai-recording.spec.ts` (new)
  - `app/playwright.config.ts`
- Acceptance criteria:
  1. Text-only flow completes and feedback is available.
  2. Audio flow completes with transcript and feedback.
  3. Mixed flow validates both response types in one session.
- Task checklist:
  - [ ] Add Playwright specs.
  - [ ] Add deterministic test fixtures/mocks.
  - [ ] Integrate into CI workflow.

### Story E7-S3: Wire progressive rollout controls
- Files:
  - `app/src/config/featureFlags.js` (new)
  - `app/server.js`
  - `.github/workflows/deploy-render.yml`
- Acceptance criteria:
  1. Feature flags support gradual rollout percentages.
  2. Rollout config is environment-driven.
  3. Rollback path can disable AI recording features quickly.
- Task checklist:
  - [ ] Add flag evaluation utility.
  - [ ] Gate new routes/UX by flag.
  - [ ] Document rollback command/process.

## Suggested Sprint Grouping
- Sprint 1: E1 + E2-S1/S2
- Sprint 2: E2-S3/S4 + E3
- Sprint 3: E4 + E5
- Sprint 4: E6 + E7

## PR Template Additions (Recommended)
- Story ID(s): `E#-S#`
- Changed endpoints:
- Changed models:
- Fallback behavior tested:
- Security checks tested:
- Metrics/logging added:
- Rollback steps:

