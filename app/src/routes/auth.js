import express from 'express';
import { User } from '../models/index.js';
import { sessionHelpers } from '../config/session.js';
import { requireAuth, requireGuest } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public (guest only)
 */
router.post('/signup', requireGuest, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: {
          message: 'All fields are required',
          code: 'MISSING_FIELDS',
          fields: { email, password, firstName, lastName },
        },
      });
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        },
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        error: {
          message: 'Password must be at least 8 characters long',
          code: 'WEAK_PASSWORD',
        },
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        error: {
          message: 'User with this email already exists',
          code: 'USER_EXISTS',
        },
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });

    await user.save();

    // Regenerate session ID for security
    await sessionHelpers.regenerateSession(req);

    // Set user session
    sessionHelpers.setUserSession(req, user._id, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create user',
        code: 'SIGNUP_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          details: error.message,
        }),
      },
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public (guest only)
 */
router.post('/login', requireGuest, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: {
          message: 'Email and password are required',
          code: 'MISSING_CREDENTIALS',
        },
      });
    }

    // Find user by email (include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        error: {
          message: 'Account is deactivated',
          code: 'ACCOUNT_INACTIVE',
        },
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Regenerate session ID for security (prevent session fixation)
    await sessionHelpers.regenerateSession(req);

    // Set user session
    sessionHelpers.setUserSession(req, user._id, {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        fullName: user.getFullName(),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to login',
        code: 'LOGIN_ERROR',
      },
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await sessionHelpers.clearUserSession(req);
    
    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to logout',
        code: 'LOGOUT_ERROR',
      },
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get user',
        code: 'GET_USER_ERROR',
      },
    });
  }
});

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', (req, res) => {
  const isAuthenticated = sessionHelpers.isAuthenticated(req);
  
  res.json({
    isAuthenticated,
    user: isAuthenticated ? req.session.user : null,
  });
});

export default router;
