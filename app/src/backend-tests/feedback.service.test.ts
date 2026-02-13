// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { evaluateResponse } from '../services/feedbackService.js'

const strongResponse = `
Situation: Our onboarding flow had a 42% drop-off rate during account setup.
Task: I was responsible for improving completion rates before the next release.
Action: I mapped user friction points, redesigned form validation, and coordinated analytics with design and engineering.
Result: Completion rate improved to 71% within one quarter and support tickets dropped by 18%.
`

const weakResponse = 'I did my best and things were okay.'

describe('feedbackService.evaluateResponse', () => {
  it('returns STAR analysis with scores and rating', () => {
    const evaluation = evaluateResponse(strongResponse) as {
      scores: { overall: number }
      rating: string
      strengths: string[]
      analysis: {
        structure: { wordCount: number }
        starComponents: { action: { score: number } }
      }
    }

    expect(evaluation.scores.overall).toBeGreaterThan(0)
    expect(evaluation.rating).toMatch(/excellent|good|fair|needs_improvement/)
    expect(evaluation.analysis.structure.wordCount).toBeGreaterThan(20)
    expect(evaluation.analysis.starComponents.action.score).toBeGreaterThan(0)
    expect(evaluation.strengths.length).toBeGreaterThan(0)
  })

  it('returns actionable suggestions for weak responses', () => {
    const evaluation = evaluateResponse(weakResponse) as {
      rating: string
      suggestions: string[]
      scores: { detail: number }
    }

    expect(evaluation.rating).toBe('needs_improvement')
    expect(evaluation.suggestions.length).toBeGreaterThan(0)
    expect(evaluation.scores.detail).toBeLessThanOrEqual(30)
  })
})
