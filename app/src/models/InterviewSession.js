import mongoose from 'mongoose';

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    questions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewQuestion',
      required: true,
    }],
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number, // in seconds
    },
    metadata: {
      userAgent: String,
      ipAddress: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
interviewSessionSchema.index({ userId: 1, status: 1 });
interviewSessionSchema.index({ createdAt: -1 });

// Virtual for calculating duration on the fly
interviewSessionSchema.virtual('durationMinutes').get(function () {
  if (this.duration) {
    return Math.floor(this.duration / 60);
  }
  return null;
});

// Calculate and set duration when completing a session
interviewSessionSchema.pre('save', function () {
  if (this.isModified('completedAt') && this.completedAt && this.startedAt) {
    this.duration = Math.floor((this.completedAt - this.startedAt) / 1000);
  }
});

const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

export default InterviewSession;
