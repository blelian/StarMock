// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { resolveAirContext } from '../services/air/index.js'

describe('AIR context resolver', () => {
  it('resolves known role aliases deterministically', () => {
    const context = resolveAirContext({
      targetJobTitle: 'Senior Backend Engineer',
      industry: 'technology',
      seniority: 'senior',
      jobDescriptionText: 'Build APIs and distributed systems',
    })

    expect(context.industry).toBe('technology')
    expect(context.seniority).toBe('senior')
    expect(context.role).toMatchObject({
      id: 'backend_developer',
      source: 'catalog',
    })
    expect(context.contextKey).toBe('technology:senior:backend_developer')
  })

  it('falls back to custom role and normalized defaults when unknown', () => {
    const context = resolveAirContext({
      targetJobTitle: 'Chief Galaxy Specialist',
      industry: 'space',
      seniority: 'principal',
    })

    expect(context.industry).toBe('other')
    expect(context.seniority).toBe('mid')
    expect(context.role).toMatchObject({
      id: 'custom_role',
      source: 'custom',
    })
    expect(context.competencies.length).toBeGreaterThan(0)
  })
})
