# AIR Configuration Roadmap

Last updated: February 14, 2026

## Objective
Implement AI Role (AIR) configuration so interview questions, feedback, and progress stats adapt to each user's target role, industry, and seniority level.

## Session Flow Overhaul TODO (Current Sprint)
Created: February 14, 2026

- [x] Define implementation checklist for realistic interview session lifecycle.
- [x] Backend: support multi-question session progression with explicit session state payload.
- [x] Backend: allow optional per-question retries in the same session (`allowRepeat`) with attempt tracking.
- [x] Backend: enforce session completion rules (all session questions answered at least once).
- [x] Backend: improve stats rollup from attempt-level feedback -> question-level -> session overall summary.
- [x] Backend: strengthen AIR profession/industry bias instructions for question generation and evaluation prompts.
- [x] Frontend: redesign interview flow for create session -> answer question -> next/repeat -> complete.
- [x] Frontend: improve speech UX and accessibility status/readout behavior for question narration + transcript flow.
- [x] QA: update backend unit tests and e2e flows for new session behavior and stats.

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
- ~~AI feedback prompt does not include role/industry context~~ → **DONE (Phase 3)**: OpenAI feedback prompt now receives AIR context from session snapshot via feedback worker; analysis stores AIR summary.
- ~~No AI-generated question fallback for sparse curated coverage~~ → **DONE (Phase 3)**: OpenAI AIR question provider with three-tier pipeline (curated → AI-generated → generic), feature-flagged.
- ~~Feedback UI is STAR-centric and session-aggregated, not role competency-aware~~ → **DONE (Phase 4)**: `feedback.html` + `feedback.js` now render AIR role metrics (role fit, coverage, weakest competency, trend) + competency breakdown cards. Backend `buildFeedbackSummary()` aggregates competency-level scores.
- **OpenAI provider status (as of current implementation)**:
  - `OPENAI_API_KEY` is provisioned.
  - `FEEDBACK_PROVIDER=openai` is enabled (OpenAI active for feedback path).
  - `TRANSCRIPTION_PROVIDER=mock` (OpenAI Whisper path exists but is not active).
  - AIR question generation is implemented behind `airQuestionGeneration` feature flag with OpenAI fallback + retry/timeout.

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
Status: **Mostly complete (Phase 4 ops hardening pending)**

Completed:
- Credential provisioning:
  - `OPENAI_API_KEY` set in environment.
- Provider wiring:
  - OpenAI feedback provider implemented and selectable via `FEEDBACK_PROVIDER`.

Completed for AIR runtime:
- AIR question generation provider path:
  - OpenAI-backed generator is active for curated coverage gaps when feature flag is enabled.
- OpenAI configuration surface for AIR:
  - `OPENAI_AIR_QUESTION_MODEL`
  - `OPENAI_AIR_QUESTION_TIMEOUT_MS`
  - `OPENAI_AIR_QUESTION_PROMPT_VERSION`
  - `OPENAI_AIR_QUESTION_MAX_TOKENS`
- Reliability controls:
  - bounded retry, timeout, and fallback to curated/generic question bank.
- Rollout controls:
  - feature-flagged AIR OpenAI calls via `airQuestionGeneration`.

Pending for production hardening:
- Cost and usage controls:
  - per-request token limits, aggregate usage metrics, and alert thresholds.
- Security controls:
  - ensure API key is only env-based in deployment; no client exposure.
  - add deployment checklist validation for OpenAI secrets.
- Rollout tuning:
  - staged traffic progression (`0% -> 10% -> 50% -> 100%`) with monitored fallback/error rates.

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

### Phase 3: Merged AIR Runtime (Questions + Feedback) ✅ COMPLETE
Completed: February 13, 2026 | Tests: 86/86 passing | Lint: clean
Timeline: 4-5 days

**What was delivered:**
- `openAIQuestionProvider.js` — NEW: OpenAI-backed AIR question generator with:
  - Strict JSON parsing with code-fence stripping.
  - Full normalization pipeline (type, difficulty, category, STAR guidelines, dedup by description).
  - Bounded retry + AbortController timeout + token/latency metadata.
  - Env-configurable model, timeout, max tokens, retries, prompt version (`air-questions.v1`).
- `getQuestionsForAirContext()` in interviews route — Three-tier question pipeline:
  1. Curated role-matched from DB (industry + seniority + role/generic).
  2. OpenAI-generated fallback when coverage is insufficient and `airQuestionGeneration` flag is enabled.
  3. Generic DB fallback with `_id $nin` dedup.
