import mongoose from 'mongoose'

const interviewResponseSchema = new mongoose.Schema(
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
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewQuestion',
      required: true,
    },
    attemptNumber: {
      type: Number,
      min: 1,
      default: 1,
      required: true,
    },
    responseText: {
      type: String,
      default: '',
      maxlength: [5000, 'Response must not exceed 5000 characters'],
      validate: [
        {
          validator(value) {
            const normalizedValue =
              typeof value === 'string' ? value.trim() : ''
            if (this.responseType === 'audio_transcript') {
              if (!normalizedValue) return true
              return normalizedValue.length >= 20
            }
            return normalizedValue.length >= 50
          },
          message:
            'Text responses require at least 50 characters; transcripts require at least 20 when provided',
        },
      ],
    },
    responseType: {
      type: String,
      enum: ['text', 'audio_transcript'],
      default: 'text',
    },
    audioUrl: {
      type: String,
      trim: true,
    },
    audioMimeType: {
      type: String,
      trim: true,
    },
    audioSizeBytes: {
      type: Number,
      min: 1,
    },
    audioDurationSeconds: {
      type: Number,
      min: 0,
    },
    transcriptionStatus: {
      type: String,
      enum: [
        'none',
        'uploaded',
        'transcribing',
        'ready',
        'failed',
        'review_required',
      ],
      default: 'none',
      index: true,
    },
    transcriptConfidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    transcriptProvider: {
      type: String,
      trim: true,
    },
    transcriptSegments: [
      {
        startMs: { type: Number, min: 0 },
        endMs: { type: Number, min: 0 },
        text: { type: String, trim: true },
        confidence: { type: Number, min: 0, max: 1 },
      },
    ],
    transcriptEdited: {
      type: Boolean,
      default: false,
    },
    transcriptReviewedAt: {
      type: Date,
    },
    wordCount: {
      type: Number,
    },
    submittedAt: {
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
interviewResponseSchema.index({ userId: 1 })
interviewResponseSchema.index({ sessionId: 1, questionId: 1, userId: 1 })
interviewResponseSchema.index({
  sessionId: 1,
  questionId: 1,
  userId: 1,
  attemptNumber: -1,
})

// Calculate word count before saving
interviewResponseSchema.pre('save', function () {
  if (this.responseText && this.responseText.trim().length > 0) {
    this.wordCount = this.responseText.trim().split(/\s+/).length
  } else {
    this.wordCount = 0
  }

  if (this.responseType === 'text') {
    this.transcriptionStatus = 'none'
    this.transcriptConfidence = undefined
    this.transcriptProvider = undefined
    this.transcriptSegments = []
    this.transcriptEdited = false
    this.transcriptReviewedAt = undefined
    this.audioUrl = undefined
    this.audioMimeType = undefined
    this.audioSizeBytes = undefined
    this.audioDurationSeconds = undefined
  }

  if (this.responseType === 'audio_transcript' && !this.audioUrl) {
    this.invalidate(
      'audioUrl',
      'Audio URL is required for audio transcript responses'
    )
  }
})

const InterviewResponse = mongoose.model(
  'InterviewResponse',
  interviewResponseSchema
)

export default InterviewResponse
