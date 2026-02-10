# StarMock Backend Implementation Plan

## Objective
Build a production-ready backend that supports authentication, interview sessions, scoring/feedback, and user history for the existing StarMock frontend flows.

## Current State (as of February 9, 2026)
- Backend exists but minimal: `app/server.js` only serves static files and `GET /api/health`.
- Frontend interview/auth/history pages are mostly static prototypes in `app/public/`.
- Auth is client-side localStorage and must be replaced by secure server-side auth.

## MVP Scope
- User authentication (signup/login/logout/me)
- Interview question retrieval
- Interview session lifecycle (start, answer, complete)
- Feedback generation (initial rules-based STAR scoring)
- Interview history retrieval
- Secure protected API routes

## Proposed Stack
- Runtime/API: Node.js + Express
- Database: PostgreSQL (Render managed)
- ORM: Prisma
- Auth: JWT in `httpOnly` cookies + bcrypt password hashing
- Validation: Zod
- Testing: Vitest + Supertest

## Milestones

### Phase 1: Backend Foundation (Day 1-2)
- Refactor backend into modules (app/config/routes/middleware/services).
- Add middleware: JSON parsing, CORS, Helmet, rate limiting, request logging.
- Keep and expand `GET /api/health` with timestamp/version metadata.
- Add centralized error handling and request validation pattern.

### Phase 2: Data Layer (Day 2-3)
- Set up Prisma + PostgreSQL connection.
- Create initial schema:
  - `User`
  - `InterviewQuestion`
  - `InterviewSession`
  - `InterviewResponse`
  - `FeedbackReport`
- Add migrations and seed script with starter interview questions.

### Phase 3: Authentication (Day 3-4)
- Implement:
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Use bcrypt for password storage.
- Issue JWT in secure `httpOnly` cookie.
- Add auth middleware for protected endpoints.

### Phase 4: Interview APIs (Day 4-6)
- Implement:
  - `GET /api/questions`
  - `POST /api/sessions`
  - `POST /api/sessions/:id/responses`
  - `POST /api/sessions/:id/complete`
  - `GET /api/sessions/:id/feedback`
  - `GET /api/history`
- Connect existing frontend pages to these endpoints.

### Phase 5: Feedback Engine MVP (Day 6-7)
- Add rules-based STAR evaluator:
  - Situation, Task, Action, Result sub-scores
  - overall score
  - strengths/improvements/tips
- Persist generated feedback per completed session.
- Keep evaluator behind an interface for future AI model integration.

### Phase 6: Testing and Quality (Day 7-8)
- Add integration tests for auth/session/history flows.
- Add validation and unauthorized-access tests.
- Ensure lint, format, tests, and build pass local + CI.

### Phase 7: Deployment Hardening (Day 9-10)
- Add/validate production env vars in Render.
- Add startup env checks and structured logs.
- Verify deployed E2E flow:
  - login -> start interview -> submit answer -> feedback -> history.

## API Contract (MVP)

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Interview
- `GET /api/questions?type=&difficulty=`
- `POST /api/sessions`
- `POST /api/sessions/:id/responses`
- `POST /api/sessions/:id/complete`
- `GET /api/sessions/:id/feedback`
- `GET /api/history`

## Data Model (MVP)

### User
- `id`, `name`, `email` (unique), `passwordHash`, `createdAt`, `updatedAt`

### InterviewQuestion
- `id`, `type`, `difficulty`, `prompt`, `tags`, `createdAt`

### InterviewSession
- `id`, `userId`, `questionId`, `status`, `startedAt`, `completedAt`

### InterviewResponse
- `id`, `sessionId`, `responseText`, `createdAt`

### FeedbackReport
- `id`, `sessionId`, `overallScore`
- `situationScore`, `taskScore`, `actionScore`, `resultScore`
- `strengths` (JSON/text), `improvements` (JSON/text), `tips` (JSON/text)
- `createdAt`

## Security and Reliability Requirements
- Store auth token only in `httpOnly`, `secure` (prod), `sameSite` cookies.
- Hash passwords with bcrypt (never store plaintext).
- Rate-limit auth routes.
- Validate all request payloads with explicit schemas.
- Return consistent error payloads with safe messages.

## Definition of Done
- Protected pages use backend auth, not localStorage checks.
- End-to-end MVP user flow works with persisted data.
- CI passes all quality gates.
- Production health endpoint is green and monitored.

## Immediate Next Build Step
Implement Phase 1 + Phase 2 first:
1. backend module structure
2. prisma schema + migration
3. base middleware/error system
4. keep `GET /api/health` stable
