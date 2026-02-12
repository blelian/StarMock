import express from 'express'
import {
  InterviewQuestion,
  InterviewSession,
  InterviewResponse,
  FeedbackReport,
} from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validate.js'
import { evaluateResponseWithProvider } from '../services/feedback/index.js'
import {
  validateCreateSessionRequest,
  validateSubmitResponseRequest,
} from '../validators/api.js'

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
      const { questionId, responseText } = req.body

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

      // Create response
      const response = new InterviewResponse({
        sessionId: req.params.id,
        userId: req.userId,
        questionId,
        responseText: responseText.trim(),
      })

      await response.save()

      res.status(201).json({
        message: 'Response submitted successfully',
        response: {
          id: response._id,
          questionId: response.questionId,
          wordCount: response.wordCount,
          submittedAt: response.createdAt,
        },
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

    // Check if already completed
    if (session.status === 'completed') {
      return res.status(400).json({
        error: {
          message: 'Session already completed',
          code: 'ALREADY_COMPLETED',
        },
      })
    }

    // Update session status
    session.status = 'completed'
    session.completedAt = new Date()
    await session.save()

    res.json({
      message: 'Session completed successfully',
      session: {
        id: session._id,
        status: session.status,
        completedAt: session.completedAt,
        duration: session.duration,
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

    // Check if feedback already exists
    let existingFeedback = await FeedbackReport.find({
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
      // Return existing feedback
      return res.json({
        feedback: existingFeedback.map((f) => ({
          id: f._id,
          responseId: f.responseId?._id || null,
          questionText: getQuestionText(f.responseId?.questionId),
          scores: f.scores,
          rating: f.rating,
          evaluatorType: f.evaluatorType,
          strengths: f.strengths,
          suggestions: f.suggestions,
          createdAt: f.createdAt,
        })),
        count: existingFeedback.length,
      })
    }

    // Get all responses for the session
    const responses = await InterviewResponse.find({
      sessionId: sessionId,
      userId: req.userId,
    }).populate('questionId')

    if (responses.length === 0) {
      return res.status(400).json({
        error: {
          message: 'No responses found for this session',
          code: 'NO_RESPONSES',
        },
      })
    }

    // Generate feedback for each response
    const feedbackReports = []

    for (const response of responses) {
      try {
        // Evaluate the response through the provider abstraction.
        const { evaluation, evaluatorType } = await evaluateResponseWithProvider(
          response.responseText,
          response.questionId
        )

        // Create and save feedback report
        const feedback = new FeedbackReport({
          sessionId: sessionId,
          userId: req.userId,
          responseId: response._id,
          scores: evaluation.scores,
          rating: evaluation.rating,
          strengths: evaluation.strengths,
          suggestions: evaluation.suggestions,
          analysis: evaluation.analysis,
          evaluatorType,
        })

        await feedback.save()

        feedbackReports.push({
          id: feedback._id,
          responseId: response._id,
          questionText: getQuestionText(response.questionId),
          scores: feedback.scores,
          rating: feedback.rating,
          evaluatorType: feedback.evaluatorType,
          strengths: feedback.strengths,
          suggestions: feedback.suggestions,
          analysis: feedback.analysis,
          createdAt: feedback.createdAt,
        })
      } catch (responseError) {
        console.error(
          `Error generating feedback for response ${response._id}:`,
          responseError.message
        )
        throw responseError
      }
    }

    res.json({
      message: 'Feedback generated successfully',
      feedback: feedbackReports,
      count: feedbackReports.length,
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
