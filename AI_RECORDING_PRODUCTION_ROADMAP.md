# AI Integration and Recording Production Roadmap

Last updated: February 12, 2026

## Objective
Deliver production-grade AI feedback and audio recording/transcription for interview sessions with strong reliability, security, and observability.

## Scope
- AI feedback generation (LLM + fallback provider strategy)
- Audio recording capture, upload, storage, and transcription
- Feedback and transcription orchestration, persistence, and retrieval
- Production readiness controls (testing, monitoring, rollout, and rollback)

## Current Baseline (From Code)
- Feedback provider abstraction exists, but only `rule_based` is registered: `app/src/services/feedback/index.js`.
- Feedback generation currently runs synchronously in `GET /api/sessions/:id/feedback`: `app/src/routes/interviews.js`.
- Recording UI is placeholder-only (`Recording...`) with text input workflow: `app/public/components/interview-redirect.js`.
- Response model includes future-facing audio fields (`responseType`, `audioUrl`): `app/src/models/InterviewResponse.js`.
- Environment validation does not yet enforce AI/STT provider secrets: `app/src/config/validateEnv.js`.

## Target Architecture
- Async feedback pipeline triggered on session completion (not on feedback read path).
- Pluggable feedback providers:
  - Primary: LLM provider
  - Secondary: rule-based fallback
- Audio pipeline:
  - Browser capture (`MediaRecorder`)
  - Signed upload URL flow to object storage
  - Async transcription worker
  - Optional user transcript edit before submit
- End-to-end observability:
  - Request tracing IDs
  - Metrics for latency, error rate, queue depth, cost
  - Alerting tied to SLOs

## Delivery Plan

### Phase 1: Orchestration and Data Contracts (Week 1)
Goals:
- Move feedback generation trigger to `POST /api/sessions/:id/complete`.
- Add async job states: `queued`, `processing`, `completed`, `failed`.
- Define strict JSON schema contract for evaluator output.
- Add idempotency keys for completion and generation operations.

Acceptance criteria:
- Completing a session enqueues work and returns quickly.
- Repeated completion calls are idempotent.
- Invalid evaluator payloads are rejected before persistence.

### Phase 2: LLM Provider Integration (Week 1)
Goals:
- Add provider module under `app/src/services/feedback/providers/`.
- Add model timeout, retry with bounded backoff, and circuit-breaker behavior.
- Persist evaluator metadata:
  - provider
  - model/version
  - latency
  - token usage
  - prompt template version
- Keep `rule_based` fallback as safe default.

Acceptance criteria:
- If LLM succeeds, feedback is saved with `evaluatorType` and metadata.
- If LLM fails, fallback path still produces feedback.
- Provider failures are measurable and alertable.

### Phase 3: Recording Capture and Upload (Week 2)
Goals:
- Implement browser recording flow with start/stop UI states.
- Add upload API for signed URLs and storage metadata validation.
- Enforce MIME, duration, and max size checks.
- Persist upload reference on response record.

Acceptance criteria:
- Users can record audio and upload it successfully.
- Oversized or invalid files are rejected with clear errors.
- Uploaded object references are stored and retrievable.

### Phase 4: Transcription Pipeline (Week 2)
Goals:
- Add async transcription processing for uploaded audio.
- Persist transcript text, confidence, and timing metadata.
- Add optional redaction pass for sensitive content.
- Allow user transcript review/edit before final response submission.

Acceptance criteria:
- Audio response produces transcript with processing status updates.
- Low-confidence transcripts are flagged.
- User can fix transcript before STAR scoring.

### Phase 5: Security and Compliance Hardening (Week 3)
Goals:
- Short-lived signed URLs and least-privilege storage access.
- Explicit consent log for audio processing.
- Data retention/deletion lifecycle for audio and transcripts.
- Route-level rate limits for upload, transcription, and feedback generation.

Acceptance criteria:
- Unauthorized object access is blocked.
- Deletion and retention policies are implemented and testable.
- Abuse/rate spikes are throttled without taking down core flows.

### Phase 6: Observability and SLOs (Week 3)
Goals:
- Add metrics for:
  - feedback generation latency/error/fallback rate
  - transcription latency/error rate
  - queue depth and retry counts
  - provider token/cost usage
