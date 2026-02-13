import mongoose from 'mongoose'

const feedbackReportSchema = new mongoose.Schema(
  {
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
    responseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewResponse',
      required: true,
      unique: true,
    },
    scores: {
      situation: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      task: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      action: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      result: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
      detail: {
        type: Number,
        min: 0,
        max: 100,
      },
      overall: {
        type: Number,
        min: 0,
        max: 100,
        required: true,
      },
    },
    strengths: [
      {
        type: String,
        trim: true,
      },
    ],
    suggestions: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'needs_improvement'],
    },
    analysis: {
      type: mongoose.Schema.Types.Mixed,
    },
    evaluatorType: {
      type: String,
      enum: ['rule_based', 'ai_model', 'hybrid'],
      default: 'rule_based',
    },
    evaluatorMetadata: {
      provider: {
        type: String,
      },
      model: {
        type: String,
      },
      promptVersion: {
        type: String,
      },
      latencyMs: {
        type: Number,
      },
      timeoutMs: {
        type: Number,
      },
      attempts: {
        type: Number,
      },
      retries: {
        type: Number,
      },
      fallback: {
        type: Boolean,
        default: false,
      },
      fallbackFrom: {
        type: String,
      },
      fallbackReason: {
        type: String,
      },
      tokenUsage: {
        promptTokens: { type: Number },
        completionTokens: { type: Number },
        totalTokens: { type: Number },
      },
      correlationId: {
        type: String,
      },
      generatedAt: {
        type: Date,
      },
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for faster queries
feedbackReportSchema.index({ userId: 1, createdAt: -1 })

// Calculate overall rating based on overall score
feedbackReportSchema.pre('save', function () {
  if (this.scores && this.scores.overall !== undefined) {
    const score = this.scores.overall
    if (score >= 85) {
      this.rating = 'excellent'
    } else if (score >= 70) {
      this.rating = 'good'
    } else if (score >= 50) {
      this.rating = 'fair'
    } else {
      this.rating = 'needs_improvement'
    }
  }
})

const FeedbackReport = mongoose.model('FeedbackReport', feedbackReportSchema)

export default FeedbackReport
