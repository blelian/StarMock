// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FeedbackReport,
  FeedbackJob,
  InterviewQuestion,
  InterviewResponse,
  InterviewSession,
  TranscriptionJob,
} from '../models/index.js'
import * as openAIQuestionProvider from '../services/air/openAIQuestionProvider.js'
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
    populate: (
      ...populateArgs: unknown[]
    ) => Promise<Array<Record<string, unknown>>>
  }
  countDocuments: (...args: unknown[]) => Promise<number>
}

type RouterLike = {
  stack: Array<Record<string, unknown>>
}

const interviewRouter = interviewRoutes as unknown as RouterLike
const feedbackJobModel = FeedbackJob as unknown as FeedbackJobModelLike
const feedbackReportModel = FeedbackReport as unknown as FeedbackReportModelLike
const transcriptionJobModel = TranscriptionJob as unknown as {
  findOrCreateForResponse: (...args: unknown[]) => Promise<{
    job: { _id: string; status: string; attempts: number }
    created: boolean
  }>
  findOne: (...args: unknown[]) => Promise<{
    _id: string
    status: string
    attempts: number
    maxAttempts?: number
    lastError?: { message?: string; code?: string; occurredAt?: Date } | null
    save?: () => Promise<void>
  } | null>
}

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
  delete process.env.FEATURE_AIR_QUESTION_GENERATION_ENABLED
  delete process.env.FEATURE_AIR_QUESTION_GENERATION_ROLLOUT_PERCENT
})

