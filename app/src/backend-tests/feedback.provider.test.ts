// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import {
  evaluateResponseWithProvider,
  getAvailableFeedbackProviders,
  getFeedbackProvider,
} from '../services/feedback/index.js'

describe('feedback provider abstraction', () => {
  it('exposes the default rule-based provider', () => {
    const provider = getFeedbackProvider('rule_based') as { id: string }

    expect(provider.id).toBe('rule_based')
    expect(getAvailableFeedbackProviders()).toContain('rule_based')
  })

  it('falls back to default provider when unknown id is supplied', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const provider = getFeedbackProvider('unknown-provider') as { id: string }
    expect(provider.id).toBe('rule_based')
    expect(warnSpy).toHaveBeenCalledTimes(1)

    warnSpy.mockRestore()
  })

  it('evaluates a response and returns evaluator metadata', async () => {
    const { evaluatorType, evaluation } = (await evaluateResponseWithProvider(
      'Situation: We had service latency issues. Task: I needed to improve reliability. Action: I profiled bottlenecks and optimized database queries. Result: p95 latency dropped by 37%.',
      { id: 'question-1' }
    )) as {
      evaluatorType: string
      evaluation: {
        scores: { overall: number }
        analysis: unknown
      }
    }

    expect(evaluatorType).toBe('rule_based')
    expect(evaluation.scores.overall).toBeGreaterThan(0)
    expect(evaluation.analysis).toBeDefined()
  })
})
