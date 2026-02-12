// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  evaluateResponseWithProvider,
  getAvailableFeedbackProviders,
  getFeedbackProvider,
} from '../services/feedback/index.js'

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.OPENAI_API_KEY
})

describe('feedback provider abstraction', () => {
  it('exposes the default rule-based provider', () => {
    const provider = getFeedbackProvider('rule_based') as { id: string }

    expect(provider.id).toBe('rule_based')
    expect(getAvailableFeedbackProviders()).toContain('rule_based')
  })

  it('resolves openai alias to ai_model provider', () => {
    const provider = getFeedbackProvider('openai') as { id: string }
    expect(provider.id).toBe('ai_model')
    expect(getAvailableFeedbackProviders()).toContain('ai_model')
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

  it('falls back to rule_based when ai_model provider fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { evaluatorType, evaluation } = (await evaluateResponseWithProvider(
      'Situation: We had release risk. Task: align work. Action: I created a mitigation plan and coordinated rollout. Result: we shipped on time and reduced incidents by 30%.',
      { id: 'question-1' },
      'openai'
    )) as {
      evaluatorType: string
      evaluation: {
        scores: { overall: number }
      }
    }

    expect(evaluatorType).toBe('rule_based')
    expect(evaluation.scores.overall).toBeGreaterThan(0)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
