/**
 * Environment Validation
 *
 * Validates all required environment variables are present
 * and properly configured before starting the application.
 */

const requiredEnvVars = {
  development: ['MONGODB_URI', 'SESSION_SECRET', 'PORT'],
  production: [
    'MONGODB_URI',
    'SESSION_SECRET',
    'PORT',
    'NODE_ENV',
    'FRONTEND_URL',
    'FEEDBACK_PROVIDER',
    'TRANSCRIPTION_PROVIDER',
    'UPLOAD_SIGNING_SECRET',
  ],
}

/**
 * Validate environment variables
 */
export function validateEnvironment() {
  const env = process.env.NODE_ENV || 'development'
  const required = requiredEnvVars[env] || requiredEnvVars.development

  console.log(`\n🔍 Validating ${env} environment...`)

  const missing = []
  const present = []

  // Check required variables
  for (const varName of required) {
    if (!process.env[varName]) {
      // Check if JWT_SECRET can substitute for SESSION_SECRET
      if (varName === 'SESSION_SECRET' && process.env.JWT_SECRET) {
        present.push(`${varName} (using JWT_SECRET)`)
      } else {
        missing.push(varName)
      }
    } else {
      present.push(varName)
    }
  }

  // Report results
  if (present.length > 0) {
    console.log('✅ Found environment variables:')
    present.forEach((varName) => console.log(`   - ${varName}`))
  }

  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:')
    missing.forEach((varName) => console.error(`   - ${varName}`))
    console.error(
      '\n💡 Tip: Create a .env file with these variables or set them in your environment.'
    )
    return false
  }

  // Validate specific formats
  const validationErrors = []

  // MongoDB URI format
  if (process.env.MONGODB_URI && !isValidMongoUri(process.env.MONGODB_URI)) {
    validationErrors.push(
      'MONGODB_URI must be a valid MongoDB connection string'
    )
  }

  // Port number
  if (process.env.PORT && !isValidPort(process.env.PORT)) {
    validationErrors.push('PORT must be a number between 1 and 65535')
  }

  // Frontend URL in production
  if (
    env === 'production' &&
    process.env.FRONTEND_URL &&
    !isValidUrl(process.env.FRONTEND_URL)
  ) {
    validationErrors.push('FRONTEND_URL must be a valid URL')
  }

  // OpenAI API key required when using OpenAI provider
  const feedbackProvider = (process.env.FEEDBACK_PROVIDER || 'rule_based')
    .toLowerCase()
    .trim()
  const transcriptionProvider = (
    process.env.TRANSCRIPTION_PROVIDER || 'mock'
  )
    .toLowerCase()
    .trim()

  if (
    !['rule_based', 'openai', 'ai_model'].includes(feedbackProvider)
  ) {
    validationErrors.push(
      'FEEDBACK_PROVIDER must be one of: rule_based, openai, ai_model'
    )
  }

  if (!['mock', 'openai'].includes(transcriptionProvider)) {
    validationErrors.push(
      'TRANSCRIPTION_PROVIDER must be one of: mock, openai'
    )
  }

  const requiresOpenAI =
    feedbackProvider === 'openai' ||
    feedbackProvider === 'ai_model' ||
    transcriptionProvider === 'openai'

  if (requiresOpenAI && !process.env.OPENAI_API_KEY) {
    validationErrors.push(
      'OPENAI_API_KEY is required when OpenAI feedback/transcription providers are enabled'
    )
  }

  // Validate OpenAI API key format (should start with sk-)
  if (
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith('sk-')
  ) {
    validationErrors.push('OPENAI_API_KEY should start with "sk-"')
  }

  const uploadTtlSeconds = Number.parseInt(
    process.env.UPLOAD_URL_TTL_SECONDS || '300',
    10
  )
  if (!Number.isInteger(uploadTtlSeconds) || uploadTtlSeconds <= 0) {
    validationErrors.push('UPLOAD_URL_TTL_SECONDS must be a positive integer')
  }

  const uploadMaxAudioBytes = Number.parseInt(
    process.env.UPLOAD_MAX_AUDIO_BYTES || '12582912',
    10
  )
  if (!Number.isInteger(uploadMaxAudioBytes) || uploadMaxAudioBytes <= 0) {
    validationErrors.push('UPLOAD_MAX_AUDIO_BYTES must be a positive integer')
  }

  if (
    env === 'production' &&
    process.env.UPLOAD_SIGNING_SECRET &&
    process.env.UPLOAD_SIGNING_SECRET.length < 16
  ) {
    validationErrors.push(
      'UPLOAD_SIGNING_SECRET must be at least 16 characters in production'
    )
  }

  if (validationErrors.length > 0) {
    console.error('\n⚠️  Environment validation errors:')
    validationErrors.forEach((error) => console.error(`   - ${error}`))
    return false
  }

  console.log('✅ Environment validation passed\n')
  return true
}

/**
 * Validate MongoDB URI format
 */
function isValidMongoUri(uri) {
  return /^mongodb(\+srv)?:\/\/.+/.test(uri)
}

/**
 * Validate port number
 */
function isValidPort(port) {
  const num = parseInt(port, 10)
  return !isNaN(num) && num > 0 && num <= 65535
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Get environment summary
 */
export function getEnvironmentSummary() {
  const env = process.env.NODE_ENV || 'development'

  return {
    environment: env,
    port: process.env.PORT || 3000,
    mongoUri: process.env.MONGODB_URI
      ? maskMongoUri(process.env.MONGODB_URI)
      : 'not set',
    frontendUrl: process.env.FRONTEND_URL || 'not set',
    sessionSecret: process.env.SESSION_SECRET ? '***' : 'not set',
    jwtSecret: process.env.JWT_SECRET ? '***' : 'not set',
    feedbackProvider: process.env.FEEDBACK_PROVIDER || 'rule_based',
    transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || 'mock',
    openaiApiKey: process.env.OPENAI_API_KEY ? '***' : 'not set',
    uploadSigningSecret: process.env.UPLOAD_SIGNING_SECRET ? '***' : 'not set',
    uploadTtlSeconds: process.env.UPLOAD_URL_TTL_SECONDS || '300',
    uploadMaxAudioBytes: process.env.UPLOAD_MAX_AUDIO_BYTES || '12582912',
  }
}

/**
 * Mask sensitive parts of MongoDB URI
 */
function maskMongoUri(uri) {
  try {
    const url = new URL(uri)
    if (url.password) {
      url.password = '***'
    }
    return url.toString()
  } catch {
    return 'mongodb://***'
  }
}

/**
 * Check if running in production
 */
export function isProduction() {
  return process.env.NODE_ENV === 'production'
}

/**
 * Check if running in development
 */
export function isDevelopment() {
  return !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
}

export default {
  validateEnvironment,
  getEnvironmentSummary,
  isProduction,
  isDevelopment,
}
