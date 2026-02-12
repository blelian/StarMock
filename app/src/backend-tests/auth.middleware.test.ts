// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import {
  optionalAuth,
  refreshSession,
  requireAdmin,
  requireAuth,
  requireGuest,
} from '../middleware/auth.js'

function createResponse() {
  return {
    statusCode: 200,
    payload: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.payload = body
      return this
    },
  }
}

describe('auth middleware', () => {
  it('requireAuth allows authenticated requests', () => {
    const req = { session: { userId: 'user-1' } } as any
    const res = createResponse()
    const next = vi.fn()

    requireAuth(req, res as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.userId).toBe('user-1')
  })

  it('requireAuth blocks unauthenticated requests', () => {
    const req = { session: {} } as any
    const res = createResponse()
    const next = vi.fn()

    requireAuth(req, res as any, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(401)
    expect(res.payload).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
      },
    })
  })

  it('requireGuest blocks authenticated users', () => {
    const req = { session: { userId: 'user-2' } } as any
    const res = createResponse()
    const next = vi.fn()

    requireGuest(req, res as any, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(403)
    expect(res.payload).toMatchObject({
      error: {
        code: 'ALREADY_AUTHENTICATED',
      },
    })
  })

  it('requireAdmin allows admin users only', () => {
    const adminReq = {
      session: {
        userId: 'admin-1',
        user: { role: 'admin' },
      },
    } as any
    const adminRes = createResponse()
    const adminNext = vi.fn()

    requireAdmin(adminReq, adminRes as any, adminNext)
    expect(adminNext).toHaveBeenCalledTimes(1)
    expect(adminReq.userId).toBe('admin-1')

    const userReq = {
      session: {
        userId: 'user-1',
        user: { role: 'user' },
      },
    } as any
    const userRes = createResponse()
    const userNext = vi.fn()

    requireAdmin(userReq, userRes as any, userNext)
    expect(userNext).not.toHaveBeenCalled()
    expect(userRes.statusCode).toBe(403)
  })

  it('optionalAuth enriches request when authenticated', () => {
    const req = {
      session: {
        userId: 'user-3',
        user: { id: 'user-3', role: 'user' },
      },
    } as any
    const res = createResponse()
    const next = vi.fn()

    optionalAuth(req, res as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.userId).toBe('user-3')
    expect(req.user).toEqual({ id: 'user-3', role: 'user' })
  })

  it('refreshSession touches session when authenticated', () => {
    const touch = vi.fn()
    const req = { session: { userId: 'user-4', touch } } as any
    const res = createResponse()
    const next = vi.fn()

    refreshSession(req, res as any, next)

    expect(touch).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
