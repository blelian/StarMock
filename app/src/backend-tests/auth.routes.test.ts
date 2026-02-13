// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { User } from '../models/index.js'
import authRoutes from '../routes/auth.js'
import { getRouteHandlers, runRouteHandlers } from './routerHarness'

type RouterLike = {
  stack: Array<Record<string, unknown>>
}

const authRouter = authRoutes as unknown as RouterLike

afterEach(() => {
  vi.restoreAllMocks()
})

describe('auth routes', () => {
  const statusHandlers = getRouteHandlers(authRouter, 'get', '/status')
  const getProfileHandlers = getRouteHandlers(authRouter, 'get', '/profile')
  const patchProfileHandlers = getRouteHandlers(authRouter, 'patch', '/profile')

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

  it('returns profile payload for authenticated user', async () => {
    vi.spyOn(User, 'findById').mockResolvedValue({
      _id: 'user-123',
      careerProfile: {
        targetJobTitle: 'Software Engineer',
        industry: 'technology',
        seniority: 'mid',
        jobDescriptionText: 'Building APIs',
        updatedAt: new Date('2026-02-13T00:00:00.000Z'),
      },
    } as never)

    const res = await runRouteHandlers(getProfileHandlers, {
      session: {
        userId: 'user-123',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({
      profileComplete: true,
      careerProfile: {
        targetJobTitle: 'Software Engineer',
        industry: 'technology',
        seniority: 'mid',
      },
    })
  })

  it('rejects invalid profile update payloads', async () => {
    const res = await runRouteHandlers(patchProfileHandlers, {
      session: {
        userId: 'user-123',
      },
      body: {
        industry: 'technology',
        seniority: 'entry',
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'MISSING_TARGET_JOB_TITLE',
      },
    })
  })

  it('saves profile payload for authenticated user', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const user: Record<string, any> = {
      _id: 'user-123',
      careerProfile: null,
      save,
    }

    vi.spyOn(User, 'findById').mockResolvedValue(user as never)

    const res = await runRouteHandlers(patchProfileHandlers, {
      session: {
        userId: 'user-123',
      },
      body: {
        targetJobTitle: 'Backend Developer',
        industry: 'Technology',
        seniority: 'Mid',
        jobDescriptionText: 'Build scalable APIs and services',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(save).toHaveBeenCalledTimes(1)
    expect(user.careerProfile).toMatchObject({
      targetJobTitle: 'Backend Developer',
      industry: 'technology',
      seniority: 'mid',
      jobDescriptionText: 'Build scalable APIs and services',
    })
    expect(res.body).toMatchObject({
      profileComplete: true,
      careerProfile: {
        targetJobTitle: 'Backend Developer',
        industry: 'technology',
        seniority: 'mid',
      },
    })
  })
})
