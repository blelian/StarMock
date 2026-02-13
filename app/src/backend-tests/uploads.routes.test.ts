// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { InterviewSession } from '../models/index.js'
import uploadRoutes from '../routes/uploads.js'
import { getRouteHandlers, runRouteHandlers } from './routerHarness'

type RouterLike = {
  stack: Array<Record<string, unknown>>
}

const uploadRouter = uploadRoutes as unknown as RouterLike

function createAuthenticatedRequest() {
  return {
    session: {
      userId: 'user-123',
      user: {
        id: 'user-123',
      },
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.FEATURE_AUDIO_UPLOADS_ENABLED
})

describe('upload routes', () => {
  const presignHandlers = getRouteHandlers(uploadRouter, 'post', '/audio/presign')

  it('requires authentication', async () => {
    const res = await runRouteHandlers(presignHandlers, {
      body: {
        sessionId: 'session-1',
        mimeType: 'audio/webm',
        sizeBytes: 51200,
      },
    })

    expect(res.statusCode).toBe(401)
    expect(res.body).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
      },
    })
  })

  it('rejects unsupported mime types', async () => {
    const res = await runRouteHandlers(presignHandlers, {
      ...createAuthenticatedRequest(),
      body: {
        sessionId: 'session-1',
        mimeType: 'text/plain',
        sizeBytes: 51200,
      },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: {
        code: 'INVALID_AUDIO_MIME',
      },
    })
  })

  it('returns 403 when upload feature flag is disabled', async () => {
    process.env.FEATURE_AUDIO_UPLOADS_ENABLED = 'false'

    const res = await runRouteHandlers(presignHandlers, {
      ...createAuthenticatedRequest(),
      body: {
        sessionId: 'session-1',
        mimeType: 'audio/webm',
        sizeBytes: 51200,
      },
    })

    expect(res.statusCode).toBe(403)
    expect(res.body).toMatchObject({
      error: {
        code: 'FEATURE_DISABLED',
      },
    })
  })

  it('returns 404 when session is missing', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue(null)

    const res = await runRouteHandlers(presignHandlers, {
      ...createAuthenticatedRequest(),
      body: {
        sessionId: 'session-missing',
        mimeType: 'audio/webm',
        sizeBytes: 250000,
      },
    })

    expect(res.statusCode).toBe(404)
    expect(res.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
      },
    })
  })

  it('creates a signed upload target for valid requests', async () => {
    vi.spyOn(InterviewSession, 'findOne').mockResolvedValue({
      _id: 'session-1',
      userId: 'user-123',
    } as never)

    const res = await runRouteHandlers(presignHandlers, {
      ...createAuthenticatedRequest(),
      body: {
        sessionId: 'session-1',
        mimeType: 'audio/webm',
        sizeBytes: 950000,
        durationSeconds: 34.2,
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.body).toMatchObject({
      upload: {
        objectKey: expect.stringContaining('session-1'),
        uploadUrl: expect.stringContaining('/api/uploads/audio/'),
        method: 'PUT',
        audioUrl: expect.stringContaining('local-upload://'),
      },
    })
  })
})
