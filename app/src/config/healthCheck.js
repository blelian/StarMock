/**
 * Startup Health Checks
 *
 * Performs comprehensive health checks before starting the server:
 * - Database connectivity
 * - Required collections exist
 * - Indexes are created
 * - System resources
 */

import mongoose from 'mongoose'
import {
  User,
  InterviewQuestion,
  InterviewSession,
  InterviewResponse,
  FeedbackReport,
} from '../models/index.js'

/**
 * Run all startup health checks
 */
export async function runStartupChecks() {
  console.log('\n🏥 Running startup health checks...')
  console.log('='.repeat(50))

  const checks = [
    checkDatabaseConnection,
    checkCollections,
    checkIndexes,
    checkSeedData,
  ]

  let allPassed = true

  for (const check of checks) {
    try {
      const result = await check()
      if (!result) {
        allPassed = false
      }
    } catch (error) {
      console.error(`❌ Check failed: ${error.message}`)
      allPassed = false
    }
  }

  console.log('='.repeat(50))

  if (allPassed) {
    console.log('✅ All startup checks passed\n')
    return true
  } else {
    console.error('⚠️  Some startup checks failed\n')
    return false
  }
}

/**
 * Check database connection
 */
async function checkDatabaseConnection() {
  console.log('\n📡 Checking database connection...')

  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('   ✓ Database connected')
      return true
    }

    // Wait for connection with timeout
    await Promise.race([
      new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) {
          resolve()
        } else {
          mongoose.connection.once('connected', resolve)
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      ),
    ])

    console.log('   ✓ Database connected')
    return true
  } catch (error) {
    console.error(`   ✗ Database connection failed: ${error.message}`)
    return false
  }
}

/**
 * Check required collections exist
 */
async function checkCollections() {
  console.log('\n📚 Checking collections...')

  try {
    const collections = await mongoose.connection.db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    const required = [
      'users',
      'interviewquestions',
      'interviewsessions',
      'interviewresponses',
      'feedbackreports',
    ]
    const missing = required.filter((name) => !collectionNames.includes(name))

    if (missing.length > 0) {
      console.log(`   ⚠️  Missing collections: ${missing.join(', ')}`)
      console.log('   💡 These will be created automatically on first use')
    } else {
      console.log('   ✓ All collections exist')
    }

    return true
  } catch (error) {
    console.error(`   ✗ Collection check failed: ${error.message}`)
    return false
  }
}

/**
 * Check indexes are created
 */
async function checkIndexes() {
  console.log('\n🔍 Checking indexes...')

  try {
    const models = [
      { name: 'User', model: User },
      { name: 'InterviewQuestion', model: InterviewQuestion },
      { name: 'InterviewSession', model: InterviewSession },
      { name: 'InterviewResponse', model: InterviewResponse },
      { name: 'FeedbackReport', model: FeedbackReport },
    ]

    for (const { name, model } of models) {
      try {
        await model.createIndexes()
        console.log(`   ✓ ${name} indexes ready`)
      } catch (error) {
        console.log(`   ⚠️  ${name} indexes: ${error.message}`)
      }
    }

    return true
  } catch (error) {
    console.error(`   ✗ Index check failed: ${error.message}`)
    return false
  }
}

/**
 * Check if seed data exists
 */
async function checkSeedData() {
  console.log('\n🌱 Checking seed data...')

  try {
    const questionCount = await InterviewQuestion.countDocuments()

    if (questionCount === 0) {
      console.log('   ⚠️  No interview questions found')
      console.log('   💡 Run: npm run seed to populate sample data')
      return true // Don't fail, just warn
    } else {
      console.log(`   ✓ ${questionCount} interview questions available`)
    }

    return true
  } catch (error) {
    console.error(`   ✗ Seed data check failed: ${error.message}`)
    return false
  }
}

/**
 * Quick health check endpoint
 */
export async function healthCheck() {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'disconnected',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
  }

  // Check database
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping()
      status.database = 'connected'
    }
  } catch {
    status.database = 'error'
    status.status = 'degraded'
  }

  return status
}

/**
 * Detailed readiness check
 */
export async function readinessCheck() {
  const checks = {
    database: false,
    collections: false,
    models: false,
  }

  try {
    // Database connection
    checks.database = mongoose.connection.readyState === 1

    // Collections exist
    const collections = await mongoose.connection.db.listCollections().toArray()
    checks.collections = collections.length > 0

    // Models can query
    const count = await User.countDocuments().limit(1)
    checks.models = count >= 0

    const isReady = Object.values(checks).every((check) => check)

    return {
      ready: isReady,
      checks,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      ready: false,
      checks,
      error: error.message,
      timestamp: new Date().toISOString(),
    }
  }
}

export default {
  runStartupChecks,
  healthCheck,
  readinessCheck,
}
