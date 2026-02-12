// @vitest-environment node

import { describe, expect, it } from 'vitest'
import authRoutes from '../routes/auth.js'
import { getRouteHandlers, runRouteHandlers } from './routerHarness'

type RouterLike = {
  stack: Array<Record<string, unknown>>
}

const authRouter = authRoutes as unknown as RouterLike

describe('auth routes', () => {
  const statusHandlers = getRouteHandlers(authRouter, 'get', '/status')

  it('returns unauthenticated when session is missing', async () => {
    const res = await runRouteHandlers(statusHandlers, {})

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      isAuthenticated: false,
      user: null,
    })
  })

  it('returns authenticated when session and user IDs match', async () => {
    const sessionUser = {
      id: 'user-123',
      email: 'demo@starmock.dev',
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
    }

    const res = await runRouteHandlers(statusHandlers, {
      session: {
        userId: 'user-123',
        user: sessionUser,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      isAuthenticated: true,
      user: sessionUser,
    })
  })

  it('returns unauthenticated when session and user IDs mismatch', async () => {
    const res = await runRouteHandlers(statusHandlers, {
      session: {
        userId: 'user-123',
        user: { id: 'other-user' },
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      isAuthenticated: false,
      user: null,
    })
  })
})