describe('interview route validation guards', () => {
  const getQuestionsHandlers = getRouteHandlers(
    interviewRouter,
    'get',
    '/questions'
  )
  const getHistoryHandlers = getRouteHandlers(
    interviewRouter,
    'get',
    '/history'
  )
  const createSessionHandlers = getRouteHandlers(
    interviewRouter,
    'post',
    '/sessions'
  )

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

  it('rejects AIR question requests with unsupported industry', async () => {
    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: {
        airMode: 'true',
        targetJobTitle: 'Software Engineer',
        industry: 'space',
        seniority: 'mid',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_INDUSTRY',
      },
    })
  })

  it('returns AIR metadata when AIR question request is valid', async () => {
    vi.spyOn(InterviewQuestion, 'aggregate').mockResolvedValue([
      {
        _id: 'question-1',
        type: 'behavioral',
        difficulty: 'medium',
        category: 'leadership',
        title: 'Incident Leadership',
        description: 'Describe leading incident resolution.',
      },
    ] as never)

    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: {
        airMode: 'true',
        targetJobTitle: 'Backend Engineer',
        industry: 'technology',
        seniority: 'mid',
        limit: '1',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      mode: 'air',
      airContext: {
        industry: 'technology',
        seniority: 'mid',
      },
      sourceBreakdown: {
        roleMatched: 1,
      },
      count: 1,
    })
  })

  it('uses OpenAI AIR generation when curated role coverage is insufficient', async () => {
    process.env.FEATURE_AIR_QUESTION_GENERATION_ENABLED = 'true'
    process.env.FEATURE_AIR_QUESTION_GENERATION_ROLLOUT_PERCENT = '100'

    vi.spyOn(InterviewQuestion, 'aggregate')
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never)
    const generateAirQuestionsSpy = vi
      .spyOn(openAIQuestionProvider, 'generateAirQuestions')
      .mockResolvedValue({
        questions: [
          {
            title: 'Scaling APIs under pressure',
            description:
              'Tell me about a time you improved backend reliability during a high-traffic incident.',
            type: 'technical',
            difficulty: 'medium',
            category: 'problem-solving',
            tags: ['ai-generated', 'air'],
            starGuidelines: {
              situation: 'Set context',
              task: 'Define ownership',
              action: 'Describe actions',
              result: 'Quantify outcome',
            },
            airProfile: {
              contextVersion: 'air-context.v1',
              industries: ['technology'],
              roles: ['backend_developer'],
              seniority: ['mid'],
              competencies: ['api-design', 'reliability'],
            },
          },
        ],
        metadata: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          promptVersion: 'air-questions.v1',
          attempts: 1,
          retries: 1,
          latencyMs: 120,
          tokenUsage: {
            promptTokens: 100,
            completionTokens: 60,
            totalTokens: 160,
          },
        },
      } as never)
    const insertManySpy = vi
      .spyOn(InterviewQuestion, 'insertMany')
      .mockResolvedValue([
        {
          _id: 'generated-1',
          type: 'technical',
          difficulty: 'medium',
          category: 'problem-solving',
          title: 'Scaling APIs under pressure',
          description:
            'Tell me about a time you improved backend reliability during a high-traffic incident.',
          starGuidelines: {
            situation: 'Set context',
            task: 'Define ownership',
            action: 'Describe actions',
            result: 'Quantify outcome',
          },
        },
      ] as never)

    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: {
        airMode: 'true',
        targetJobTitle: 'Backend Engineer',
        industry: 'technology',
        seniority: 'mid',
        limit: '1',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(generateAirQuestionsSpy).toHaveBeenCalledTimes(1)
    expect(insertManySpy).toHaveBeenCalledTimes(1)
    expect(res.body).toMatchObject({
      mode: 'air',
      count: 1,
      sourceBreakdown: {
        roleMatched: 0,
        aiGenerated: 1,
        fallback: 0,
      },
      aiGeneration: {
        enabled: true,
        attempted: true,
        generated: 1,
        provider: 'openai',
        model: 'gpt-4o-mini',
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

  it('rejects create-session payload when airMode is invalid', async () => {
    const res = await runRouteHandlers(createSessionHandlers, {
      ...createAuthenticatedRequest(),
      body: {
        questionIds: ['question-1'],
        airMode: 'true',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_AIR_MODE',
      },
    })
  })

  it('blocks starting a new session when another is already in progress', async () => {
    const questionFindSpy = vi
      .spyOn(InterviewQuestion, 'find')
      .mockResolvedValue([] as never)
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-active',
      status: 'in_progress',
      startedAt: new Date('2026-02-16T00:00:00.000Z'),
      metadata: { airMode: true },
    } as never)

    const res = await runRouteHandlers(createSessionHandlers, {
      ...createAuthenticatedRequest(),
      body: {
        questionIds: ['question-1'],
      },
    })

    expect(res.statusCode).toBe(409)
    expect(res.body).toMatchObject({
      error: {
        code: 'ACTIVE_SESSION_EXISTS',
      },
      session: {
        id: 'session-active',
        status: 'in_progress',
        airMode: true,
      },
    })
    expect(questionFindSpy).not.toHaveBeenCalled()
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
      questions: ['question-1', 'question-2', 'question-3'],
      completedAt: null,
      duration: 120,
      save,
    }

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(session as never)
    vi.spyOn(InterviewResponse, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { questionId: 'question-1', responseType: 'text' },
        { questionId: 'question-2', responseType: 'text' },
        { questionId: 'question-3', responseType: 'text' },
      ]),
    } as never)
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
      questions: ['question-1', 'question-2', 'question-3'],
      completedAt,
      duration: 120,
      save,
    }

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(session as never)
    vi.spyOn(InterviewResponse, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { questionId: 'question-1', responseType: 'text' },
        { questionId: 'question-2', responseType: 'text' },
        { questionId: 'question-3', responseType: 'text' },
      ]),
    } as never)
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

  it('returns conflict when audio transcriptions are still pending', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const session = {
      _id: 'session-1',
      status: 'in_progress',
      questions: ['question-1', 'question-2', 'question-3'],
      completedAt: null,
      duration: 120,
      save,
    }

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(session as never)
    const enqueueSpy = vi
      .spyOn(feedbackJobModel, 'findOrCreateForSession')
      .mockResolvedValue({
        job: {
          _id: 'job-1',
          status: 'queued',
          attempts: 0,
        },
        created: true,
      } as never)
    vi.spyOn(InterviewResponse, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { questionId: 'question-1', responseType: 'text' },
        {
          questionId: 'question-2',
          responseType: 'audio_transcript',
          transcriptionStatus: 'uploaded',
        },
      ]),
    } as never)

    const res = await runRouteHandlers(completeSessionHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(409)
    expect(res.body).toMatchObject({
      error: {
        code: 'TRANSCRIPTION_PENDING',
      },
      pendingTranscriptions: 1,
    })
    expect(enqueueSpy).not.toHaveBeenCalled()
  })

  it('returns bad request when not all questions are answered', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const session = {
      _id: 'session-1',
      status: 'in_progress',
      questions: ['question-1', 'question-2', 'question-3'],
      completedAt: null,
      duration: 120,
      save,
    }

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(session as never)
    const enqueueSpy = vi
      .spyOn(feedbackJobModel, 'findOrCreateForSession')
      .mockResolvedValue({
        job: {
          _id: 'job-1',
          status: 'queued',
          attempts: 0,
        },
        created: true,
      } as never)
    vi.spyOn(InterviewResponse, 'find').mockReturnValue({
      select: vi
        .fn()
        .mockResolvedValue([
          { questionId: 'question-1', responseType: 'text' },
        ]),
    } as never)

    const res = await runRouteHandlers(completeSessionHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'SESSION_INCOMPLETE',
      },
      progress: {
        totalQuestions: 3,
        answeredQuestions: 1,
        remainingQuestions: 2,
      },
    })
    expect(enqueueSpy).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })
})

