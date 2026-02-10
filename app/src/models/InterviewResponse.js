import mongoose from 'mongoose';

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
    responseText: {
      type: String,
      required: [true, 'Response text is required'],
      minlength: [50, 'Response must be at least 50 characters'],
      maxlength: [5000, 'Response must not exceed 5000 characters'],
    },
    responseType: {
      type: String,
      enum: ['text', 'audio_transcript'],
      default: 'text',
    },
    audioUrl: {
      type: String, // For future audio recording feature
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
);

// Indexes for faster queries
interviewResponseSchema.index({ sessionId: 1 });
interviewResponseSchema.index({ userId: 1 });

// Calculate word count before saving
interviewResponseSchema.pre('save', function () {
  if (this.responseText) {
    this.wordCount = this.responseText.trim().split(/\s+/).length;
  }
});

const InterviewResponse = mongoose.model('InterviewResponse', interviewResponseSchema);

export default InterviewResponse;
