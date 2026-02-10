import { sessionHelpers } from '../config/session.js'

/**
 * Middleware to protect routes that require authentication
 * Checks if user has a valid session
 */
export const requireAuth = (req, res, next) => {
  if (!sessionHelpers.isAuthenticated(req)) {
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
    })
  }

  // Attach userId to request for easy access in routes
  req.userId = sessionHelpers.getUserId(req)
  next()
}

/**
 * Middleware to check if user is already authenticated
 * Useful for routes like login/signup that should redirect if already logged in
 */
export const requireGuest = (req, res, next) => {
  if (sessionHelpers.isAuthenticated(req)) {
    return res.status(403).json({
      error: {
        message: 'Already authenticated',
        code: 'ALREADY_AUTHENTICATED',
      },
    })
  }
  next()
}

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req, res, next) => {
  if (!sessionHelpers.isAuthenticated(req)) {
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
    })
  }

  if (req.session.user?.role !== 'admin') {
    return res.status(403).json({
      error: {
        message: 'Admin access required',
        code: 'FORBIDDEN',
      },
    })
  }

  req.userId = sessionHelpers.getUserId(req)
  next()
}

/**
 * Optional authentication middleware
 * Attaches user info if authenticated, but allows request to proceed either way
 */
export const optionalAuth = (req, res, next) => {
  if (sessionHelpers.isAuthenticated(req)) {
    req.userId = sessionHelpers.getUserId(req)
    req.user = req.session.user
  }
  next()
}

/**
 * Middleware to refresh session activity
 * Extends session expiry on each request
 */
export const refreshSession = (req, res, next) => {
  if (sessionHelpers.isAuthenticated(req)) {
    sessionHelpers.touchSession(req)
  }
  next()
}