describe('session abandonment route', () => {
  const abandonSessionHandlers = getRouteHandlers(
    interviewRouter,
    'patch',
    '/sessions/:id/abandon'
  )

  it('returns 404 when abandoning a missing session', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(null)

    const res = await runRouteHandlers(abandonSessionHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-missing' },
    })

    expect(res.statusCode).toBe(404)
    expect(res.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
      },
    })
  })

  it('abandons an in-progress session', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'in_progress',
      completedAt: null,
      duration: null,
      save,
    } as never)

    const res = await runRouteHandlers(abandonSessionHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(save).toHaveBeenCalledTimes(1)
    expect(res.body).toMatchObject({
      session: {
        id: 'session-1',
        status: 'abandoned',
      },
    })
  })

  it('rejects abandoning a completed session', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'completed',
    } as never)

    const res = await runRouteHandlers(abandonSessionHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'SESSION_COMPLETED',
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

  it('rolls up repeated attempts using best attempt per question', async () => {
    const feedbackRows = [
      {
        _id: 'report-1',
        responseId: {
          _id: 'response-1',
          attemptNumber: 1,
          questionId: { _id: 'question-1', questionText: 'Question one?' },
        },
        scores: {
          situation: 55,
          task: 58,
          action: 62,
          result: 65,
          overall: 60,
        },
        rating: 'fair',
        evaluatorType: 'ai_model',
        analysis: {},
        createdAt: new Date('2026-02-10T00:00:00.000Z'),
      },
      {
        _id: 'report-2',
        responseId: {
          _id: 'response-2',
          attemptNumber: 2,
          questionId: { _id: 'question-1', questionText: 'Question one?' },
        },
        scores: {
          situation: 75,
          task: 78,
          action: 82,
          result: 85,
          overall: 80,
        },
        rating: 'good',
        evaluatorType: 'ai_model',
        analysis: {},
        createdAt: new Date('2026-02-11T00:00:00.000Z'),
      },
      {
        _id: 'report-3',
        responseId: {
          _id: 'response-3',
          attemptNumber: 1,
          questionId: { _id: 'question-2', questionText: 'Question two?' },
        },
        scores: {
          situation: 68,
          task: 70,
          action: 72,
          result: 74,
          overall: 70,
        },
        rating: 'good',
        evaluatorType: 'ai_model',
        analysis: {},
        createdAt: new Date('2026-02-11T01:00:00.000Z'),
      },
    ]

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'completed',
      questions: ['question-1', 'question-2'],
      metadata: { airMode: false },
      completedAt: new Date('2026-02-11T02:00:00.000Z'),
    } as never)
    vi.spyOn(feedbackReportModel, 'find').mockReturnValue({
      populate: vi.fn().mockResolvedValue(feedbackRows),
    } as never)

    const res = await runRouteHandlers(feedbackHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      summary: {
        starScores: {
          overall: 75,
        },
        sessionMetrics: {
          questionCount: 2,
          totalAttempts: 3,
          extraAttempts: 1,
          retriedQuestionCount: 1,
          averageImprovement: 20,
        },
        questionMetrics: [
          {
            questionId: 'question-1',
            questionText: 'Question one?',
            attemptCount: 2,
            bestAttempt: {
              attemptNumber: 2,
              overallScore: 80,
              roleFitScore: 80,
            },
            firstAttempt: {
              attemptNumber: 1,
              overallScore: 60,
              roleFitScore: 60,
            },
            latestAttempt: {
              attemptNumber: 2,
              overallScore: 80,
              roleFitScore: 80,
            },
            improvement: {
              overallDelta: 20,
              roleFitDelta: 20,
            },
          },
          {
            questionId: 'question-2',
            questionText: 'Question two?',
            attemptCount: 1,
            bestAttempt: {
              attemptNumber: 1,
              overallScore: 70,
              roleFitScore: 70,
            },
            firstAttempt: {
              attemptNumber: 1,
              overallScore: 70,
              roleFitScore: 70,
            },
            latestAttempt: {
              attemptNumber: 1,
              overallScore: 70,
              roleFitScore: 70,
            },
            improvement: {
              overallDelta: 0,
              roleFitDelta: 0,
            },
          },
        ],
      },
    })
  })

  it('returns AIR summary metrics when competency scores are present', async () => {
    const feedbackRows = [
      {
        _id: 'report-1',
        responseId: {
          _id: 'response-1',
          questionId: { questionText: 'How did you improve API reliability?' },
        },
        scores: {
          situation: 70,
          task: 72,
          action: 84,
          result: 86,
          overall: 80,
        },
        rating: 'good',
        evaluatorType: 'ai_model',
        analysis: {
          roleFitScore: 82,
          competencyScores: {
            'api-design': 78,
            reliability: 86,
          },
        },
        strengths: ['Clear ownership'],
        suggestions: ['Add one more metric'],
        createdAt: new Date('2026-02-13T00:00:00.000Z'),
      },
    ]

    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'completed',
      metadata: {
        airMode: true,
        airContext: {
          version: 'air-context.v1',
          targetJobTitle: 'Backend Engineer',
          industry: 'technology',
          seniority: 'mid',
          competencies: ['api-design', 'reliability'],
        },
      },
      completedAt: new Date('2026-02-13T00:00:00.000Z'),
    } as never)
    vi.spyOn(feedbackReportModel, 'find').mockReturnValue({
      populate: vi.fn().mockResolvedValue(feedbackRows),
    } as never)

    const res = await runRouteHandlers(feedbackHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      count: 1,
      summary: {
        airMode: true,
        roleMetrics: {
          roleFitScore: 82,
          competencyCoverage: 100,
          strongestCompetency: {
            key: 'reliability',
            score: 86,
          },
          weakestCompetency: {
            key: 'api-design',
            score: 78,
          },
        },
      },
    })
  })
})

