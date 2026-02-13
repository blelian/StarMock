# AIR Configuration Roadmap

Last updated: February 13, 2026

## Objective
Implement AI Role (AIR) configuration so interview questions, feedback, and progress stats adapt to each user's target role, industry, and seniority level.

## Scope
- Career profile capture at interview entry (not hard-gated in auth flow).
- Hybrid role intelligence:
  - canonical role schema in app config
  - AI enrichment for question/review content
- Explicit OpenAI provisioning and operational controls for AIR runtime.
- Role and industry-aware questioning and evaluation.
- Dynamic AIR metrics in feedback/history.
- Prompt versioning, quality checks, and safe rollout controls.

## Current Baseline (From Code)
- ~~Interview questions are currently generic/random via `GET /api/questions?limit=1`~~ → **DONE (Phase 2)**: `GET /api/questions` supports `airMode` with role-matched question filtering + generic fallback.
- ~~Session creation currently accepts only question IDs~~ → **DONE (Phase 2)**: `POST /api/sessions` accepts `airMode` + `airContext`, stores immutable AIR snapshot.
- ~~User model does not store career targeting metadata~~ → **DONE (Phase 1)**: `app/src/models/User.js` now has `careerProfile` subdocument.
- ~~No profile API or UI~~ → **DONE (Phase 1)**: `GET/PATCH /api/auth/profile` + AIR overlay on interview page.
- ~~No AIR taxonomy or context resolver~~ → **DONE (Phase 2)**: `airProfiles.js` canonical schema + `resolveAirContext()` deterministic resolver.
- AI feedback prompt does not include role/industry context: `app/src/services/feedback/providers/openAIProvider.js`.
- Feedback UI is STAR-centric and session-aggregated, not role competency-aware: `app/public/components/feedback.js`.
- **OpenAI provider status (as of current `.env`)**:
  - `OPENAI_API_KEY` is provisioned.
  - `FEEDBACK_PROVIDER=openai` is enabled (OpenAI active for feedback path).
  - `TRANSCRIPTION_PROVIDER=mock` (OpenAI Whisper path exists but is not active).
  - AIR question generation is not yet using OpenAI (Phase 3 scope).

## Target Outcome
- User is asked for role context before starting interview flow.
- AIR mode uses profile context (`jobTitle`, `industry`, `seniority`, optional JD text).
- Question generation and feedback are both role-aware and AI-enhanced.
- Stats are dynamic and competency-based rather than static placeholders.
- Prompt outputs are traceable by prompt version and AIR profile version.

## Guiding Decisions
- Keep auth flow low-friction:
  - no hard block in login/signup pages
  - collect AIR profile in interview flow
- Use hybrid taxonomy, not pure static or pure AI:
  - app owns stable schema for consistency
  - AI fills question/review detail within schema constraints
- Ship questioning and feedback context together to avoid split behavior.
- Always preserve safe fallback:
  - if AIR context is missing or invalid, use existing generic question + STAR evaluation path.

## OpenAI Provisioning And Operations
Status: **Partially complete**

Completed:
- Credential provisioning:
  - `OPENAI_API_KEY` set in environment.
- Provider wiring:
  - OpenAI feedback provider implemented and selectable via `FEEDBACK_PROVIDER`.

Pending for AIR runtime:
- AIR question generation provider path:
  - add OpenAI-backed generator for question fallback when curated coverage is low.
- OpenAI configuration surface for AIR:
  - `OPENAI_AIR_QUESTION_MODEL`
  - `OPENAI_AIR_QUESTION_TIMEOUT_MS`
  - `OPENAI_AIR_QUESTION_PROMPT_VERSION`
  - `OPENAI_AIR_QUESTION_MAX_TOKENS`
- Reliability controls:
  - bounded retry, timeout, and fallback to curated/generic question bank.
- Cost and usage controls:
  - per-request token limits, aggregate usage metrics, and alert thresholds.
- Security controls:
  - ensure API key is only env-based in deployment; no client exposure.
- Rollout controls:
  - feature-flagged AIR OpenAI calls (`0% -> 10% -> 50% -> 100%`).

## Delivery Plan

### Phase 1: Career Profile Capture (Soft Gate at Interview Entry) ✅ COMPLETE
Completed: February 13, 2026 | Tests: 78/78 passing | Lint: clean
Timeline: 2 days

**What was delivered:**
- `careerProfile` subdocument on User model with `targetJobTitle`, `industry` (enum: 10 industries), `seniority` (enum: entry/mid/senior), `jobDescriptionText` (optional, max 3000 chars).
- `getCareerProfile()` and `hasCompleteCareerProfile()` model methods.
- `validateCareerProfileRequest()` validator with full normalization and error codes.
- `GET /api/auth/profile` and `PATCH /api/auth/profile` routes (auth-guarded).
- `profileComplete` stored in session at login/signup/profile-update.
- AIR setup overlay on `interview.html` — soft gate with "Save and continue" / "Skip for now".
- `interview-redirect.js` flow: fetch profile → prompt if missing → save via API → start AIR or generic mode.
- AIR context badge on interview page showing role/industry/seniority.
- `buildQuestionUrl()` passes AIR params (`airMode`, `industry`, `seniority`, `targetJobTitle`) to question API (backend consumption is Phase 2).
- Backend tests: profile get/patch/validation routes covered.
- E2e mocks updated for new profile endpoints.

