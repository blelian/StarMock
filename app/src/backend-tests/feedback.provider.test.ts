// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  evaluateResponseWithProvider,
  getAvailableFeedbackProviders,
  getFeedbackProvider,
} from '../services/feedback/index.js'
import openAIFeedbackProvider from '../services/feedback/providers/openAIProvider.js'

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.OPENAI_API_KEY
  delete process.env.FEEDBACK_PROVIDER_RETRIES
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

  it('falls back when ai_model payload is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(openAIFeedbackProvider, 'evaluate').mockResolvedValue({
      scores: {},
      rating: 'good',
      strengths: ['Structured answer'],
      suggestions: ['Add measurable outcomes'],
      analysis: {},
    } as never)

    const { evaluatorType } = await evaluateResponseWithProvider(
      'Situation: We had launch risk. Task: I was responsible for quality. Action: I ran test plans and coordinated fixes. Result: we reduced defects by 42%.',
      { id: 'question-1' },
      'openai'
    )

    expect(evaluatorType).toBe('rule_based')
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('retries provider before succeeding', async () => {
    process.env.FEEDBACK_PROVIDER_RETRIES = '1'
    const evaluateSpy = vi
      .spyOn(openAIFeedbackProvider, 'evaluate')
      .mockRejectedValueOnce(new Error('Transient provider error'))
      .mockResolvedValue({
        scores: {
          situation: 72,
          task: 70,
          action: 80,
          result: 84,
          detail: 68,
          overall: 78,
        },
        rating: 'good',
        strengths: ['Clear structure'],
        suggestions: ['Add one more metric'],
        analysis: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          promptVersion: 'star-eval.v1',
        },
      })

    const { evaluatorType, evaluatorMetadata } =
      await evaluateResponseWithProvider(
        'Situation: We had release risk. Task: align teams. Action: I created a mitigation plan and coordinated rollout. Result: we shipped on time and reduced incidents by 30%.',
        { id: 'question-1' },
        'openai'
      )

    expect(evaluatorType).toBe('ai_model')
    expect(evaluateSpy).toHaveBeenCalledTimes(2)
    expect(evaluatorMetadata?.attempts).toBe(2)
    expect(evaluatorMetadata?.fallback).toBe(false)
  })
})
