// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FeedbackReport,
  FeedbackJob,
  InterviewResponse,
  InterviewSession,
} from '../models/index.js'
import interviewRoutes from '../routes/interviews.js'
import { getRouteHandlers, runRouteHandlers } from './routerHarness'

type FeedbackJobModelLike = {
  findOrCreateForSession: (
    sessionId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ) => Promise<{
    job: { _id: string; status: string; attempts: number }
    created: boolean
  }>
  findOne: (...args: unknown[]) => Promise<{
    _id: string
    status: string
    attempts: number
    maxAttempts?: number
    lastError?: { message?: string; code?: string; occurredAt?: Date }
    createdAt?: Date
    startedAt?: Date
    completedAt?: Date
  } | null>
}

type FeedbackReportModelLike = {
  find: (...args: unknown[]) => {
    populate: (...populateArgs: unknown[]) => Promise<Array<Record<string, unknown>>>
  }
  countDocuments: (...args: unknown[]) => Promise<number>
}

type RouterLike = {
  stack: Array<Record<string, unknown>>
}

const interviewRouter = interviewRoutes as unknown as RouterLike
const feedbackJobModel = FeedbackJob as unknown as FeedbackJobModelLike
const feedbackReportModel = FeedbackReport as unknown as FeedbackReportModelLike

function createAuthenticatedRequest() {
  return {
    session: {
      userId: 'user-123',
      user: {
        id: 'user-123',
        email: 'demo@starmock.dev',
      },
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('interview route validation guards', () => {
  const getQuestionsHandlers = getRouteHandlers(interviewRouter, 'get', '/questions')
  const getHistoryHandlers = getRouteHandlers(interviewRouter, 'get', '/history')
  const createSessionHandlers = getRouteHandlers(interviewRouter, 'post', '/sessions')

  it('rejects invalid question type', async () => {
    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: { type: 'invalid-type' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_TYPE',
      },
    })
  })

  it('rejects invalid question difficulty', async () => {
    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: { difficulty: 'extreme' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_DIFFICULTY',
      },
    })
  })

  it('rejects question limit above maximum', async () => {
    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: { limit: '999' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_LIMIT',
      },
    })
  })

  it('rejects history status outside allowed values', async () => {
    const res = await runRouteHandlers(getHistoryHandlers, {
      ...createAuthenticatedRequest(),
      query: { status: 'archived' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_STATUS',
      },
    })
  })

  it('rejects history limit above maximum', async () => {
    const res = await runRouteHandlers(getHistoryHandlers, {
      ...createAuthenticatedRequest(),
      query: { limit: '200' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_LIMIT',
      },
    })
  })

  it('rejects duplicate question IDs when creating a session', async () => {
    const res = await runRouteHandlers(createSessionHandlers, {
      ...createAuthenticatedRequest(),
      body: {
        questionIds: ['question-1', 'question-1'],
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'DUPLICATE_QUESTIONS',
      },
    })
  })
})

