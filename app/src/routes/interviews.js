import express from 'express'
import {
  InterviewQuestion,
  InterviewSession,
  InterviewResponse,
  FeedbackReport,
  FeedbackJob,
  TranscriptionJob,
} from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validate.js'
import {
  validateCreateSessionRequest,
  validateSubmitResponseRequest,
} from '../validators/api.js'
import { isFeatureEnabled } from '../config/featureFlags.js'

const router = express.Router()
const ALLOWED_QUESTION_TYPES = new Set([
  'behavioral',
  'technical',
  'situational',
  'leadership',
])
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard'])
const ALLOWED_SESSION_STATUSES = new Set([
  'in_progress',
  'completed',
  'abandoned',
])
const MAX_QUESTION_LIMIT = 20
const MAX_HISTORY_LIMIT = 50

function getQuestionText(question) {
  if (!question) return 'Question not found'
  return (
    question.questionText ||
    question.description ||
    question.title ||
    'Question not found'
  )
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function serializeFeedbackReports(feedbackReports) {
  return feedbackReports.map((f) => ({
    id: f._id,
    responseId: f.responseId?._id || null,
    questionText: getQuestionText(f.responseId?.questionId),
    scores: f.scores,
    rating: f.rating,
    evaluatorType: f.evaluatorType,
    evaluatorMetadata: f.evaluatorMetadata || null,
    strengths: f.strengths,
    suggestions: f.suggestions,
    createdAt: f.createdAt,
  }))
}

function serializeFeedbackJob(job) {
  if (!job) return null
  return {
    id: job._id,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    lastError: job.lastError
      ? {
          message: job.lastError.message,
          code: job.lastError.code,
          occurredAt: job.lastError.occurredAt,
        }
      : null,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }
}

/**
 * @route   GET /api/questions
 * @desc    Get random interview questions with optional filters
 * @access  Private
 * @query   {string} type - Question type (behavioral, technical, leadership)
 * @query   {string} difficulty - Question difficulty (easy, medium, hard)
 * @query   {number} limit - Number of questions to return (default: 5)
 */
router.get('/questions', requireAuth, async (req, res) => {
  try {
    const { type, difficulty, limit = 5 } = req.query
    const parsedLimit = parsePositiveInteger(limit, 5)

    if (parsedLimit > MAX_QUESTION_LIMIT) {
      return res.status(400).json({
        error: {
          message: `Limit must be between 1 and ${MAX_QUESTION_LIMIT}`,
          code: 'INVALID_LIMIT',
        },
      })
    }

    // Build query filter
    const filter = { isActive: true }
    if (type) {
      if (!ALLOWED_QUESTION_TYPES.has(type)) {
        return res.status(400).json({
          error: {
            message: 'Invalid question type',
            code: 'INVALID_TYPE',
          },
        })
      }
      filter.type = type
    }

    if (difficulty) {
      if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
        return res.status(400).json({
          error: {
            message: 'Invalid difficulty level',
            code: 'INVALID_DIFFICULTY',
          },
        })
      }
      filter.difficulty = difficulty
    }

    // Get random questions
    const questions = await InterviewQuestion.aggregate([
      { $match: filter },
      { $sample: { size: parsedLimit } },
    ])

    res.json({
      questions: questions.map((q) => ({
        id: q._id,
        type: q.type,
        difficulty: q.difficulty,
        category: q.category,
        title: q.title,
        description: q.description,
        questionText: getQuestionText(q),
        starGuidelines: q.starGuidelines,
      })),
      count: questions.length,
    })
  } catch (error) {
    console.error('Get questions error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to fetch questions',
        code: 'FETCH_ERROR',
      },
    })
  }
})

/**
 * @route   GET /api/questions/:id
 * @desc    Get a specific interview question
 * @access  Private
 */