- Generated questions are persisted via `InterviewQuestion.insertMany()` with full `airProfile` metadata.
- `GET /api/questions` response now includes `aiGeneration` object (provider, model, promptVersion, attempts, latency, tokenUsage, error info) and expanded `sourceBreakdown: {roleMatched, aiGenerated, fallback}`.
- Frontend `buildQuestionUrl()` forwards `jobDescriptionText` (capped to 500 chars) in AIR mode requests.
- Feedback pipeline AIR integration:
  - `jobWorker.js` — reads `session.metadata.airContext` and passes it as `options.airContext` to `evaluateResponseWithProvider()`.
  - `feedback/index.js` — `evaluateWithPolicy()` spreads options (including `airContext`) into provider `evaluate()` call.
  - `openAIProvider.js` — `buildPrompt()` generates AIR context block with role/industry/seniority/competencies; `normalizeEvaluation()` stores `airContext` summary and `airContextUsed` flag in analysis.
  - `FeedbackReport` stores AIR markers in `evaluatorMetadata`: `airMode`, `airContextKey`, `generatedAt`, `correlationId`.
- `featureFlags.js` — `airQuestionGeneration` flag with `FEATURE_AIR_QUESTION_GENERATION_ENABLED` (default: off) and `FEATURE_AIR_QUESTION_GENERATION_ROLLOUT_PERCENT` (default: 0%).
- `validateEnv.js` — `OPENAI_API_KEY` is now required when `FEATURE_AIR_QUESTION_GENERATION_ENABLED` is true (alongside existing feedback/transcription checks).
- Test coverage: AIR OpenAI generation test (spy + insertMany mock), AIR context forwarding test in feedback provider, `airQuestionGeneration` flag snapshot test. `afterEach` cleans up AIR flag env vars.

**Files changed:**
- `app/src/services/air/openAIQuestionProvider.js` — NEW: OpenAI AIR question generator
- `app/src/routes/interviews.js` — three-tier question pipeline, `aiGeneration` response, `sourceBreakdown` expansion
- `app/src/services/feedback/index.js` — options spread through `evaluateWithPolicy` to provider
- `app/src/services/feedback/jobWorker.js` — AIR context extraction from session + pass-through
- `app/src/services/feedback/providers/openAIProvider.js` — AIR context block in prompt, AIR summary in analysis
- `app/src/models/FeedbackReport.js` — `airMode`, `airContextKey`, `correlationId`, `generatedAt` in `evaluatorMetadata`
- `app/src/config/featureFlags.js` — `airQuestionGeneration` flag definition + rollout in snapshot
- `app/src/config/validateEnv.js` — OpenAI key required when AIR generation enabled
- `app/public/components/interview-redirect.js` — `jobDescriptionText` forwarding in `buildQuestionUrl()`
- `app/src/backend-tests/interviews.routes.test.ts` — AIR generation test + env cleanup
- `app/src/backend-tests/feedback.provider.test.ts` — AIR context forwarding test
- `app/src/backend-tests/featureFlags.test.ts` — AIR flag snapshot assertion

**Known minor gaps (non-blocking, address in Phase 4):**
1. ~~**Competency scoring extension**~~ — **Resolved (Phase 4)**: `roleFitScore`, `competencyScores`, `competencyCoverage` now normalized in `openAIProvider.js` and aggregated in `buildFeedbackSummary()`.
2. **No negative-path unit test for `generateAirQuestions` directly** — the provider is tested indirectly via the route spy mock. A dedicated unit test file (e.g. `openAIQuestionProvider.test.ts`) with timeout, retry-exhaustion, and malformed-JSON scenarios would strengthen coverage.
3. **`normalizeGenerationError` duplication** — identical helper exists in both `interviews.js` and `feedback/index.js`. Could be extracted to a shared util.
4. **`toPositiveInteger` / `clampString` repeated** — appear in `openAIQuestionProvider.js`, `feedback/index.js`, and `jobWorker.js`. Candidate for a shared `utils/parse.js` module.
5. **Token-budget guardrails** — `DEFAULT_MAX_TOKENS = 1200` is set but there's no aggregate per-user or per-session token cap. Acceptable for MVP; should be monitored before wide rollout.
6. **`jobDescriptionText` truncation consistency** — frontend caps at 500 chars in query string, but the prompt template doesn't re-truncate. Low risk since query strings have browser limits, but explicit capping in the prompt builder would be defensive.

### Phase 4: Dynamic Stats, Testing, and Rollout ⚙️ IN PROGRESS
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

Implementation status (current):
- ✅ `openAIProvider.js` — `normalizeEvaluation()` now produces `analysis.roleFitScore`, `analysis.competencyScores`, `analysis.competencyCoverage`, `analysis.roleFitSummary`. New helpers: `toOptionalScore()`, `normalizeCompetencyKey()`, `normalizeCompetencyScores()`. Prompt schema asks for `roleFitScore`, `roleFitSummary`, and `competencyScores` when AIR context is present.
- ✅ `interviews.js` — NEW `buildFeedbackSummary()` function aggregates per-report data into session-level `summary`:
  - `starScores` (averaged STAR subscores).
  - `roleMetrics.roleFitScore` (averaged per-report role-fit).
  - `roleMetrics.competencyCoverage` (covered / expected competencies %).
  - `roleMetrics.strongestCompetency` / `weakestCompetency` (sorted by score).
  - `roleMetrics.competencyScores[]` (key, label, averaged score).
  - `roleMetrics.trend` (delta vs up-to-5 prior same-context sessions; direction: up/down/flat with ±3pt threshold).
  - Historical lookup queries `FeedbackReport` by `evaluatorMetadata.airContextKey` + `userId`, limited to 40 reports / 5 sessions.
