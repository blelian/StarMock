import ruleBasedFeedbackProvider from './providers/ruleBasedProvider.js'

const DEFAULT_PROVIDER_ID = 'rule_based'
const providerAliases = new Map([
  ['rule_based', 'rule_based'],
  ['rule-based', 'rule_based'],
  ['rules', 'rule_based'],
])

const providers = new Map([[ruleBasedFeedbackProvider.id, ruleBasedFeedbackProvider]])

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
  const evaluation = await provider.evaluate({ responseText, question })

  return {
    evaluation,
    evaluatorType: provider.id,
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