router.get('/questions/:id', requireAuth, async (req, res) => {
  try {
    const question = await InterviewQuestion.findById(req.params.id)

    if (!question) {
      return res.status(404).json({
        error: {
          message: 'Question not found',
          code: 'NOT_FOUND',
        },
      })
    }

    res.json({
      question: {
        id: question._id,
        type: question.type,
        difficulty: question.difficulty,
        category: question.category,
        title: question.title,
        description: question.description,
        questionText: getQuestionText(question),
        starGuidelines: question.starGuidelines,
      },
    })
  } catch (error) {
    console.error('Get question error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to fetch question',
        code: 'FETCH_ERROR',
      },
    })
  }
})

/**
 * @route   POST /api/sessions
 * @desc    Start a new interview session
 * @access  Private
 * @body    {array} questionIds - Array of question IDs for the session
 */
router.post(
  '/sessions',
  requireAuth,
  validateRequest(validateCreateSessionRequest),
  async (req, res) => {
    try {
      const { questionIds } = req.body
      const uniqueQuestionIds = [...new Set(questionIds)]

      if (uniqueQuestionIds.length !== questionIds.length) {
        return res.status(400).json({
          error: {
            message: 'Question IDs must be unique within a session',
            code: 'DUPLICATE_QUESTIONS',
          },
        })
      }

      // Verify all questions exist
      const questions = await InterviewQuestion.find({
        _id: { $in: uniqueQuestionIds },
        isActive: true,
      })

      if (questions.length !== uniqueQuestionIds.length) {
        return res.status(400).json({
          error: {
            message: 'One or more invalid question IDs',
            code: 'INVALID_QUESTIONS',
          },
        })
      }

      // Create interview session
      const session = new InterviewSession({
        userId: req.userId,
        questions: uniqueQuestionIds,
        status: 'in_progress',
        startedAt: new Date(),
      })

      await session.save()

      res.status(201).json({
        message: 'Interview session started',
        session: {
          id: session._id,
          status: session.status,
          questionCount: session.questions.length,
          startedAt: session.startedAt,
        },
      })
    } catch (error) {
      console.error('Create session error:', error)
      res.status(500).json({
        error: {
          message: 'Failed to create session',
          code: 'SESSION_ERROR',
        },
      })
    }
  }
)

/**
 * @route   GET /api/sessions/:id
 * @desc    Get interview session details
 * @access  Private
 */
router.get('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await InterviewSession.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate('questions')

    if (!session) {
      return res.status(404).json({
        error: {
          message: 'Session not found',
          code: 'NOT_FOUND',
        },
      })
    }

    res.json({
      session: {
        id: session._id,
        status: session.status,
        questions: session.questions,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        duration: session.duration,
      },
    })
  } catch (error) {
    console.error('Get session error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to fetch session',
        code: 'FETCH_ERROR',
      },
    })
  }
})

/**
 * @route   POST /api/sessions/:id/responses
 * @desc    Submit a response for a question in the session
 * @access  Private
 * @body    {string} questionId - Question being answered
 * @body    {string} responseText - User's response
 */
