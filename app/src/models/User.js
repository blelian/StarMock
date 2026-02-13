import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import {
  SUPPORTED_INDUSTRIES,
  SUPPORTED_SENIORITY_LEVELS,
} from '../config/airProfiles.js'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    careerProfile: {
      targetJobTitle: {
        type: String,
        trim: true,
        maxlength: [120, 'Target job title must not exceed 120 characters'],
      },
      industry: {
        type: String,
        trim: true,
        lowercase: true,
        enum: SUPPORTED_INDUSTRIES,
      },
      seniority: {
        type: String,
        trim: true,
        lowercase: true,
        enum: SUPPORTED_SENIORITY_LEVELS,
      },
      jobDescriptionText: {
        type: String,
        trim: true,
        maxlength: [3000, 'Job description must not exceed 3000 characters'],
      },
      updatedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password
        return ret
      },
    },
  }
)

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return

  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Method to get full name
userSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`
}

userSchema.methods.getCareerProfile = function () {
  const profile = this.careerProfile || {}
  const targetJobTitle =
    typeof profile.targetJobTitle === 'string' ? profile.targetJobTitle : ''
  const industry = typeof profile.industry === 'string' ? profile.industry : ''
  const seniority =
    typeof profile.seniority === 'string' ? profile.seniority : ''
  const jobDescriptionText =
    typeof profile.jobDescriptionText === 'string'
      ? profile.jobDescriptionText
      : ''

  return {
    targetJobTitle: targetJobTitle.trim() || null,
    industry: industry.trim() || null,
    seniority: seniority.trim() || null,
    jobDescriptionText: jobDescriptionText.trim(),
    updatedAt: profile.updatedAt || null,
  }
}

userSchema.methods.hasCompleteCareerProfile = function () {
  const profile = this.getCareerProfile()
  return Boolean(
    profile.targetJobTitle && profile.industry && profile.seniority
  )
}

const User = mongoose.model('User', userSchema)

export default User
