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

declare module '../models/FeedbackJob.js' {
  import type { Model, Document, Types } from 'mongoose'

  export interface IFeedbackJobLastError {
    message?: string
    code?: string
    stack?: string
    occurredAt?: Date
  }

  export interface IFeedbackJobMetadata {
    provider?: string
    responseCount?: number
    correlationId?: string
  }

  export interface IFeedbackJob extends Document {
    _id: Types.ObjectId
    sessionId: Types.ObjectId
    userId: Types.ObjectId
    status: 'queued' | 'processing' | 'completed' | 'failed'
    attempts: number
    maxAttempts: number
    idempotencyKey: string
    lastError?: IFeedbackJobLastError
    startedAt?: Date
    completedAt?: Date
    metadata?: IFeedbackJobMetadata
    createdAt: Date
    updatedAt: Date
    duration: number | null
    markProcessing(): Promise<boolean>
    markCompleted(): Promise<void>
    markFailed(error: Error): Promise<{ retrying: boolean }>
    canRetry(): boolean
  }

  export interface IFeedbackJobModel extends Model<IFeedbackJob> {
    generateIdempotencyKey(sessionId: string): string
    findOrCreateForSession(
      sessionId: string,
      userId: string,
      metadata?: IFeedbackJobMetadata
    ): Promise<{ job: IFeedbackJob; created: boolean }>
    getQueuedJobs(limit?: number): Promise<IFeedbackJob[]>
    getStaleProcessingJobs(staleMinutes?: number): Promise<IFeedbackJob[]>
  }

  export const JOB_STATUSES: readonly ['queued', 'processing', 'completed', 'failed']
  export const MAX_ATTEMPTS: 3

  const FeedbackJob: IFeedbackJobModel
  export default FeedbackJob
}