router.post(
  '/sessions/:id/responses',
  requireAuth,
  validateRequest(validateSubmitResponseRequest),
  async (req, res) => {
    try {
      const {
        questionId,
        responseText = '',
        responseType = 'text',
        audioUrl = null,
        audioMimeType = null,
        audioSizeBytes = null,
        audioDurationSeconds = null,
        transcriptConfidence = null,
        transcriptProvider: clientTranscriptProvider = null,
      } = req.body
      const normalizedResponseText =
        typeof responseText === 'string' ? responseText.trim() : ''

      // Verify session exists and belongs to user
      const session = await InterviewSession.findOne({
        _id: req.params.id,
        userId: req.userId,
      })

      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Session not found',
            code: 'NOT_FOUND',
          },
        })
      }

      // Verify session is still active
      if (session.status !== 'in_progress') {
        return res.status(400).json({
          error: {
            message: 'Session is not active',
            code: 'SESSION_CLOSED',
          },
        })
      }

      // Verify question is part of session
      if (!session.questions.some((qId) => qId.toString() === questionId)) {
        return res.status(400).json({
          error: {
            message: 'Question not part of this session',
            code: 'INVALID_QUESTION',
          },
        })
      }

      if (
        responseType === 'audio_transcript' &&
        !isFeatureEnabled('aiRecording', { userId: req.userId })
      ) {
        return res.status(403).json({
          error: {
            message: 'Audio interview responses are currently disabled',
            code: 'FEATURE_DISABLED',
          },
        })
      }

      const existingResponse = await InterviewResponse.findOne({
        sessionId: req.params.id,
        userId: req.userId,
        questionId,
      })

      if (existingResponse) {
        return res.status(409).json({
          error: {
            message: 'A response for this question already exists in session',
            code: 'DUPLICATE_RESPONSE',
          },
        })
      }

      const normalizedConfidence =
        typeof transcriptConfidence === 'number'
          ? Math.max(0, Math.min(1, transcriptConfidence))
          : null
      const transcriptionStatus =
        responseType === 'audio_transcript'
          ? normalizedResponseText.length > 0
            ? normalizedConfidence !== null && normalizedConfidence < 0.75
              ? 'review_required'
              : 'ready'
            : 'uploaded'
          : 'none'

      // Create response
      const response = new InterviewResponse({
        sessionId: req.params.id,
        userId: req.userId,
        questionId,
        responseType,
        responseText: normalizedResponseText,
        audioUrl: responseType === 'audio_transcript' ? audioUrl : undefined,
        audioMimeType:
          responseType === 'audio_transcript'
            ? audioMimeType || undefined
            : undefined,
        audioSizeBytes:
          responseType === 'audio_transcript'
            ? audioSizeBytes || undefined
            : undefined,
        audioDurationSeconds:
          responseType === 'audio_transcript'
            ? audioDurationSeconds || undefined
            : undefined,
        transcriptionStatus,
        transcriptConfidence:
          responseType === 'audio_transcript'
            ? normalizedConfidence !== null
              ? normalizedConfidence
              : undefined
            : undefined,
        transcriptProvider:
          responseType === 'audio_transcript' &&
          normalizedResponseText.length > 0
            ? clientTranscriptProvider || 'manual'
            : undefined,
        transcriptEdited:
          responseType === 'audio_transcript' &&
          normalizedResponseText.length > 0,
        transcriptReviewedAt:
          responseType === 'audio_transcript' &&
          normalizedResponseText.length > 0
            ? new Date()
            : undefined,
      })

      await response.save()

      let transcriptionJobPayload = null
      if (
        responseType === 'audio_transcript' &&
        normalizedResponseText.length === 0
      ) {
        const { job, created } = await TranscriptionJob.findOrCreateForResponse(
          response._id,
          req.params.id,
          req.userId,
          {
            provider: process.env.TRANSCRIPTION_PROVIDER || 'mock',
            audioUrl: response.audioUrl,
            correlationId: req.correlationId || null,
          }
        )
        transcriptionJobPayload = {
          id: job?._id,
          status: job?.status || 'uploaded',
          attempts: job?.attempts || 0,
          created,
        }
      }

      res.status(201).json({
        message: 'Response submitted successfully',
        response: {
          id: response._id,
          questionId: response.questionId,
          responseType: response.responseType,
          audioUrl: response.audioUrl || null,
          transcriptionStatus: response.transcriptionStatus,
          transcriptConfidence: response.transcriptConfidence ?? null,
          wordCount: response.wordCount,
          submittedAt: response.createdAt,
        },
        transcriptionJob: transcriptionJobPayload,
      })
    } catch (error) {
      console.error('Submit response error:', error)
      res.status(500).json({
        error: {
          message: 'Failed to submit response',
          code: 'SUBMIT_ERROR',
        },
      })
    }
  }
)