- ✅ `serializeFeedbackReports()` now includes `analysis` field per report.
- ✅ `GET /api/sessions/:id/feedback` returns `summary` alongside `feedback[]` when reports exist.
- ✅ `feedback.html` — NEW `air-metrics-panel` section: 4 metric cards (Role Fit, Coverage, Weakest, Trend) + competency breakdown list. Hidden when `airMode` is false.
- ✅ `feedback.js` — `renderAirMetrics(summary)` populates AIR metric cards, `formatDelta()` for trend display, `competencyLabelFromKey()` formatting, graceful fallback to `--` for missing data. Uses `summary.starScores` when available, falls back to client-side averaging.
- ✅ `history.js` — history rows now surface AIR status + role metrics (`Role fit`, `Coverage`, `Trend`) when available, with per-session `data-session-id` hooks for e2e assertions.
- ✅ `ai-recording.spec.ts` — added Playwright coverage for AIR metrics rendering on feedback page and AIR trend surfacing in history rows.
- ✅ Backend test: `'returns AIR summary metrics when competency scores are present'` verifies full `roleMetrics` shape including strongest/weakest competency and coverage.
- ⏳ Remaining: execute AIR e2e suite in CI-compatible browser runtime (blocked locally — no dev server / sandbox restriction).

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

## AIR Feature-Flag Rollout Playbook

### Feature flag reference
| Flag | File | Default | Controls |
|---|---|---|---|
| `airQuestionGeneration` | `src/config/featureFlags.js` | `0` (off) | AIR question generation via OpenAI. When off, sessions use curated DB questions only. |

### Staged rollout plan

#### Stage 1 — Canary (10%)
1. Set `airQuestionGeneration` rollout percentage to `10` in `featureFlags.js` (or via environment override `FF_AIR_QUESTION_GENERATION=10`).
2. Deploy to production.
3. **Monitor for 48 hours:**
   - OpenAI error rate in logs (`[AIR-QGen]` prefix).
   - Fallback rate — how often sessions degrade to curated questions.
   - Feedback latency p95 — should stay under 8 s.
   - `429` (rate limit) count from OpenAI.
4. **Gate:** Proceed to Stage 2 only if fallback rate < 5% and no unresolved errors.

#### Stage 2 — Partial (50%)
1. Set rollout to `50`.
2. Deploy.
3. **Monitor for 72 hours:**
   - Same metrics as Stage 1.
   - User-facing: verify competency scores and role-fit values look reasonable (spot-check 10 sessions).
   - Token spend — confirm monthly projection is within budget.
4. **Gate:** Proceed to Stage 3 only if quality spot-check passes and cost is acceptable.

#### Stage 3 — General Availability (100%)
1. Set rollout to `100`.
2. Deploy.
3. Continue monitoring for 1 week.
4. After stable period, consider removing the feature flag wrapper (keep the flag definition for future use).

### Rollback procedure
1. Set `airQuestionGeneration` rollout to `0` (or set env `FF_AIR_QUESTION_GENERATION=0`).
2. Deploy. No migration needed — sessions already created with AIR context retain their data; new sessions simply won't use AIR question generation.
3. Existing AIR feedback reports remain intact (they carry `evaluatorMetadata.airMode` and `airContextKey` for auditability).
4. The feedback UI gracefully hides the AIR metrics panel when `summary.airMode` is false, so no UI breakage.

### Observability checklist
- [ ] `[AIR-QGen]` log lines include `airContextKey`, prompt version, and latency.
- [ ] `[FeedbackEval]` log lines include `airMode`, `roleFitScore`, and competency count.
- [ ] Feature flag evaluation is logged at debug level with userId hash for audit.
- [ ] OpenAI API errors are captured with retry count and final status.
- [ ] Dashboard or alert for: fallback rate > 10%, p95 latency > 10 s, error rate > 2%.

### E2E validation in CI
The Playwright E2E specs in `app/e2e/ai-recording.spec.ts` cover:
- AIR metrics panel visible when `summary.airMode=true` (feedback page).
- AIR metrics panel hidden for generic sessions (feedback page).
- AIR trend details rendered in history rows.

These tests use API-level mocking (`page.route`) and do not require a live OpenAI key. They require a running dev server — configure `playwright.config.ts` `webServer` or start the server in CI before running:
```bash
npm run dev &          # start Vite dev server
npx playwright test    # run E2E suite
```

## Definition of Done
- AIR profile capture is available at interview entry with fallback mode.
- AIR sessions get role-aware questions and feedback.
- Feedback includes STAR + role competency metrics with versioned metadata.
- Stats and UI messaging are dynamic and AIR-based.
- Tests, feature flags, observability, and rollback controls are in place.
- Rollout playbook documented with staged gates and rollback procedure.
