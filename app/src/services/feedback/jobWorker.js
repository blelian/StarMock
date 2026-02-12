import {
  FeedbackJob,
  FeedbackReport,
  InterviewResponse,
} from '../../models/index.js'
import { evaluateResponseWithProvider } from './index.js'

function getQuestionText(question) {
  if (!question) return 'Question not found'
  return (
    question.questionText ||
    question.description ||
    question.title ||
    'Question not found'
  )
}

const DEFAULT_POLL_INTERVAL_MS = 5000
const DEFAULT_BATCH_SIZE = 2
const DEFAULT_STALE_MINUTES = 10

let pollTimer = null
let cycleInProgress = false

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

async function generateFeedbackReportsForJob(job) {
  const responses = await InterviewResponse.find({
    sessionId: job.sessionId,
    userId: job.userId,
  }).populate('questionId')

  if (responses.length === 0) {
    throw new Error('No responses found for this session')
  }

  let generatedCount = 0
  for (const response of responses) {
    const existing = await FeedbackReport.findOne({
      responseId: response._id,
      userId: job.userId,
    })

    if (existing) {
      continue
    }

    const { evaluation, evaluatorType } = await evaluateResponseWithProvider(
      response.responseText,
      response.questionId
    )

    const feedback = new FeedbackReport({
      sessionId: job.sessionId,
      userId: job.userId,
      responseId: response._id,
      scores: evaluation.scores,
      rating: evaluation.rating,
      strengths: evaluation.strengths,
      suggestions: evaluation.suggestions,
      analysis: {
        ...(evaluation.analysis || {}),
        questionText: getQuestionText(response.questionId),
      },
      evaluatorType,
    })

    await feedback.save()
    generatedCount += 1
  }

  job.metadata = {
    ...(job.metadata || {}),
    responseCount: responses.length,
    generatedCount,
  }
}

export async function processFeedbackJob(job) {
  if (!job) {
    return { processed: false, reason: 'missing_job' }
  }

  const transitioned = await job.markProcessing()
  if (!transitioned) {
    return { processed: false, reason: 'not_queued', status: job.status }
  }

  try {
    await generateFeedbackReportsForJob(job)
    await job.markCompleted()
    return { processed: true, status: 'completed', jobId: job._id }
  } catch (error) {
    const failure = await job.markFailed(error)
    return {
      processed: true,
      status: failure.retrying ? 'queued' : 'failed',
      retrying: failure.retrying,
      error: error.message,
      jobId: job._id,
    }
  }
}

export async function processFeedbackJobById(jobId) {
  const job = await FeedbackJob.findById(jobId)
  if (!job) {
    return { processed: false, reason: 'not_found' }
  }
  return processFeedbackJob(job)
}

export async function recoverStaleProcessingJobs(staleMinutes = DEFAULT_STALE_MINUTES) {
  const staleJobs = await FeedbackJob.getStaleProcessingJobs(staleMinutes)

  for (const staleJob of staleJobs) {
    await staleJob.markFailed(new Error('Feedback job processing timed out'))
  }

  return staleJobs.length
}

export async function processNextFeedbackJobs(batchSize = DEFAULT_BATCH_SIZE) {
  const jobs = await FeedbackJob.getQueuedJobs(batchSize)
  const results = []

  for (const job of jobs) {
    results.push(await processFeedbackJob(job))
  }

  return results
}

export async function runFeedbackJobCycle() {
  if (cycleInProgress) {
    return {
      skipped: true,
      reason: 'cycle_in_progress',
    }
  }

  cycleInProgress = true
  try {
    const staleMinutes = toPositiveInteger(
      process.env.FEEDBACK_JOB_STALE_MINUTES,
      DEFAULT_STALE_MINUTES
    )
    const batchSize = toPositiveInteger(
      process.env.FEEDBACK_JOB_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    )

    const staleRecovered = await recoverStaleProcessingJobs(staleMinutes)
    const processedJobs = await processNextFeedbackJobs(batchSize)

    return {
      staleRecovered,
      processedJobs,
      skipped: false,
    }
  } finally {
    cycleInProgress = false
  }
}

export function startFeedbackJobWorker() {
  if (process.env.FEEDBACK_JOB_WORKER_ENABLED === 'false') {
    console.log('[feedback-worker] Disabled via FEEDBACK_JOB_WORKER_ENABLED=false')
    return null
  }

  if (pollTimer) {
    return pollTimer
  }

  const pollIntervalMs = toPositiveInteger(
    process.env.FEEDBACK_JOB_POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS
  )

  console.log(`[feedback-worker] Starting poller (${pollIntervalMs}ms interval)`)
  pollTimer = setInterval(() => {
    runFeedbackJobCycle().catch((error) => {
      console.error('[feedback-worker] Cycle error:', error)
    })
  }, pollIntervalMs)

  // Kick off an initial cycle at startup.
  runFeedbackJobCycle().catch((error) => {
    console.error('[feedback-worker] Initial cycle error:', error)
  })

  return pollTimer
}

export function stopFeedbackJobWorker() {
  if (!pollTimer) {
    return
  }

  clearInterval(pollTimer)
  pollTimer = null
  console.log('[feedback-worker] Stopped')
}

export default {
  startFeedbackJobWorker,
  stopFeedbackJobWorker,
  runFeedbackJobCycle,
  processFeedbackJob,
  processFeedbackJobById,
  processNextFeedbackJobs,
  recoverStaleProcessingJobs,
}