/**
 * @route   POST /api/sessions/:id/complete
 * @desc    Mark session as complete and trigger feedback generation
 * @access  Private
 */
router.post('/sessions/:id/complete', requireAuth, async (req, res) => {
  try {
    // Verify session exists and belongs to user
    const session = await InterviewSession.findOne({
      _id: req.params.id,
      userId: req.userId,
    })

    if (!session) {
      return res.status(404).json({
        error: {
          message: 'Session not found',
          code: 'NOT_FOUND',
        },
      })
    }

    const isAlreadyCompleted = session.status === 'completed'

    // Update session status when first completed.
    if (!isAlreadyCompleted) {
      session.status = 'completed'
      session.completedAt = new Date()
      await session.save()
    }

    const responseCount = await InterviewResponse.countDocuments({
      sessionId: req.params.id,
      userId: req.userId,
    })

    const pendingTranscriptionCount = await InterviewResponse.countDocuments({
      sessionId: req.params.id,
      userId: req.userId,
      responseType: 'audio_transcript',
      transcriptionStatus: { $in: ['uploaded', 'transcribing'] },
    })

    if (pendingTranscriptionCount > 0) {
      return res.status(409).json({
        error: {
          message:
            'One or more audio responses are still being transcribed. Please review transcript status before completing feedback.',
          code: 'TRANSCRIPTION_PENDING',
        },
        pendingTranscriptions: pendingTranscriptionCount,
      })
    }

    const { job, created } = await FeedbackJob.findOrCreateForSession(
      session._id.toString(),
      req.userId.toString(),
      {
        provider: process.env.FEEDBACK_PROVIDER || 'rule_based',
        responseCount,
        correlationId: req.correlationId || null,
      }
    )

    if (!job) {
      throw new Error('Failed to create or fetch feedback job')
    }

    res.json({
      message: isAlreadyCompleted
        ? 'Session already completed; feedback job confirmed'
        : 'Session completed successfully; feedback job queued',
      session: {
        id: session._id,
        status: session.status,
        completedAt: session.completedAt,
        duration: session.duration,
      },
      feedbackJob: {
        id: job._id,
        status: job.status,
        attempts: job.attempts,
        created,
      },
    })
  } catch (error) {
    console.error('Complete session error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to complete session',
        code: 'COMPLETE_ERROR',
      },
    })
  }
})

/**
 * @route   GET /api/sessions/:id/responses
 * @desc    Get all responses for a session
 * @access  Private
 */
router.get('/sessions/:id/responses', requireAuth, async (req, res) => {
  try {
    // Verify session exists and belongs to user
    const session = await InterviewSession.findOne({
      _id: req.params.id,
      userId: req.userId,
    })

    if (!session) {
      return res.status(404).json({
        error: {
          message: 'Session not found',
          code: 'NOT_FOUND',
        },
      })
    }

    // Get all responses for the session
    const responses = await InterviewResponse.find({
      sessionId: req.params.id,
      userId: req.userId,
    }).populate('questionId')

    res.json({
      responses: responses.map((r) => ({
        id: r._id,
        question: r.questionId,
        responseText: r.responseText,
        responseType: r.responseType,
        audioUrl: r.audioUrl || null,
        audioMimeType: r.audioMimeType || null,
        audioSizeBytes: r.audioSizeBytes || null,
        audioDurationSeconds: r.audioDurationSeconds || null,
        transcriptionStatus: r.transcriptionStatus || 'none',
        transcriptConfidence: r.transcriptConfidence ?? null,
        transcriptProvider: r.transcriptProvider || null,
        transcriptEdited: Boolean(r.transcriptEdited),
        transcriptReviewedAt: r.transcriptReviewedAt || null,
        wordCount: r.wordCount,
        submittedAt: r.createdAt,
      })),
      count: responses.length,
    })
  } catch (error) {
    console.error('Get responses error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to fetch responses',
        code: 'FETCH_ERROR',
      },
    })
  }
})

