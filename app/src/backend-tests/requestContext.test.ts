// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { requestContext } from '../middleware/requestContext.js'

describe('request context middleware', () => {
  it('uses incoming correlation id header when present', () => {
    const req = {
      headers: {
        'x-correlation-id': 'corr-123',
      },
    }
    const setHeader = vi.fn()
    const res = { locals: {}, setHeader }
    const next = vi.fn()

    requestContext(req as any, res as any, next)

    expect(req).toHaveProperty('correlationId', 'corr-123')
    expect(res.locals).toHaveProperty('correlationId', 'corr-123')
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', 'corr-123')
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('creates a correlation id when missing', () => {
    const req = { headers: {} }
    const setHeader = vi.fn()
    const res = { locals: {}, setHeader }
    const next = vi.fn()

    requestContext(req as any, res as any, next)

    expect(typeof (req as any).correlationId).toBe('string')
    expect((req as any).correlationId.length).toBeGreaterThan(0)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