describe('audio response and transcription routes', () => {
  const submitResponseHandlers = getRouteHandlers(
    interviewRouter,
    'post',
    '/sessions/:id/responses'
  )
  const transcriptionStatusHandlers = getRouteHandlers(
    interviewRouter,
    'get',
    '/sessions/:id/responses/:responseId/transcription-status'
  )
  const updateTranscriptHandlers = getRouteHandlers(
    interviewRouter,
    'patch',
    '/sessions/:id/responses/:responseId/transcript'
  )

  it('submits audio response and creates transcription job when transcript is pending', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'in_progress',
      questions: ['question-1'],
    } as never)
    vi.spyOn(InterviewResponse, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    } as never)
    vi.spyOn(InterviewResponse, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([
        {
          questionId: 'question-1',
          responseType: 'audio_transcript',
          transcriptionStatus: 'uploaded',
        },
      ]),
    } as never)
    vi.spyOn(InterviewResponse.prototype, 'save').mockResolvedValue(
      undefined as never
    )
    vi.spyOn(
      transcriptionJobModel,
      'findOrCreateForResponse'
    ).mockResolvedValue({
      job: {
        _id: 'transcription-job-1',
        status: 'uploaded',
        attempts: 0,
      },
      created: true,
    } as never)

    const res = await runRouteHandlers(submitResponseHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
      body: {
        questionId: 'question-1',
        responseType: 'audio_transcript',
        responseText: '',
        audioUrl: 'local-upload://audio-1.webm',
        audioMimeType: 'audio/webm',
        audioDurationSeconds: 12.4,
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.body).toMatchObject({
      response: {
        attemptNumber: 1,
        responseType: 'audio_transcript',
        transcriptionStatus: 'uploaded',
      },
      progress: {
        totalQuestions: 1,
        answeredQuestions: 1,
        remainingQuestions: 0,
      },
      transcriptionJob: {
        id: 'transcription-job-1',
        status: 'uploaded',
        created: true,
      },
    })
  })

  it('accepts repeat attempts when allowRepeat is true', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      status: 'in_progress',
      questions: ['507f1f77bcf86cd799439011'], // Valid ObjectId format
    } as never)
    vi.spyOn(InterviewResponse, 'findOne').mockReturnValue({
      sort: vi.fn().mockResolvedValue({
        _id: 'response-1',
        attemptNumber: 1,
      }),
    } as never)
    vi.spyOn(InterviewResponse, 'find').mockReturnValue({
      select: vi.fn().mockResolvedValue([
        {
          questionId: '507f1f77bcf86cd799439011',
          responseType: 'text',
          transcriptionStatus: 'none',
        },
        {
          questionId: '507f1f77bcf86cd799439011',
          responseType: 'text',
          transcriptionStatus: 'none',
        },
      ]),
    } as never)

    // Mock save to set _id and createdAt, then return the instance
    /* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/require-await */
    vi.spyOn(InterviewResponse.prototype, 'save').mockImplementation(
      async function (this: any) {
        if (!this._id) this._id = 'response-2'
        if (!this.createdAt) this.createdAt = new Date()
        return this
      }
    )
    /* eslint-enable @typescript-eslint/no-misused-promises, @typescript-eslint/require-await */

    const res = await runRouteHandlers(submitResponseHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1' },
      body: {
        questionId: '507f1f77bcf86cd799439011', // Valid ObjectId format
        responseType: 'text',
        allowRepeat: true,
        responseText:
          'Situation: we had recurring production incidents. Task: I needed to improve stability quickly. Action: I created a runbook, added alerts, and coached the team through postmortems. Result: incident volume dropped and MTTR improved by 38%.',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.body).toMatchObject({
      response: {
        questionId: '507f1f77bcf86cd799439011',
        attemptNumber: 2,
        isRepeatAttempt: true,
        responseType: 'text',
      },
      questionProgress: {
        questionId: '507f1f77bcf86cd799439011',
        attempts: 2,
        answered: true,
        repeated: true,
      },
    })
  })

  it('returns transcription status for audio response', async () => {
    vi.spyOn(InterviewResponse, 'findOne').mockResolvedValue({
      _id: 'response-1',
      responseType: 'audio_transcript',
      transcriptionStatus: 'transcribing',
      transcriptConfidence: null,
      transcriptProvider: null,
      transcriptEdited: false,
      transcriptReviewedAt: null,
    } as never)
    vi.spyOn(transcriptionJobModel, 'findOne').mockResolvedValue({
      _id: 'transcription-job-1',
      status: 'transcribing',
      attempts: 1,
      maxAttempts: 3,
      lastError: null,
    })

    const res = await runRouteHandlers(transcriptionStatusHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1', responseId: 'response-1' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      response: {
        id: 'response-1',
        transcriptionStatus: 'transcribing',
      },
      transcriptionJob: {
        id: 'transcription-job-1',
        status: 'transcribing',
      },
    })
  })

  it('updates reviewed transcript text', async () => {
    const saveResponse = vi.fn().mockResolvedValue(undefined)
    const saveJob = vi.fn().mockResolvedValue(undefined)

    vi.spyOn(InterviewResponse, 'findOne').mockResolvedValue({
      _id: 'response-1',
      responseType: 'audio_transcript',
      transcriptConfidence: 0.6,
      save: saveResponse,
    } as never)
    vi.spyOn(transcriptionJobModel, 'findOne').mockResolvedValue({
      _id: 'transcription-job-1',
      status: 'transcribing',
      attempts: 1,
      save: saveJob,
    })

    const res = await runRouteHandlers(updateTranscriptHandlers, {
      ...createAuthenticatedRequest(),
      params: { id: 'session-1', responseId: 'response-1' },
      body: {
        responseText:
          'This is the reviewed transcript with enough detail to pass validation.',
        transcriptConfidence: 0.82,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(saveResponse).toHaveBeenCalledTimes(1)
    expect(saveJob).toHaveBeenCalledTimes(1)
    expect(res.body).toMatchObject({
      response: {
        id: 'response-1',
        transcriptEdited: true,
      },
    })
  })
})