/**
 * @route   GET /api/sessions/:id/responses/:responseId/transcription-status
 * @desc    Get transcription status for an audio response
 * @access  Private
 */
router.get(
  '/sessions/:id/responses/:responseId/transcription-status',
  requireAuth,
  async (req, res) => {
    try {
      if (!isFeatureEnabled('transcription', { userId: req.userId })) {
        return res.status(403).json({
          error: {
            message: 'Transcription features are currently disabled',
            code: 'FEATURE_DISABLED',
          },
        })
      }

      const { id: sessionId, responseId } = req.params
      const response = await InterviewResponse.findOne({
        _id: responseId,
        sessionId,
        userId: req.userId,
      })

      if (!response) {
        return res.status(404).json({
          error: {
            message: 'Response not found',
            code: 'NOT_FOUND',
          },
        })
      }

      if (response.responseType !== 'audio_transcript') {
        return res.status(400).json({
          error: {
            message:
              'Transcription status is only available for audio responses',
            code: 'INVALID_RESPONSE_TYPE',
          },
        })
      }

      const transcriptionJob = await TranscriptionJob.findOne({
        responseId,
        userId: req.userId,
      })

      const includeText =
        response.transcriptionStatus === 'ready' ||
        response.transcriptionStatus === 'review_required'

      return res.json({
        response: {
          id: response._id,
          responseType: response.responseType,
          responseText: includeText ? response.responseText || '' : undefined,
          transcriptionStatus: response.transcriptionStatus,
          transcriptConfidence: response.transcriptConfidence ?? null,
          transcriptProvider: response.transcriptProvider || null,
          transcriptEdited: Boolean(response.transcriptEdited),
          transcriptReviewedAt: response.transcriptReviewedAt || null,
        },
        transcriptionJob: transcriptionJob
          ? {
              id: transcriptionJob._id,
              status: transcriptionJob.status,
              attempts: transcriptionJob.attempts,
              maxAttempts: transcriptionJob.maxAttempts,
              lastError: transcriptionJob.lastError
                ? {
                    message: transcriptionJob.lastError.message,
                    code: transcriptionJob.lastError.code,
                    occurredAt: transcriptionJob.lastError.occurredAt,
                  }
                : null,
            }
          : null,
      })
    } catch (error) {
      console.error('Get transcription status error:', error)
      return res.status(500).json({
        error: {
          message: 'Failed to fetch transcription status',
          code: 'TRANSCRIPTION_STATUS_ERROR',
        },
      })
    }
  }
)

/**
 * @route   PATCH /api/sessions/:id/responses/:responseId/transcript
 * @desc    Save reviewed transcript text for an audio response
 * @access  Private
 */