**Files changed:**
- `app/src/models/User.js` — careerProfile subdocument + methods
- `app/src/validators/api.js` — `validateCareerProfileRequest`
- `app/src/routes/auth.js` — profile routes + `buildUserResponse()`
- `app/src/config/session.js` — `profileComplete` in session
- `app/public/interview.html` — AIR overlay + context badge
- `app/public/components/interview-redirect.js` — AIR flow + helpers
- `app/src/backend-tests/validators.test.ts` — profile validation tests
- `app/src/backend-tests/auth.routes.test.ts` — profile route tests
- `app/e2e/ai-recording.spec.ts` — profile API mocks

**Known minor gaps (non-blocking, addressed in Phase 2):**
- Signup response doesn't use `buildUserResponse()` (consistency, not correctness).
- No UI to edit profile after initial setup (need "edit role" link on AIR badge).
- `/api/questions` doesn't consume AIR params yet (Phase 2 scope).

### Phase 2: AIR Context Engine (Hybrid Taxonomy + Contracts) ✅ COMPLETE
Completed: February 13, 2026 | Tests: 84/84 passing | Lint: clean
Timeline: 3-4 days

**What was delivered:**
- `airProfiles.js` canonical taxonomy: 10 industries, 3 seniority bands, 8 roles with aliases and competencies. `AIR_CONTEXT_VERSION = 'air-context.v1'`.
- `resolveRoleFromJobTitle()` — fuzzy alias matching with scoring (exact=100, contains=80, reverse-contains=70, <70=custom_role).
- `INDUSTRY_COMPETENCIES` map — maps each industry to relevant competency tags.
- Normalization helpers: `normalizeIndustry()`, `normalizeSeniority()`, `isSupportedIndustry()`, `isSupportedSeniority()`.
- `resolveAirContext(input)` service — deterministic context resolver producing `{version, targetJobTitle, industry, seniority, role: {id, label, source, confidence}, competencies: [...], contextKey}`.
- `InterviewQuestion.airProfile` subdocument with `contextVersion`, `industries[]`, `roles[]`, `seniority[]`, `competencies[]` + indexes.
- `InterviewSession.metadata` extended with `airMode`, `airContextVersion`, `airContext` (full immutable snapshot).
- `GET /api/questions` — when `airMode=true`: validates AIR params, resolves context, queries role-matched questions with generic fallback, returns `mode`, `airContext`, `sourceBreakdown: {roleMatched, fallback}`.
- `POST /api/sessions` — accepts `airMode` + `airContext`, resolves and stores immutable AIR snapshot in metadata.
- `validateCreateSessionRequest()` extended for `airMode` (boolean) + `airContext` validation (reuses `validateCareerProfileRequest()`).
- Seed data updated: all questions tagged with `DEFAULT_AIR_PROFILE` (all 8 roles, 3 industries, 3 seniority levels).
- Frontend: Edit button on AIR badge (blocks during active session). Session create payload includes `airMode` + `airContext`.
- Phase 1 gaps resolved: signup uses `buildUserResponse()`, Edit button added, `/api/questions` consumes AIR params.
- New tests: `air.context.test.ts` (known/unknown role resolution), AIR-specific tests in `interviews.routes.test.ts` (question rejection, metadata response, session validation).

**Files changed:**
- `app/src/config/airProfiles.js` — NEW: canonical taxonomy + resolver + normalization
- `app/src/services/air/index.js` — NEW: deterministic AIR context resolver
- `app/src/models/InterviewQuestion.js` — `airProfile` subdocument + indexes
- `app/src/models/InterviewSession.js` — `airMode`, `airContextVersion`, `airContext` in metadata
- `app/src/routes/interviews.js` — AIR query handling in GET /api/questions + POST /api/sessions
- `app/src/validators/api.js` — extended session validator for airMode/airContext
- `app/src/utils/seed.js` — AIR profile tags on seed questions
- `app/src/routes/auth.js` — signup now uses `buildUserResponse()`
- `app/public/interview.html` — Edit button on AIR badge
- `app/public/components/interview-redirect.js` — Edit handler + session create payload
- `app/src/backend-tests/air.context.test.ts` — NEW: context resolver tests
- `app/src/backend-tests/interviews.routes.test.ts` — AIR route tests
- `app/src/backend-tests/validators.test.ts` — session validator tests

**Known minor gaps (non-blocking, address in Phase 3/4):**
- No negative unit test for `resolveAirContext` with missing required fields (validator blocks upstream).
- Seed questions all share the same `airProfile` (all 8 roles) — generic-fallback path in `getQuestionsForAirContext()` is never exercised with real data.
- `getQuestionsForAirContext()` filters by `roles` only, not `industries` or `seniority` — fine for MVP, revisit when question bank grows.
- No rate-limit on profile edit endpoint beyond auth guard.

