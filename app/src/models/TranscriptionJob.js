import mongoose from 'mongoose'

const JOB_STATUSES = ['uploaded', 'transcribing', 'ready', 'failed']
const DEFAULT_MAX_ATTEMPTS = 3

const transcriptionJobSchema = new mongoose.Schema(
  {
    responseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewResponse',
      required: true,
      unique: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: true,
      index: true,
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
      default: 'uploaded',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: DEFAULT_MAX_ATTEMPTS,
      min: 1,
    },
    transcriptText: {
      type: String,
      default: '',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    metadata: {
      provider: { type: String },
      audioUrl: { type: String },
      correlationId: { type: String },
    },
    lastError: {
      message: { type: String },
      code: { type: String },
      stack: { type: String },
      occurredAt: { type: Date },
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
)

transcriptionJobSchema.index({ status: 1, createdAt: 1 })

transcriptionJobSchema.statics.findOrCreateForResponse = async function (
  responseId,
  sessionId,
  userId,
  metadata = {}
) {
  try {
    const job = await this.create({
      responseId,
      sessionId,
      userId,
      metadata,
    })
    return { job, created: true }
  } catch (error) {
    if (error.code === 11000) {
      const existing = await this.findOne({ responseId })
      return { job: existing, created: false }
    }
    throw error
  }
}

transcriptionJobSchema.statics.getQueuedJobs = function (limit = 10) {
  return this.find({ status: 'uploaded' })
    .sort({ createdAt: 1 })
    .limit(limit)
    .exec()
}

transcriptionJobSchema.statics.getStaleTranscribingJobs = function (
  staleMinutes = 10
) {
  const threshold = new Date(Date.now() - staleMinutes * 60 * 1000)
  return this.find({
    status: 'transcribing',
    startedAt: { $lt: threshold },
  }).exec()
}

transcriptionJobSchema.methods.markTranscribing = async function () {
  if (this.status !== 'uploaded') {
    return false
  }

  this.status = 'transcribing'
  this.startedAt = new Date()
  this.attempts += 1
  await this.save()
  return true
}

transcriptionJobSchema.methods.markReady = async function ({
  transcriptText,
  confidence,
} = {}) {
  if (typeof transcriptText === 'string') {
    this.transcriptText = transcriptText
  }
  if (typeof confidence === 'number') {
    this.confidence = confidence
  }

  this.status = 'ready'
  this.completedAt = new Date()
  await this.save()
}

transcriptionJobSchema.methods.markFailed = async function (error) {
  this.lastError = {
    message: error?.message || 'Unknown transcription error',
    code: error?.code || 'UNKNOWN',
    stack: error?.stack,
    occurredAt: new Date(),
  }

  if (this.attempts < this.maxAttempts) {
    this.status = 'uploaded'
    await this.save()
    return { retrying: true }
  }

  this.status = 'failed'
  this.completedAt = new Date()
  await this.save()
  return { retrying: false }
}

transcriptionJobSchema.methods.canRetry = function () {
  return this.status !== 'ready' && this.attempts < this.maxAttempts
}

const TranscriptionJob = mongoose.model(
  'TranscriptionJob',
  transcriptionJobSchema
)

export default TranscriptionJob
export { JOB_STATUSES as TRANSCRIPTION_JOB_STATUSES, DEFAULT_MAX_ATTEMPTS }
