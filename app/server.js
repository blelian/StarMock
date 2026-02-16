import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import connectDB from './src/config/database.js'
import { createSessionMiddleware } from './src/config/session.js'
import {
  authRoutes,
  interviewRoutes,
  uploadRoutes,
} from './src/routes/index.js'
import {
  validateEnvironment,
  getEnvironmentSummary,
} from './src/config/validateEnv.js'
import {
  runStartupChecks,
  healthCheck,
  readinessCheck,
} from './src/config/healthCheck.js'
import { getFeatureFlagsForUser } from './src/config/featureFlags.js'
import { requestContext } from './src/middleware/requestContext.js'
import {
  getMetricsSnapshot,
  incrementCounter,
  observeDuration,
  toPrometheusText,
} from './src/services/metrics/index.js'
import {
  startFeedbackJobWorker,
  stopFeedbackJobWorker,
} from './src/services/feedback/jobWorker.js'
import {
  startTranscriptionWorker,
  stopTranscriptionWorker,
} from './src/services/transcription/index.js'
import {
  startSessionAbandonmentWorker,
  stopSessionAbandonmentWorker,
} from './src/services/sessions/abandonmentWorker.js'

dotenv.config()

// Validate environment before starting
if (!validateEnvironment()) {
  console.error('\n❌ Environment validation failed. Exiting...')
  process.exit(1)
}

// Log environment summary
const envSummary = getEnvironmentSummary()
console.log('\n📋 Environment Configuration:')
console.log(`   Environment: ${envSummary.environment}`)
console.log(`   Port: ${envSummary.port}`)
console.log(`   Database: ${envSummary.mongoUri}`)
if (envSummary.frontendUrl) {
  console.log(`   Frontend URL: ${envSummary.frontendUrl}`)
}
console.log('')

const app = express()
const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV || 'development'
const sessionMiddleware = createSessionMiddleware()
app.disable('x-powered-by')
app.set('trust proxy', 1)
let server = null

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.ip || 'anonymous'),
  skip: (req) => !['/login', '/signup'].includes(req.path),
  message: {
    error: {
      message: 'Too many authentication attempts. Please try again later.',
      code: 'RATE_LIMITED',
    },
  },
})

const expensiveRouteLimiter = rateLimit({
  windowMs: toPositiveInteger(
    process.env.EXPENSIVE_ROUTE_LIMIT_WINDOW_MS,
    5 * 60 * 1000
  ),
  max: toPositiveInteger(process.env.EXPENSIVE_ROUTE_LIMIT_MAX, 30),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.session?.userId || req.ip || 'anonymous'),
  skip: (req) => {
    const expensiveRoutePatterns = [
      /^\/sessions\/[^/]+\/complete$/,
      /^\/sessions\/[^/]+\/feedback$/,
      /^\/sessions\/[^/]+\/feedback-status$/,
      /^\/sessions\/[^/]+\/responses$/,
      /^\/sessions\/[^/]+\/responses\/[^/]+\/transcript$/,
      /^\/sessions\/[^/]+\/abandon$/,
    ]
    return !expensiveRoutePatterns.some((pattern) => pattern.test(req.path))
  },
  message: {
    error: {
      message: 'Too many expensive requests. Please retry shortly.',
      code: 'RATE_LIMITED',
    },
  },
})

const uploadRouteLimiter = rateLimit({
  windowMs: toPositiveInteger(
    process.env.UPLOAD_RATE_LIMIT_WINDOW_MS,
    5 * 60 * 1000
  ),
  max: toPositiveInteger(process.env.UPLOAD_RATE_LIMIT_MAX, 20),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.session?.userId || req.ip || 'anonymous'),
  message: {
    error: {
      message: 'Too many upload requests. Please retry shortly.',
      code: 'RATE_LIMITED',
    },
  },
})

const normalizePathForMetrics = (pathValue) =>
  String(pathValue || '')
    .replace(/[0-9a-f]{24}/gi, ':id')
    .replace(/[0-9]{6,}/g, ':num')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(sessionMiddleware)
