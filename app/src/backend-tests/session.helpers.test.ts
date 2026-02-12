// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'
import { sessionHelpers } from '../config/session.js'

describe('sessionHelpers', () => {
  it('sets user session details', () => {
    const req = { session: {} } as any

    sessionHelpers.setUserSession(req, 'user-1', {
      email: 'user@example.com',
      firstName: 'First',
      lastName: 'Last',
      role: 'user',
    })

    expect(req.session.userId).toBe('user-1')
    expect(req.session.user).toMatchObject({
      id: 'user-1',
      email: 'user@example.com',
      firstName: 'First',
      lastName: 'Last',
      role: 'user',
    })
    expect(typeof req.session.loginTime).toBe('string')
  })

  it('saves session when save callback succeeds', async () => {
    const req = {
      session: {
        save: (cb: (err?: Error | null) => void) => cb(null),
      },
    } as any

    await expect(sessionHelpers.saveSession(req)).resolves.toBeUndefined()
  })

  it('rejects when session save fails', async () => {
    const req = {
      session: {
        save: (cb: (err?: Error | null) => void) =>
          cb(new Error('save failed')),
      },
    } as any

    await expect(sessionHelpers.saveSession(req)).rejects.toThrow('save failed')
  })

  it('regenerates and destroys sessions safely', async () => {
    const req = {
      session: {
        regenerate: (cb: (err?: Error | null) => void) => cb(null),
        destroy: (cb: (err?: Error | null) => void) => cb(null),
      },
    } as any

    await expect(sessionHelpers.regenerateSession(req)).resolves.toBeUndefined()
    await expect(sessionHelpers.clearUserSession(req)).resolves.toBeUndefined()
  })

  it('touches and inspects session metadata', () => {
    const touch = vi.fn()
    const req = {
      sessionID: 'session-1',
      session: {
        userId: 'user-1',
        loginTime: '2026-02-12T00:00:00.000Z',
        touch,
        cookie: {
          maxAge: 1000,
          expires: 'tomorrow',
          httpOnly: true,
          secure: false,
        },
      },
    } as any

    sessionHelpers.touchSession(req)
    expect(touch).toHaveBeenCalledTimes(1)

    const info = sessionHelpers.getSessionInfo(req)
    expect(info).toMatchObject({
      sessionID: 'session-1',
      userId: 'user-1',
      loginTime: '2026-02-12T00:00:00.000Z',
    })
    expect(info.cookie).toMatchObject({
      maxAge: 1000,
      httpOnly: true,
      secure: false,
    })
  })
})