router.patch(
  '/sessions/:id/responses/:responseId/transcript',
  requireAuth,
  async (req, res) => {
    try {
      if (!isFeatureEnabled('transcription', { userId: req.userId })) {
        return res.status(403).json({
          error: {
            message: 'Transcription features are currently disabled',
            code: 'FEATURE_DISABLED',
          },
        })
      }

      const { id: sessionId, responseId } = req.params
      const { responseText, transcriptConfidence } = req.body || {}

      if (
        typeof responseText !== 'string' ||
        responseText.trim().length < 20 ||
        responseText.trim().length > 5000
      ) {
        return res.status(400).json({
          error: {
            message:
              'Reviewed transcript text must be between 20 and 5000 characters',
            code: 'INVALID_TRANSCRIPT_TEXT',
          },
        })
      }

      if (
        transcriptConfidence !== undefined &&
        (!Number.isFinite(transcriptConfidence) ||
          transcriptConfidence < 0 ||
          transcriptConfidence > 1)
      ) {
        return res.status(400).json({
          error: {
            message: 'Transcript confidence must be between 0 and 1',
            code: 'INVALID_TRANSCRIPT_CONFIDENCE',
          },
        })
      }

      const response = await InterviewResponse.findOne({
        _id: responseId,
        sessionId,
        userId: req.userId,
      })

      if (!response) {
        return res.status(404).json({
          error: {
            message: 'Response not found',
            code: 'NOT_FOUND',
          },
        })
      }

      if (response.responseType !== 'audio_transcript') {
        return res.status(400).json({
          error: {
            message: 'Transcript edits are only supported for audio responses',
            code: 'INVALID_RESPONSE_TYPE',
          },
        })
      }

      const normalizedTranscript = responseText.trim()
      const normalizedConfidence =
        typeof transcriptConfidence === 'number'
          ? transcriptConfidence
          : (response.transcriptConfidence ?? 0.8)

      response.responseText = normalizedTranscript
      response.transcriptConfidence = normalizedConfidence
      response.transcriptionStatus =
        normalizedConfidence < 0.75 ? 'review_required' : 'ready'
      response.transcriptEdited = true
      response.transcriptReviewedAt = new Date()
      await response.save()

      const transcriptionJob = await TranscriptionJob.findOne({
        responseId: response._id,
        userId: req.userId,
      })

      if (transcriptionJob && transcriptionJob.status !== 'ready') {
        transcriptionJob.status = 'ready'
        transcriptionJob.transcriptText = normalizedTranscript
        transcriptionJob.confidence = normalizedConfidence
        transcriptionJob.completedAt = new Date()
        await transcriptionJob.save()
      }

      return res.json({
        message: 'Transcript updated successfully',
        response: {
          id: response._id,
          responseType: response.responseType,
          transcriptionStatus: response.transcriptionStatus,
          transcriptConfidence: response.transcriptConfidence,
          transcriptEdited: response.transcriptEdited,
          transcriptReviewedAt: response.transcriptReviewedAt,
          wordCount: response.wordCount,
        },
      })
    } catch (error) {
      console.error('Update transcript error:', error)
      return res.status(500).json({
        error: {
          message: 'Failed to update transcript',
          code: 'TRANSCRIPT_UPDATE_ERROR',
        },
      })
    }
  }
)

/**
 * @route   GET /api/history
 * @desc    Get user's interview history
 * @access  Private
 * @query   {string} status - Filter by status (in_progress, completed, abandoned)
 * @query   {number} limit - Number of sessions to return (default: 10)
 * @query   {number} page - Page number for pagination (default: 1)
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { status, limit = 10, page = 1 } = req.query
    const parsedLimit = parsePositiveInteger(limit, 10)
    const parsedPage = parsePositiveInteger(page, 1)

    if (parsedLimit > MAX_HISTORY_LIMIT) {
      return res.status(400).json({
        error: {
          message: `Limit must be between 1 and ${MAX_HISTORY_LIMIT}`,
          code: 'INVALID_LIMIT',
        },
      })
    }

    // Build query filter
    const filter = { userId: req.userId }
    if (status) {
      if (!ALLOWED_SESSION_STATUSES.has(status)) {
        return res.status(400).json({
          error: {
            message: 'Invalid status filter',
            code: 'INVALID_STATUS',
          },
        })
      }
      filter.status = status
    }

    // Calculate pagination
    const skip = (parsedPage - 1) * parsedLimit

    // Get sessions with pagination
    const sessions = await InterviewSession.find(filter)
      .populate('questions')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(parsedLimit)

    // Get total count for pagination
    const totalCount = await InterviewSession.countDocuments(filter)

    res.json({
      sessions: sessions.map((s) => ({
        id: s._id,
        status: s.status,
        questionCount: s.questions.length,
        questionTypes: s.questions.map((q) => q.type).filter(Boolean),
        previewQuestion: getQuestionText(s.questions[0]),
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        duration: s.duration,
      })),
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(totalCount / parsedLimit),
        totalSessions: totalCount,
        hasMore: skip + sessions.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to fetch history',
        code: 'FETCH_ERROR',
      },
    })
  }
})

/**
 * @route   GET /api/sessions/:id/feedback-status
 * @desc    Get async feedback generation status for a session
 * @access  Private
 */
