import ruleBasedFeedbackProvider from './providers/ruleBasedProvider.js'
import openAIFeedbackProvider from './providers/openAIProvider.js'
import { validateFeedbackEvaluation } from './validation.js'
import { incrementCounter, observeDuration } from '../metrics/index.js'

const DEFAULT_PROVIDER_ID = 'rule_based'
const providerAliases = new Map([
  ['rule_based', 'rule_based'],
  ['rule-based', 'rule_based'],
  ['rules', 'rule_based'],
  ['ai_model', 'ai_model'],
  ['ai-model', 'ai_model'],
  ['openai', 'ai_model'],
  ['llm', 'ai_model'],
])

const providers = new Map([
  [ruleBasedFeedbackProvider.id, ruleBasedFeedbackProvider],
  [openAIFeedbackProvider.id, openAIFeedbackProvider],
])

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function providerTimeoutMs() {
  return toPositiveInteger(process.env.FEEDBACK_PROVIDER_TIMEOUT_MS, 20000)
}

function providerRetries() {
  return toPositiveInteger(process.env.FEEDBACK_PROVIDER_RETRIES, 1)
}

async function runWithTimeout(promise, timeoutMs, providerId) {
  let timeoutHandle
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Provider "${providerId}" timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    clearTimeout(timeoutHandle)
  }
}

function normalizeProviderError(error) {
  if (error instanceof Error) {
    return error
  }
  return new Error(typeof error === 'string' ? error : 'Unknown provider error')
}

async function evaluateWithPolicy(provider, responseText, question) {
  const retries = providerRetries()
  const timeoutMs = providerTimeoutMs()
  const startedAt = Date.now()
  const attemptErrors = []

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const rawEvaluation = await runWithTimeout(
        Promise.resolve(provider.evaluate({ responseText, question })),
        timeoutMs,
        provider.id
      )

      const validation = validateFeedbackEvaluation(rawEvaluation)
      if (!validation.valid) {
        const validationError = new Error(
          `Provider "${provider.id}" returned invalid payload`
        )
        validationError.code = 'INVALID_PROVIDER_PAYLOAD'
        validationError.validationErrors = validation.errors
        throw validationError
      }

      const analysis = {
        ...(validation.evaluation.analysis || {}),
      }

      return {
        evaluation: {
          ...validation.evaluation,
          analysis,
        },
        evaluatorType: provider.id,
        evaluatorMetadata: {
          provider: provider.id,
          attempts: attempt + 1,
          retries,
          latencyMs: Date.now() - startedAt,
          timeoutMs,
          fallback: false,
          model: analysis.model || null,
          promptVersion: analysis.promptVersion || null,
          tokenUsage: analysis.tokenUsage || null,
        },
      }
    } catch (error) {
      const normalizedError = normalizeProviderError(error)
      attemptErrors.push({
        message: normalizedError.message,
        code: normalizedError.code || 'PROVIDER_ERROR',
      })

      if (attempt === retries) {
        incrementCounter('starmock_feedback_provider_errors_total', {
          provider: provider.id,
        })
        normalizedError.attemptErrors = attemptErrors
        throw normalizedError
      }
    }
  }

  throw new Error(`Provider "${provider.id}" failed after retry policy`)
}

function normalizeProviderId(providerId) {
  const normalized = (providerId || DEFAULT_PROVIDER_ID).trim().toLowerCase()
  return providerAliases.get(normalized) || normalized
}

export function getFeedbackProvider(providerId = process.env.FEEDBACK_PROVIDER) {
  const normalizedId = normalizeProviderId(providerId)
  const provider = providers.get(normalizedId)

  if (provider) {
    return provider
  }

  const fallbackProvider = providers.get(DEFAULT_PROVIDER_ID)
  console.warn(
    `[feedback] Unknown provider "${providerId}". Falling back to "${DEFAULT_PROVIDER_ID}".`
  )
  return fallbackProvider
}

export async function evaluateResponseWithProvider(
  responseText,
  question,
  providerId
) {
  const provider = getFeedbackProvider(providerId)
  const startedAt = Date.now()
  try {
    const result = await evaluateWithPolicy(provider, responseText, question)
    incrementCounter('starmock_feedback_provider_calls_total', {
      provider: result.evaluatorType,
      fallback: 'false',
    })
    observeDuration(
      'starmock_feedback_provider_latency_ms',
      Date.now() - startedAt,
      { provider: result.evaluatorType, fallback: 'false' }
    )
    return result
  } catch (error) {
    if (provider.id === DEFAULT_PROVIDER_ID) {
      throw error
    }

    console.warn(
      `[feedback] Provider "${provider.id}" failed (${error.message}). Falling back to "${DEFAULT_PROVIDER_ID}".`
    )

    const fallbackProvider = providers.get(DEFAULT_PROVIDER_ID)
    const fallbackResult = await evaluateWithPolicy(
      fallbackProvider,
      responseText,
      question
    )

    const fallbackError = normalizeProviderError(error)
    incrementCounter('starmock_feedback_provider_calls_total', {
      provider: fallbackProvider.id,
      fallback: 'true',
    })
    incrementCounter('starmock_feedback_fallback_total', {
      from: provider.id,
      to: fallbackProvider.id,
    })
    observeDuration(
      'starmock_feedback_provider_latency_ms',
      Date.now() - startedAt,
      { provider: fallbackProvider.id, fallback: 'true' }
    )
    return {
      ...fallbackResult,
      evaluatorMetadata: {
        ...(fallbackResult.evaluatorMetadata || {}),
        fallback: true,
        fallbackFrom: provider.id,
        fallbackReason: fallbackError.message,
        upstreamErrors: fallbackError.attemptErrors || [],
      },
    }
  }
}

export function getAvailableFeedbackProviders() {
  return Array.from(providers.keys())
}

export default {
  getFeedbackProvider,
  evaluateResponseWithProvider,
  getAvailableFeedbackProviders,
}
