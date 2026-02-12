import session from 'express-session'
import MongoStore from 'connect-mongo'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET
const NODE_ENV = process.env.NODE_ENV || 'development'

if (!SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET or JWT_SECRET must be defined in environment variables'
  )
}

function createSessionStore() {
  return MongoStore.create({
    mongoUrl: MONGODB_URI,
    dbName: 'starmock',
    collectionName: 'sessions',
    touchAfter: 24 * 3600, // Lazy session update (in seconds) - only update once per 24 hours
    crypto: {
      secret: SESSION_SECRET, // Encrypt session data in MongoDB
    },
    autoRemove: 'native', // Use MongoDB TTL for automatic cleanup
    autoRemoveInterval: 10, // Check for expired sessions every 10 minutes
    stringify: false, // Store sessions as native MongoDB documents (better performance)
    mongoOptions: {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    },
  })
}

function createSessionConfig() {
  return {
    secret: SESSION_SECRET,
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    name: 'starmock.sid', // Custom session cookie name
    store: createSessionStore(),
    cookie: {
      httpOnly: true, // Prevent client-side JS from reading the cookie
      secure: NODE_ENV === 'production', // Only send cookie over HTTPS in production
      sameSite: NODE_ENV === 'production' ? 'strict' : 'lax', // CSRF protection
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days in milliseconds
      path: '/',
    },
  }
}

/**
 * Build session middleware lazily so module import itself does not block startup.
 */
export function createSessionMiddleware() {
  return session(createSessionConfig())
}

/**
 * Session helper utilities
 */
export const sessionHelpers = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated: (req) => {
    return req.session && req.session.userId
  },

  /**
   * Get user ID from session
   */
  getUserId: (req) => {
    return req.session?.userId || null
  },

  /**
   * Set user session after login
   */
  setUserSession: (req, userId, userData = {}) => {
    req.session.userId = userId
    req.session.user = {
      id: userId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
    }
    req.session.loginTime = new Date().toISOString()
  },

  /**
   * Persist in-memory session mutations to the store before responding.
   */
  saveSession: (req) => {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        resolve()
        return
      }

      req.session.save((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  },

  /**
   * Clear user session (logout)
   */
  clearUserSession: (req) => {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        resolve()
        return
      }

      req.session.destroy((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  },

  /**
   * Regenerate session ID (for security after login)
   */
  regenerateSession: (req) => {
    return new Promise((resolve, reject) => {
      if (!req.session) {
        resolve()
        return
      }

      req.session.regenerate((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  },

  /**
   * Touch session to extend expiry
   */
  touchSession: (req) => {
    if (req.session) {
      req.session.touch()
    }
  },

  /**
   * Get session info for debugging
   */
  getSessionInfo: (req) => {
    return {
      sessionID: req.sessionID,
      userId: req.session?.userId,
      loginTime: req.session?.loginTime,
      cookie: {
        maxAge: req.session?.cookie.maxAge,
        expires: req.session?.cookie.expires,
        httpOnly: req.session?.cookie.httpOnly,
        secure: req.session?.cookie.secure,
      },
    }
  },
}

export default createSessionMiddleware