describe('interview completion route', () => {
  const completeSessionHandlers = getRouteHandlers(
    interviewRouter,
    'post',
    '/sessions/:id/complete'
  )

  it('returns 404 when session is not found', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(null)

    const res = await runRouteHandlers(completeSessionHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-404' },
    })

    expect(res.statusCode).toBe(404)
    expect(res.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
      },
    })
  })

  it('completes an active session and enqueues a feedback job', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const session = {
      _id: 'session-1',
      status: 'in_progress',
      completedAt: null,
      duration: 120,
      save,
    }

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(session as never)
    vi.spyOn(InterviewResponse, 'countDocuments').mockResolvedValue(3 as never)
    vi.spyOn(feedbackJobModel, 'findOrCreateForSession').mockResolvedValue({
      job: {
        _id: 'job-1',
        status: 'queued',
        attempts: 0,
      },
      created: true,
    } as never)

    const res = await runRouteHandlers(completeSessionHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(save).toHaveBeenCalledTimes(1)
    expect(feedbackJobModel.findOrCreateForSession).toHaveBeenCalledWith(
      'session-1',
      'user-123',
      expect.objectContaining({
        responseCount: 3,
      })
    )
    expect(res.body).toMatchObject({
      session: {
        id: 'session-1',
        status: 'completed',
      },
      feedbackJob: {
        id: 'job-1',
        status: 'queued',
        attempts: 0,
        created: true,
      },
    })
  })

  it('is idempotent for already completed sessions', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const completedAt = new Date('2026-02-12T00:00:00.000Z')
    const session = {
      _id: 'session-1',
      status: 'completed',
      completedAt,
      duration: 120,
      save,
    }

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(session as never)
    vi.spyOn(InterviewResponse, 'countDocuments').mockResolvedValue(3 as never)
    vi.spyOn(feedbackJobModel, 'findOrCreateForSession').mockResolvedValue({
      job: {
        _id: 'job-1',
        status: 'processing',
        attempts: 1,
      },
      created: false,
    } as never)

    const res = await runRouteHandlers(completeSessionHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(save).not.toHaveBeenCalled()
    expect(res.body).toMatchObject({
      session: {
        id: 'session-1',
        status: 'completed',
      },
      feedbackJob: {
        id: 'job-1',
        status: 'processing',
        attempts: 1,
        created: false,
      },
    })
  })
})

describe('feedback status routes', () => {
  const feedbackStatusHandlers = getRouteHandlers(
    interviewRouter,
    'get',
    '/sessions/:id/feedback-status'
  )
  const feedbackHandlers = getRouteHandlers(
    interviewRouter,
    'get',
    '/sessions/:id/feedback'
  )

  it('returns feedback-status payload with job and feedback counts', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'completed',
      completedAt: new Date('2026-02-12T00:00:00.000Z'),
    } as never)
    vi.spyOn(feedbackJobModel, 'findOne').mockResolvedValue({
      _id: 'job-1',
      status: 'processing',
      attempts: 1,
      maxAttempts: 3,
    })
    vi.spyOn(feedbackReportModel, 'countDocuments').mockResolvedValue(0)

    const res = await runRouteHandlers(feedbackStatusHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      session: { id: 'session-1', status: 'completed' },
      feedback: {
        ready: false,
        count: 0,
        job: { id: 'job-1', status: 'processing', attempts: 1 },
      },
    })
  })

  it('returns 202 for pending feedback jobs', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'completed',
      completedAt: new Date('2026-02-12T00:00:00.000Z'),
    } as never)
    vi.spyOn(feedbackReportModel, 'find').mockReturnValue({
      populate: vi.fn().mockResolvedValue([]),
    })
    vi.spyOn(feedbackJobModel, 'findOne').mockResolvedValue({
      _id: 'job-1',
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
    })

    const res = await runRouteHandlers(feedbackHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(202)
    expect(res.body).toMatchObject({
      status: 'pending',
      feedback: [],
      feedbackJob: {
        id: 'job-1',
        status: 'queued',
      },
    })
  })

  it('returns persisted feedback when reports exist', async () => {
    const feedbackRows = [
      {
        _id: 'report-1',
        responseId: {
          _id: 'response-1',
          questionId: { questionText: 'Tell me about a challenge.' },
        },
        scores: { overall: 88 },
        rating: 'good',
        evaluatorType: 'ai_model',
        strengths: ['Great structure'],
        suggestions: ['Add more metrics'],
        createdAt: new Date('2026-02-12T00:00:00.000Z'),
      },
    ]

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'completed',
      completedAt: new Date('2026-02-12T00:00:00.000Z'),
    } as never)
    vi.spyOn(feedbackReportModel, 'find').mockReturnValue({
      populate: vi.fn().mockResolvedValue(feedbackRows),
    })

    const res = await runRouteHandlers(feedbackHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      count: 1,
      feedback: [
        {
          id: 'report-1',
          responseId: 'response-1',
          questionText: 'Tell me about a challenge.',
          evaluatorType: 'ai_model',
        },
      ],
    })
  })
})
