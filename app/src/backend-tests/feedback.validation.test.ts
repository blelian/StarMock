// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { validateFeedbackEvaluation } from '../services/feedback/validation.js'

describe('feedback evaluation validation', () => {
  it('accepts and normalizes valid payloads', () => {
    const result = validateFeedbackEvaluation({
      scores: {
        situation: 70.2,
        task: 68.6,
        action: 81.4,
        result: 86,
        detail: 65.1,
        overall: 77.8,
      },
      rating: 'good',
      strengths: ['Great structure', 'Specific result metrics'],
      suggestions: ['Add more task ownership detail'],
      analysis: { provider: 'openai' },
    })

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.evaluation.scores.overall).toBe(78)
    expect(result.evaluation.rating).toBe('good')
  })

  it('flags invalid payloads and provides safe defaults', () => {
    const result = validateFeedbackEvaluation({
      scores: {
        situation: 'bad',
        task: null,
        action: undefined,
        result: {},
      },
      rating: 'unknown',
      strengths: [1, 2, 'strong action'],
      suggestions: [null, 'quantify outcomes'],
    })

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.evaluation.scores.overall).toBeGreaterThanOrEqual(0)
    expect(result.evaluation.rating).toBe('needs_improvement')
    expect(result.evaluation.strengths).toEqual(['strong action'])
    expect(result.evaluation.suggestions).toEqual(['quantify outcomes'])
  })
})