### Phase 3: Merged AIR Runtime (Questions + Feedback) ← NEXT
Timeline: 4-5 days

Goals:
- Update question selection pipeline to use AIR context.
- Support source priority:
  1. curated role-matched bank
  2. AI-generated fallback when coverage is low
- Inject AIR context into feedback provider prompt.
- Add competency scoring extension alongside STAR scoring.
- Store prompt/profile/version metadata for both question and feedback outputs.
- Activate OpenAI for AIR question generation path with timeout/retry/fallback controls.

Primary files:
- `app/src/routes/interviews.js`
- `app/public/components/interview-redirect.js`
- `app/src/services/feedback/providers/openAIProvider.js`
- `app/src/services/feedback/jobWorker.js`
- `app/src/models/FeedbackReport.js`

Acceptance criteria:
- `GET /api/questions` returns AIR-aware questions when profile exists.
- Feedback content and suggestions are role/seniority-specific.
- Existing generic behavior still works when AIR context is absent.
- Prompt and AIR version metadata is persisted.
- OpenAI-backed AIR question generation works behind a feature flag.
- OpenAI timeout/retry/fallback behavior is tested for AIR question flow.
- AI token usage/latency metadata is captured for AIR question generation.

### Phase 4: Dynamic Stats, Testing, and Rollout
Timeline: 2-3 days

Goals:
- Replace static stats with computed AIR metrics:
  - `roleFitScore`
  - `competencyCoverage`
  - `weakestCompetency`
  - trend across recent sessions
- Add role context indicators in interview and feedback views.
- Add backend/provider/e2e coverage for AIR flows.
- Roll out behind feature flags with staged traffic.

Primary files:
- `app/public/interview.html`
- `app/public/components/interview-redirect.js`
- `app/public/feedback.html`
- `app/public/components/feedback.js`
- `app/src/backend-tests/interviews.routes.test.ts`
- `app/src/backend-tests/feedback.provider.test.ts`
- `app/e2e/ai-recording.spec.ts` (or new AIR e2e spec)
- Optional history updates:
  - `app/public/history.html`
  - `app/public/components/history.js`

Acceptance criteria:
- Feedback and stats vary by role profile and evaluated competencies.
- CI covers AIR happy path and failure scenarios.
- Feature-flag rollout supports 10% -> 50% -> 100%.
- Rollback path documented.

## Prompt Versioning and Quality Strategy
- Add explicit prompt identifiers:
  - `AIR_QUESTION_PROMPT_VERSION`
  - `AIR_FEEDBACK_PROMPT_VERSION`
- Persist prompt version in `FeedbackReport.evaluatorMetadata` and AIR session metadata.
- Create regression fixture set of representative roles/responses.
- Add provider tests to validate:
  - JSON schema stability
  - competency fields present
  - fallback behavior on malformed AI output
- Track quality KPIs:
  - relevance score (manual rubric sample)
  - fallback rate
  - user retry/edit rate on generated outputs

## Production Readiness Gates
1. Data integrity:
   - AIR profile input is validated and versioned.
2. Relevance quality:
   - Role relevance benchmark passes threshold for MVP role set.
3. Feedback quality:
   - Role-specific coaching is consistent and actionable.
4. Reliability:
   - AIR question retrieval and feedback generation meet SLO.
5. Observability:
   - Metrics/logs expose AIR usage, fallback, and failure points.

## Risks and Mitigations
- Taxonomy drift (too static or too AI-driven):
  - Mitigation: hybrid schema plus controlled AI enrichment.
- Sparse coverage for long-tail roles:
  - Mitigation: AI fallback generation with output validation and caching.
- Prompt drift and unstable output shape:
  - Mitigation: strict schema enforcement, versioning, regression fixtures.
- Over-complex onboarding:
  - Mitigation: short profile form and optional JD text.
- Regression risk in auth flow:
  - Mitigation: keep AIR prompt in interview flow, not login flow.

## Recommended MVP Release Slice
- Industry set: `technology`, `finance`, `healthcare`.
- Seniority set: `entry`, `mid`, `senior`.
- Initial roles:
  - software engineer
  - frontend developer
  - backend developer
  - data analyst
  - data scientist
  - product manager
  - project manager
  - business analyst
- Question source priority:
  1. curated DB question with AIR match
  2. AI-generated question with AIR constraints
- Delivery estimate:
  - 12-14 working days
  - approximately 3 weeks calendar including QA and rollout checks

## Definition of Done
- AIR profile capture is available at interview entry with fallback mode.
- AIR sessions get role-aware questions and feedback.
- Feedback includes STAR + role competency metrics with versioned metadata.
- Stats and UI messaging are dynamic and AIR-based.
- Tests, feature flags, observability, and rollback controls are in place.
