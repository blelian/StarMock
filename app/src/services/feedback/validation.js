const ALLOWED_RATINGS = new Set([
  'excellent',
  'good',
  'fair',
  'needs_improvement',
])

function toScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function deriveOverall(scores) {
  return Math.round(
    scores.situation * 0.2 +
      scores.task * 0.2 +
      scores.action * 0.25 +
      scores.result * 0.25 +
      scores.detail * 0.1
  )
}

function sanitizeStringList(value, maxItems = 6) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item) => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, maxItems)
}

export function validateFeedbackEvaluation(payload) {
  const errors = []
  const input = payload || {}
  const sourceScores = input.scores || {}
  const normalizedDefaults = []

  const scores = {
    situation: toScore(sourceScores.situation),
    task: toScore(sourceScores.task),
    action: toScore(sourceScores.action),
    result: toScore(sourceScores.result),
    detail: toScore(sourceScores.detail),
    overall: toScore(sourceScores.overall),
  }

  for (const key of ['situation', 'task', 'action', 'result']) {
    if (scores[key] === null) {
      errors.push(`scores.${key} must be a finite number`)
      scores[key] = 0
      normalizedDefaults.push(`scores.${key}`)
    }
  }

  if (scores.detail === null) {
    scores.detail = 0
    normalizedDefaults.push('scores.detail')
  }

  if (scores.overall === null) {
    scores.overall = deriveOverall(scores)
    normalizedDefaults.push('scores.overall')
  }

  const rating =
    typeof input.rating === 'string' ? input.rating.trim().toLowerCase() : ''
  if (!ALLOWED_RATINGS.has(rating)) {
    errors.push('rating must be one of excellent|good|fair|needs_improvement')
    normalizedDefaults.push('rating')
  }

  if (normalizedDefaults.length > 0) {
    console.warn(
      `[feedback-validation] Normalized invalid evaluation fields: ${normalizedDefaults.join(', ')}`,
      {
        providedScores: sourceScores,
        providedRating: input.rating,
      }
    )
  }

  const strengths = sanitizeStringList(input.strengths)
  const suggestions = sanitizeStringList(input.suggestions)

  const normalized = {
    scores,
    rating: ALLOWED_RATINGS.has(rating) ? rating : 'needs_improvement',
    strengths,
    suggestions,
    analysis:
      input.analysis && typeof input.analysis === 'object'
        ? input.analysis
        : {},
  }

  return {
    valid: errors.length === 0,
    errors,
    evaluation: normalized,
  }
}

export default {
  validateFeedbackEvaluation,
}