app.use(requestContext)
app.use(
  helmet({
    // Keep CSP off for now because current pages depend on inline scripts + CDN assets.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
)

if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',
    ]
    const origin = req.headers.origin
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    )
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200)
    }
    next()
  })
}

app.use((req, res, next) => {
  const requestStartedAt = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - requestStartedAt
    const labels = {
      method: req.method,
      path: normalizePathForMetrics(req.path),
      status: String(res.statusCode),
    }
    incrementCounter('starmock_http_requests_total', labels, 1)
    observeDuration('starmock_http_request_duration_ms', durationMs, labels)
  })

  const shouldLogHealthChecks = process.env.LOG_HEALTH_CHECKS === 'true'
  const isHealthProbe = req.path === '/api/health' || req.path === '/api/ready'

  if (isHealthProbe && !shouldLogHealthChecks) {
    return next()
  }

  const timestamp = new Date().toISOString()
  console.log(
    JSON.stringify({
      level: 'info',
      timestamp,
      correlationId: req.correlationId || null,
      method: req.method,
      path: req.path,
    })
  )
  next()
})

app.get('/api/health', async (req, res) => {
  try {
    const health = await healthCheck()
    const statusCode = health.status === 'healthy' ? 200 : 503
    res.status(statusCode).json(health)
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

app.get('/api/ready', async (req, res) => {
  try {
    const ready = await readinessCheck()
    const statusCode = ready.ready ? 200 : 503
    res.status(statusCode).json(ready)
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
})

app.get('/api/features', (req, res) => {
  const featureFlags = getFeatureFlagsForUser(req.session?.userId || null)
  res.json({ features: featureFlags })
})

app.get('/api/metrics', (req, res) => {
  const acceptHeader = String(req.headers.accept || '')
  if (acceptHeader.includes('text/plain')) {
    res.type('text/plain').send(toPrometheusText())
    return
  }
  res.json(getMetricsSnapshot())
})

if (NODE_ENV === 'development') {
  app.get('/api/session-info', (req, res) => {
    res.json({
      sessionID: req.sessionID,
      session: req.session,
      isAuthenticated: !!req.session?.userId,
    })
  })
}

// API routes
app.use('/api/auth', authRateLimiter, authRoutes)
app.use('/api', expensiveRouteLimiter, interviewRoutes)
app.use('/api/uploads', uploadRouteLimiter, uploadRoutes)

// serve frontend
app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      correlationId: req.correlationId || null,
      ...(NODE_ENV === 'development' && { stack: err.stack }),
    },
  })
})

async function startServer() {
  await connectDB()
  console.log('✅ Database connected successfully')

  const checksPass = await runStartupChecks()
  if (!checksPass && NODE_ENV === 'production') {
    throw new Error('Startup health checks failed in production')
  }

  startFeedbackJobWorker()
  startTranscriptionWorker()
  startSessionAbandonmentWorker()

  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📦 Environment: ${NODE_ENV}`)
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`)
    console.log(`🔐 Session management: enabled`)
  })
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err)
  process.exit(1)
})

// Graceful shutdown handlers
let isShuttingDown = false

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`)
  stopFeedbackJobWorker()
  stopTranscriptionWorker()
  stopSessionAbandonmentWorker()

  const closeDatabase = async () => {
    try {
      const mongoose = await import('mongoose')
      await mongoose.default.connection.close(false)
      console.log('✅ Database connection closed')
    } catch (error) {
      console.error('❌ Error closing database:', error)
    }
  }

  if (!server || !server.listening) {
    await closeDatabase()
    console.log('👋 Shutdown complete')
    process.exit(0)
    return
  }

  // Stop accepting new connections
  server.close(async (err) => {
    if (err && err.code !== 'ERR_SERVER_NOT_RUNNING') {
      console.error('❌ Error closing server:', err)
      process.exit(1)
    }

    console.log('✅ Server closed')
    await closeDatabase()
    console.log('👋 Shutdown complete')
    process.exit(0)
  })

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('\n❌ Forced shutdown after timeout')
    process.exit(1)
  }, 30000)
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  gracefulShutdown('UNCAUGHT_EXCEPTION')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  gracefulShutdown('UNHANDLED_REJECTION')
})