router.get('/sessions/:id/feedback-status', requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId: req.userId,
    })

    if (!session) {
      return res.status(404).json({
        error: {
          message: 'Session not found',
          code: 'NOT_FOUND',
        },
      })
    }

    const feedbackJob = await FeedbackJob.findOne({
      sessionId,
      userId: req.userId,
    })
    const feedbackCount = await FeedbackReport.countDocuments({
      sessionId,
      userId: req.userId,
    })

    res.json({
      session: {
        id: session._id,
        status: session.status,
        completedAt: session.completedAt,
      },
      feedback: {
        ready: feedbackCount > 0,
        count: feedbackCount,
        job: serializeFeedbackJob(feedbackJob),
      },
    })
  } catch (error) {
    console.error('Get feedback status error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to fetch feedback status',
        code: 'FEEDBACK_STATUS_ERROR',
      },
    })
  }
})

/**
 * @route   GET /api/sessions/:id/feedback
 * @desc    Get AI-generated feedback for a completed session
 * @access  Private
 */
router.get('/sessions/:id/feedback', requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id

    // Verify session exists and belongs to user
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId: req.userId,
    })

    if (!session) {
      return res.status(404).json({
        error: {
          message: 'Session not found',
          code: 'NOT_FOUND',
        },
      })
    }

    // Check if session is completed
    if (session.status !== 'completed') {
      return res.status(400).json({
        error: {
          message: 'Feedback only available for completed sessions',
          code: 'SESSION_NOT_COMPLETED',
        },
      })
    }

    // Return existing feedback if available.
    const existingFeedback = await FeedbackReport.find({
      sessionId: sessionId,
      userId: req.userId,
    }).populate({
      path: 'responseId',
      populate: {
        path: 'questionId',
        select: 'questionText description title',
      },
    })

    if (existingFeedback.length > 0) {
      return res.json({
        feedback: serializeFeedbackReports(existingFeedback),
        count: existingFeedback.length,
      })
    }

    // No report yet; return async job status instead of generating feedback inline.
    const feedbackJob = await FeedbackJob.findOne({
      sessionId: sessionId,
      userId: req.userId,
    })

    if (!feedbackJob) {
      return res.status(202).json({
        message: 'Feedback generation has not started yet',
        feedback: [],
        count: 0,
        status: 'pending',
        feedbackJob: null,
      })
    }

    if (
      feedbackJob.status === 'queued' ||
      feedbackJob.status === 'processing'
    ) {
      return res.status(202).json({
        message: 'Feedback is being generated',
        feedback: [],
        count: 0,
        status: 'pending',
        feedbackJob: serializeFeedbackJob(feedbackJob),
      })
    }

    if (feedbackJob.status === 'failed') {
      return res.status(500).json({
        error: {
          message:
            feedbackJob.lastError?.message ||
            'Feedback generation failed for this session',
          code: 'FEEDBACK_JOB_FAILED',
        },
        feedbackJob: serializeFeedbackJob(feedbackJob),
      })
    }

    // Terminal completed status with no persisted reports indicates unexpected state.
    return res.status(500).json({
      error: {
        message: 'Feedback job completed but no reports were found',
        code: 'FEEDBACK_REPORTS_MISSING',
      },
      feedbackJob: serializeFeedbackJob(feedbackJob),
    })
  } catch (error) {
    console.error('Get feedback error:', error.message)
    console.error('Stack:', error.stack)
    res.status(500).json({
      error: {
        message: 'Failed to generate feedback',
        code: 'FEEDBACK_ERROR',
        details: error.message,
      },
    })
  }
})

export default router
