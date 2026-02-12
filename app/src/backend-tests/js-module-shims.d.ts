declare module '../config/session.js' {
  export interface SessionHelpers {
    isAuthenticated: (req: unknown) => boolean
    getUserId: (req: unknown) => unknown
    setUserSession: (
      req: Record<string, any>,
      userId: unknown,
      userData?: Record<string, unknown>
    ) => void
    saveSession: (req: Record<string, any>) => Promise<void>
    clearUserSession: (req: Record<string, any>) => Promise<void>
    regenerateSession: (req: Record<string, any>) => Promise<void>
    touchSession: (req: Record<string, any>) => void
    getSessionInfo: (req: Record<string, any>) => Record<string, unknown>
  }

  export function createSessionMiddleware(): unknown
  export const sessionHelpers: SessionHelpers
  const _default: typeof createSessionMiddleware
  export default _default
}

declare module '../middleware/auth.js' {
  export type Middleware = (
    req: Record<string, any>,
    res: Record<string, any>,
    next: (err?: unknown) => void
  ) => unknown

  export const requireAuth: Middleware
  export const requireGuest: Middleware
  export const requireAdmin: Middleware
  export const optionalAuth: Middleware
  export const refreshSession: Middleware
}

declare module '../routes/auth.js' {
  import type { Router } from 'express'
  const authRoutes: Router
  export default authRoutes
}

declare module '../routes/interviews.js' {
  import type { Router } from 'express'
  const interviewRoutes: Router
  export default interviewRoutes
}

declare module '../services/feedbackService.js' {
  export interface FeedbackEvaluation {
    scores: Record<string, number>
    rating: string
    strengths: string[]
    suggestions: string[]
    analysis: Record<string, unknown>
  }

  export function evaluateResponse(
    responseText: string,
    question?: unknown
  ): FeedbackEvaluation
}

declare module '../services/feedback/index.js' {
  export interface FeedbackEvaluationResult {
    scores: Record<string, number>
    rating: string
    strengths: string[]
    suggestions: string[]
    analysis: Record<string, unknown>
  }

  export interface FeedbackProvider {
    id: string
  }

  export function getFeedbackProvider(providerId?: string): FeedbackProvider
  export function getAvailableFeedbackProviders(): string[]
  export function evaluateResponseWithProvider(
    responseText: string,
    question?: unknown,
    providerId?: string
  ): Promise<{ evaluation: FeedbackEvaluationResult; evaluatorType: string }>
}

declare module '../validators/api.js' {
  export interface ValidationResult {
    valid: boolean
    message?: string
    code?: string
    fields?: Record<string, unknown>
  }

  export function validateSignupRequest(req: unknown): ValidationResult
  export function validateLoginRequest(req: unknown): ValidationResult
  export function validateCreateSessionRequest(req: unknown): ValidationResult
  export function validateSubmitResponseRequest(req: unknown): ValidationResult
}
