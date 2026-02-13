import express from 'express'
import { User } from '../models/index.js'
import { sessionHelpers } from '../config/session.js'
import { requireAuth, requireGuest } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validate.js'
import {
  validateCareerProfileRequest,
  validateSignupRequest,
  validateLoginRequest,
} from '../validators/api.js'

const router = express.Router()
const isProduction = process.env.NODE_ENV === 'production'

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  }
}

function serializeCareerProfile(profile) {
  const normalizedProfile = profile || {}
  const targetJobTitle =
    typeof normalizedProfile.targetJobTitle === 'string'
      ? normalizedProfile.targetJobTitle.trim()
      : ''
  const industry =
    typeof normalizedProfile.industry === 'string'
      ? normalizedProfile.industry.trim()
      : ''
  const seniority =
    typeof normalizedProfile.seniority === 'string'
      ? normalizedProfile.seniority.trim()
      : ''
  const jobDescriptionText =
    typeof normalizedProfile.jobDescriptionText === 'string'
      ? normalizedProfile.jobDescriptionText.trim()
      : ''

  return {
    targetJobTitle: targetJobTitle || null,
    industry: industry || null,
    seniority: seniority || null,
    jobDescriptionText,
    updatedAt: normalizedProfile.updatedAt || null,
  }
}

function isCareerProfileComplete(profile) {
  return Boolean(profile.targetJobTitle && profile.industry && profile.seniority)
}

function buildUserResponse(user) {
  const careerProfile = serializeCareerProfile(user.careerProfile)
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.getFullName(),
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    careerProfile,
    profileComplete: isCareerProfileComplete(careerProfile),
  }
}

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public (guest only)
 */
router.post(
  '/signup',
  requireGuest,
  validateRequest(validateSignupRequest),
  async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() })
      if (existingUser) {
        return res.status(409).json({
          error: {
            message: 'User with this email already exists',
            code: 'USER_EXISTS',
          },
        })
      }

      // Create new user
      const user = new User({
        email: email.toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })

      await user.save()

      // Regenerate session ID for security
      await sessionHelpers.regenerateSession(req)

      // Set user session
      sessionHelpers.setUserSession(req, user._id, {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileComplete: false,
      })
      await sessionHelpers.saveSession(req)

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      res.status(201).json({
        message: 'User registered successfully',
        user: buildUserResponse(user),
      })
    } catch (error) {
      console.error('Signup error:', error)
      res.status(500).json({
        error: {
          message: 'Failed to create user',
          code: 'SIGNUP_ERROR',
          ...(process.env.NODE_ENV === 'development' && {
            details: error.message,
          }),
        },
      })
    }
  }
)

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public (guest only)
 */
router.post(
  '/login',
  requireGuest,
  validateRequest(validateLoginRequest),
  async (req, res) => {
    try {
      const { email, password } = req.body

      // Find user by email (include password for comparison)
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        '+password'
      )

      if (!user) {
        return res.status(401).json({
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        })
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({
          error: {
            message: 'Account is deactivated',
            code: 'ACCOUNT_INACTIVE',
          },
        })
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          },
        })
      }

      // Regenerate session ID for security (prevent session fixation)
      await sessionHelpers.regenerateSession(req)

      // Set user session
      sessionHelpers.setUserSession(req, user._id, {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileComplete: user.hasCompleteCareerProfile(),
      })
      await sessionHelpers.saveSession(req)

      // Update last login
      user.lastLogin = new Date()
      await user.save()

      res.json({
        message: 'Login successful',
        user: buildUserResponse(user),
      })
    } catch (error) {
      console.error('Login error:', error)
      res.status(500).json({
        error: {
          message: 'Failed to login',
          code: 'LOGIN_ERROR',
        },
      })
    }
  }
)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await sessionHelpers.clearUserSession(req)
    res.clearCookie('starmock.sid', getSessionCookieOptions())

    res.json({
      message: 'Logout successful',
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to logout',
        code: 'LOGOUT_ERROR',
      },
    })
  }
})

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      })
    }

    res.json({
      user: buildUserResponse(user),
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      error: {
        message: 'Failed to get user',
        code: 'GET_USER_ERROR',
      },
    })
  }
})

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user's career profile
 * @access  Private
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      })
    }

    const careerProfile = serializeCareerProfile(user.careerProfile)

    return res.json({
      careerProfile,
      profileComplete: isCareerProfileComplete(careerProfile),
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return res.status(500).json({
      error: {
        message: 'Failed to get career profile',
        code: 'GET_PROFILE_ERROR',
      },
    })
  }
})

/**
 * @route   PATCH /api/auth/profile
 * @desc    Create or update current user's career profile
 * @access  Private
 */
router.patch(
  '/profile',
  requireAuth,
  validateRequest(validateCareerProfileRequest),
  async (req, res) => {
    try {
      const user = await User.findById(req.userId)

      if (!user) {
        return res.status(404).json({
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND',
          },
        })
      }

      const {
        targetJobTitle,
        industry,
        seniority,
        jobDescriptionText = '',
      } = req.body || {}

      user.careerProfile = {
        targetJobTitle: targetJobTitle.trim(),
        industry: industry.trim().toLowerCase(),
        seniority: seniority.trim().toLowerCase(),
        jobDescriptionText:
          typeof jobDescriptionText === 'string'
            ? jobDescriptionText.trim()
            : '',
        updatedAt: new Date(),
      }

      await user.save()

      if (req.session?.user) {
        req.session.user.profileComplete = true
        await sessionHelpers.saveSession(req)
      }

      const careerProfile = serializeCareerProfile(user.careerProfile)
      return res.json({
        message: 'Career profile saved successfully',
        careerProfile,
        profileComplete: isCareerProfileComplete(careerProfile),
      })
    } catch (error) {
      console.error('Update profile error:', error)
      return res.status(500).json({
        error: {
          message: 'Failed to update career profile',
          code: 'UPDATE_PROFILE_ERROR',
        },
      })
    }
  }
)

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', (req, res) => {
  const isAuthenticated = Boolean(
    req.session?.userId &&
    req.session?.user?.id?.toString() === req.session.userId.toString()
  )

  res.json({
    isAuthenticated,
    user: isAuthenticated ? req.session.user : null,
  })
})

export default router
