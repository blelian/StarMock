import mongoose from 'mongoose'

/**
 * FeedbackJob Model
 *
 * Tracks async feedback generation jobs for interview sessions.
 * Supports job states: queued -> processing -> completed/failed
 */

const JOB_STATUSES = ['queued', 'processing', 'completed', 'failed']
const MAX_ATTEMPTS = 3

const feedbackJobSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: 'queued',
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: MAX_ATTEMPTS,
    },
    lastError: {
      message: { type: String },
      code: { type: String },
      stack: { type: String },
      occurredAt: { type: Date },
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
    },
    metadata: {
      provider: { type: String },
      responseCount: { type: Number },
      correlationId: { type: String },
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for fast status + age queries (worker polling)
feedbackJobSchema.index({ status: 1, createdAt: 1 })

// Ensure one job per session (via idempotency key derived from sessionId)
feedbackJobSchema.index({ sessionId: 1 }, { unique: true })

/**
 * Generate idempotency key for a session
 * @param {string} sessionId - The session ID
 * @returns {string} Idempotency key
 */
feedbackJobSchema.statics.generateIdempotencyKey = function (sessionId) {
  return `feedback-job-${sessionId}`
}

/**
 * Find or create a job for a session (idempotent)
 * @param {string} sessionId - The session ID
 * @param {string} userId - The user ID
 * @param {object} metadata - Optional metadata
 * @returns {Promise<{job: FeedbackJob, created: boolean}>}
 */
feedbackJobSchema.statics.findOrCreateForSession = async function (
  sessionId,
  userId,
  metadata = {}
) {
  const idempotencyKey = this.generateIdempotencyKey(sessionId)

  try {
    // Try to create a new job
    const job = await this.create({
      sessionId,
      userId,
      idempotencyKey,
      metadata,
    })
    return { job, created: true }
  } catch (error) {
    // If duplicate key error, return existing job
    if (error.code === 11000) {
      const existingJob = await this.findOne({ sessionId })
      return { job: existingJob, created: false }
    }
    throw error
  }
}

/**
 * Transition job to processing state
 * @returns {Promise<boolean>} True if transition succeeded
 */
feedbackJobSchema.methods.markProcessing = async function () {
  if (this.status !== 'queued') {
    return false
  }

  this.status = 'processing'
  this.startedAt = new Date()
  this.attempts += 1
  await this.save()
  return true
}

/**
 * Transition job to completed state
 * @returns {Promise<void>}
 */
feedbackJobSchema.methods.markCompleted = async function () {
  this.status = 'completed'
  this.completedAt = new Date()
  await this.save()
}

/**
 * Transition job to failed state or requeue for retry
 * @param {Error} error - The error that caused failure
 * @returns {Promise<{retrying: boolean}>}
 */
feedbackJobSchema.methods.markFailed = async function (error) {
  this.lastError = {
    message: error.message || 'Unknown error',
    code: error.code || 'UNKNOWN',
    stack: error.stack,
    occurredAt: new Date(),
  }

  if (this.attempts < this.maxAttempts) {
    // Requeue for retry
    this.status = 'queued'
    await this.save()
    return { retrying: true }
  }

  // Final failure
  this.status = 'failed'
  this.completedAt = new Date()
  await this.save()
  return { retrying: false }
}

/**
 * Check if job can be retried
 * @returns {boolean}
 */
feedbackJobSchema.methods.canRetry = function () {
  return this.attempts < this.maxAttempts && this.status !== 'completed'
}

/**
 * Get next batch of jobs ready for processing
 * @param {number} limit - Max jobs to fetch
 * @returns {Promise<FeedbackJob[]>}
 */
feedbackJobSchema.statics.getQueuedJobs = function (limit = 10) {
  return this.find({ status: 'queued' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .exec()
}

/**
 * Get stale processing jobs (for recovery)
 * @param {number} staleMinutes - Minutes after which processing job is considered stale
 * @returns {Promise<FeedbackJob[]>}
 */
feedbackJobSchema.statics.getStaleProcessingJobs = function (
  staleMinutes = 10
) {
  const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000)
  return this.find({
    status: 'processing',
    startedAt: { $lt: staleThreshold },
  }).exec()
}

// Virtual for duration calculation
feedbackJobSchema.virtual('duration').get(function () {
  if (!this.startedAt) return null
  const endTime = this.completedAt || new Date()
  return endTime - this.startedAt
})

// Ensure virtuals are included in JSON
feedbackJobSchema.set('toJSON', { virtuals: true })
feedbackJobSchema.set('toObject', { virtuals: true })

const FeedbackJob = mongoose.model('FeedbackJob', feedbackJobSchema)

export default FeedbackJob
export { JOB_STATUSES, MAX_ATTEMPTS }