- Define SLOs and alert thresholds.
- Correlate session lifecycle using request and job IDs.

Acceptance criteria:
- Dashboards show full AI and recording pipeline health.
- Alerts trigger for SLO violation and sustained provider failures.

### Phase 7: Test Matrix and Progressive Rollout (Week 4)
Goals:
- Add test coverage for:
  - provider success/failure/fallback
  - recording upload validation
  - transcription status transitions
  - async job retries and dead-letter handling
- Add e2e flow tests for text-only, audio-only, and mixed usage.
- Roll out gradually (10% -> 50% -> 100%) with rollback plan.

Acceptance criteria:
- CI passes unit, integration, and e2e quality gates.
- Canary rollout shows stable latency/error/cost before full release.
- Rollback is tested and documented.

## Production Readiness Gates
1. Functional completeness:
   - text-only, audio-only, and mixed paths work end-to-end.
2. Reliability:
   - provider outage scenarios degrade gracefully via fallback.
3. Security:
   - upload validation, access controls, and data lifecycle are enforced.
4. Performance:
   - p95 completion-to-feedback latency stays within agreed threshold.
5. Quality:
   - AI output schema is stable and evaluation quality passes benchmark set.
6. Operability:
   - dashboards and actionable alerts exist before 100% rollout.

## Minimum KPI/SLO Starter Set
- Feedback generation success rate: >= 99%
- Fallback rate: <= 5% (steady state)
- Feedback p95 latency (completion -> available): <= 30s
- Transcription success rate: >= 98%
- Transcription p95 latency: <= 45s
- Upload validation false-negative rate: 0 known cases

## Risk Register
- Provider instability or rate limits:
  - Mitigation: fallback provider, retries, circuit breaker, budget caps.
- Cost overrun from token/audio usage:
  - Mitigation: quotas, max durations, usage telemetry, alerting.
- Low transcript quality:
  - Mitigation: confidence thresholds and user edit step.
- Security exposure on file access:
  - Mitigation: short-lived signed URLs, strict ACL, audit logs.
- Long-tail failures in async workers:
  - Mitigation: dead-letter queue, replay tooling, runbooks.

## Definition of Done
- Production traffic served by AI + recording pipeline at 100% rollout.
- All production gates pass for two consecutive release cycles.
- On-call runbook, rollback playbook, and dashboards are in place.
- Post-release metrics remain within SLO for 14 days.

## Implementation Status Snapshot (February 12, 2026)
Implemented in this repository:
- Async feedback orchestration:
  - `POST /api/sessions/:id/complete` enqueues `FeedbackJob`.
  - `GET /api/sessions/:id/feedback-status` and async `GET /api/sessions/:id/feedback` read paths.
- LLM + fallback hardening:
  - OpenAI provider integrated with timeout, bounded retry, strict evaluation validation, and rule-based fallback.
  - Evaluator metadata persisted (`provider`, `model`, `promptVersion`, `latency`, `tokenUsage`, fallback data).
- Audio + transcription pipeline:
  - Browser recording start/stop/upload states in `app/public/components/interview-redirect.js`.
  - Signed upload flow in `POST /api/uploads/audio/presign` and tokenized upload endpoint.
  - Audio response persistence (`responseType`, `audioUrl`, transcript confidence/state metadata).
  - Transcription job model + worker with status transitions: `uploaded -> transcribing -> ready|failed`.
  - Transcript status and edit endpoints:
    - `GET /api/sessions/:id/responses/:responseId/transcription-status`
    - `PATCH /api/sessions/:id/responses/:responseId/transcript`
- Security + rollout controls:
  - Conditional env validation for feedback/transcription/upload providers.
  - Route-specific rate limits for expensive feedback/upload endpoints.
  - Signed upload replay protection.
  - Feature flags with rollout percentages and `/api/features` endpoint.
- Observability:
  - Request correlation IDs (`x-correlation-id`) across API + job metadata.
  - Structured request logging with correlation IDs.
  - Metrics service and `/api/metrics` endpoint (JSON or Prometheus text).
  - Feedback/transcription queue depth, latency, fallback, and error metrics.
