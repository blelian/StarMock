// @vitest-environment node

import { describe, expect, it } from 'vitest'
import interviewRoutes from '../routes/interviews.js'
import { getRouteHandlers, runRouteHandlers } from './routerHarness'

function createAuthenticatedRequest() {
  return {
    session: {
      userId: 'user-123',
      user: {
        id: 'user-123',
        email: 'demo@starmock.dev',
      },
    },
  }
}

describe('interview route validation guards', () => {
  const getQuestionsHandlers = getRouteHandlers(interviewRoutes, 'get', '/questions')
  const getHistoryHandlers = getRouteHandlers(interviewRoutes, 'get', '/history')
  const createSessionHandlers = getRouteHandlers(interviewRoutes, 'post', '/sessions')

  it('rejects invalid question type', async () => {
    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: { type: 'invalid-type' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_TYPE',
      },
    })
  })

  it('rejects invalid question difficulty', async () => {
    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: { difficulty: 'extreme' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_DIFFICULTY',
      },
    })
  })

  it('rejects question limit above maximum', async () => {
    const res = await runRouteHandlers(getQuestionsHandlers, {
      ...createAuthenticatedRequest(),
      query: { limit: '999' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_LIMIT',
      },
    })
  })

  it('rejects history status outside allowed values', async () => {
    const res = await runRouteHandlers(getHistoryHandlers, {
      ...createAuthenticatedRequest(),
      query: { status: 'archived' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_STATUS',
      },
    })
  })

  it('rejects history limit above maximum', async () => {
    const res = await runRouteHandlers(getHistoryHandlers, {
      ...createAuthenticatedRequest(),
      query: { limit: '200' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_LIMIT',
      },
    })
  })

  it('rejects duplicate question IDs when creating a session', async () => {
    const res = await runRouteHandlers(createSessionHandlers, {
      ...createAuthenticatedRequest(),
      body: {
        questionIds: ['question-1', 'question-1'],
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'DUPLICATE_QUESTIONS',
      },
    })
  })
})
