// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { InterviewSession } from '../models/index.js'
import { runSessionAbandonmentCycle } from '../services/sessions/abandonmentWorker.js'

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.SESSION_ABANDONMENT_STALE_MINUTES
  delete process.env.SESSION_ABANDONMENT_BATCH_SIZE
})

function mockFindChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result)
  const sort = vi.fn().mockReturnValue({ limit })
  const find = vi.spyOn(InterviewSession, 'find').mockReturnValue({
    sort,
  } as never)
  return { find, sort, limit }
}

describe('session abandonment worker', () => {
  it('returns zero when no stale sessions are found', async () => {
    const { find } = mockFindChain([])

    const result = await runSessionAbandonmentCycle()

    expect(result).toMatchObject({
      skipped: false,
      abandoned: 0,
    })
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'in_progress',
      })
    )
  })

  it('marks stale in-progress sessions as abandoned', async () => {
    const saveA = vi.fn().mockResolvedValue(undefined)
    const saveB = vi.fn().mockResolvedValue(undefined)
    const staleSessions = [
      {
        _id: 'session-1',
        status: 'in_progress',
        completedAt: null,
        save: saveA,
      },
      {
        _id: 'session-2',
        status: 'in_progress',
        completedAt: null,
        save: saveB,
      },
    ]
    mockFindChain(staleSessions)
    vi.spyOn(console, 'log').mockImplementation(() => {})

    const result = await runSessionAbandonmentCycle()

    expect(result).toMatchObject({
      skipped: false,
      abandoned: 2,
    })
    expect(staleSessions[0].status).toBe('abandoned')
    expect(staleSessions[1].status).toBe('abandoned')
    expect(staleSessions[0].completedAt).toBeInstanceOf(Date)
    expect(staleSessions[1].completedAt).toBeInstanceOf(Date)
    expect(saveA).toHaveBeenCalledTimes(1)
    expect(saveB).toHaveBeenCalledTimes(1)
  })
})
