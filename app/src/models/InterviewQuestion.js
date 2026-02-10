import mongoose from 'mongoose'

const interviewQuestionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Question title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Question description is required'],
    },
    type: {
      type: String,
      enum: ['behavioral', 'technical', 'situational', 'leadership'],
      default: 'behavioral',
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      required: true,
    },
    category: {
      type: String,
      enum: [
        'teamwork',
        'leadership',
        'problem-solving',
        'communication',
        'conflict-resolution',
        'time-management',
        'adaptability',
        'initiative',
      ],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    starGuidelines: {
      situation: {
        type: String,
        default: 'Describe the context and background of the situation',
      },
      task: {
        type: String,
        default:
          'Explain your responsibility and what needed to be accomplished',
      },
      action: {
        type: String,
        default: 'Detail the specific steps you took to address the situation',
      },
      result: {
        type: String,
        default: 'Share the outcomes and what you learned',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for faster queries
interviewQuestionSchema.index({ type: 1, difficulty: 1 })
interviewQuestionSchema.index({ category: 1 })
interviewQuestionSchema.index({ isActive: 1 })

const InterviewQuestion = mongoose.model(
  'InterviewQuestion',
  interviewQuestionSchema
)

export default InterviewQuestion
