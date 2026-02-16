# Seamless End-to-End Interview Flow Plan (2026)

## Overview
This plan documents the steps to make the StarMock interview and feedback flow seamless, robust, and user-friendly, based on the latest codebase audit (as of Feb 16, 2026). It corrects previous assumptions: the real controller is `interview-redirect.js` (1614 lines, fully wired), not `interview.js` (25 lines, unused).

## Key Gaps & Improvements

1. **Session Abandonment/Expiry**
   - Implement PATCH `/api/sessions/:id/abandon` endpoint.
   - Add scheduled job to mark stale `in_progress` sessions as `abandoned` (e.g., after 2 hours inactivity).
   - Update frontend to warn/auto-abandon if user leaves mid-session.

2. **Concurrent Session Guard**
   - In `POST /api/sessions`, check for existing `in_progress` session for user. Block or return existing session if found.
   - Update frontend to handle this gracefully (show resume/continue prompt).

3. **Feedback Polling Backoff**
   - In `feedback.js`, replace fixed 2.5s polling with exponential backoff (e.g., 2.5s → 5s → 10s, max 30s) and jitter.
   - Add a visible spinner/progress indicator during feedback generation.

4. **History N+1 Optimization**
   - Add inline summary scores to `GET /api/history` so `history.js` can render all scores in one call (avoid per-session fetches).
   - Update backend and frontend accordingly.

5. **Auto-save Draft Support**
   - In `interview-redirect.js`, auto-save response drafts to `localStorage` per session/question.
   - Warn user on `beforeunload` if unsaved work exists.
   - Restore drafts on reload.

6. **Validation Logging**
   - In `feedback/validation.js`, add warn-level logging when invalid scores are replaced with defaults.
   - (Optional) Surface validation errors in dev/test environments.

7. **Remove Dead interview.js**
   - Delete `app/public/components/interview.js` (25 lines, unused).
   - Ensure only `interview-redirect.js` is loaded in `interview.html`.

## Implementation Steps

1. **Document this plan** (this file)
2. **Implement session abandonment/expiry**
3. **Add concurrent session guard**
4. **Improve feedback polling**
5. **Optimize history API and frontend**
6. **Add auto-save draft support**
7. **Add validation logging**
8. **Remove dead code**

---

**Note:**
- The frontend is already robust and feature-rich in `interview-redirect.js` and `feedback.js`.
- All changes should be tested for both AIR and generic modes.
- See audit for further context and rationale.
