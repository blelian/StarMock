// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import mongoose from 'mongoose'
import FeedbackJob, {
  JOB_STATUSES,
  MAX_ATTEMPTS,
} from '../models/FeedbackJob.js'

type FeedbackJobModelLike = {
  generateIdempotencyKey: (sessionId: string) => string
  findOrCreateForSession: (
    sessionId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ) => Promise<{ job: unknown; created: boolean }>
  getQueuedJobs: (limit?: number) => Promise<unknown[]>
  getStaleProcessingJobs: (staleMinutes?: number) => Promise<unknown[]>
  create: (...args: unknown[]) => Promise<unknown>
  findOne: (...args: unknown[]) => Promise<unknown>
  find: (...args: unknown[]) => unknown
}

type FeedbackJobDocLike = {
  status: string
  attempts: number
  maxAttempts: number
  startedAt?: Date
  completedAt?: Date
  lastError?: { message?: string }
  duration: number | null
  save: () => Promise<unknown>
  markProcessing: () => Promise<boolean>
  markCompleted: () => Promise<void>
  markFailed: (error: Error) => Promise<{ retrying: boolean }>
  canRetry: () => boolean
}

const FeedbackJobModel = FeedbackJob as unknown as FeedbackJobModelLike

function createUnsavedJob(overrides: Record<string, unknown> = {}) {
  const job = new FeedbackJob({
    sessionId: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    idempotencyKey: `job-${Date.now()}-${Math.random()}`,
    ...overrides,
  }) as unknown as FeedbackJobDocLike

  job.save = vi.fn().mockResolvedValue(job)
  return job
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('FeedbackJob model helpers', () => {
  it('exports supported job statuses and max attempts', () => {
    expect(JOB_STATUSES).toEqual([
      'queued',
      'processing',
      'completed',
      'failed',
    ])
    expect(MAX_ATTEMPTS).toBe(3)
  })

  it('validates required fields and status enum', async () => {
    const validJob = new FeedbackJob({
      sessionId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      idempotencyKey: 'feedback-job-test-session',
      status: 'queued',
    })
    await expect(validJob.validate()).resolves.toBeUndefined()

    const invalidStatus = new FeedbackJob({
      sessionId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      idempotencyKey: 'feedback-job-test-session-2',
      status: 'invalid',
    })
    await expect(invalidStatus.validate()).rejects.toThrow()
  })

  it('generates deterministic idempotency keys', () => {
    const sessionId = new mongoose.Types.ObjectId().toString()
    const keyA = FeedbackJobModel.generateIdempotencyKey(sessionId)
    const keyB = FeedbackJobModel.generateIdempotencyKey(sessionId)

    expect(keyA).toBe(`feedback-job-${sessionId}`)
    expect(keyA).toBe(keyB)
  })

  it('findOrCreateForSession creates on first call', async () => {
    const createdJob = createUnsavedJob()
    vi.spyOn(FeedbackJobModel, 'create').mockResolvedValue(createdJob)

    const result = await FeedbackJobModel.findOrCreateForSession(
      new mongoose.Types.ObjectId().toString(),
      new mongoose.Types.ObjectId().toString()
    )

    expect(result.created).toBe(true)
    expect(result.job).toBe(createdJob)
  })

  it('findOrCreateForSession returns existing on duplicate key', async () => {
    const duplicate = Object.assign(new Error('duplicate key'), { code: 11000 })
    const existingJob = createUnsavedJob()

    vi.spyOn(FeedbackJobModel, 'create').mockRejectedValue(duplicate)
    vi.spyOn(FeedbackJobModel, 'findOne').mockResolvedValue(existingJob)

    const result = await FeedbackJobModel.findOrCreateForSession(
      new mongoose.Types.ObjectId().toString(),
      new mongoose.Types.ObjectId().toString()
    )

    expect(result.created).toBe(false)
    expect(result.job).toBe(existingJob)
  })
})

describe('FeedbackJob instance methods', () => {
  it('markProcessing transitions queued -> processing and increments attempts', async () => {
    const job = createUnsavedJob({ status: 'queued', attempts: 0 })

    const changed = await job.markProcessing()

    expect(changed).toBe(true)
    expect(job.status).toBe('processing')
    expect(job.attempts).toBe(1)
    expect(job.startedAt).toBeInstanceOf(Date)
    expect(
      (job.save as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBe(1)
  })

  it('markProcessing is no-op when status is not queued', async () => {
    const job = createUnsavedJob({ status: 'completed', attempts: 0 })

    const changed = await job.markProcessing()

    expect(changed).toBe(false)
    expect(
      (job.save as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBe(0)
  })

  it('markCompleted sets terminal status and completion time', async () => {
    const job = createUnsavedJob({ status: 'processing' })

    await job.markCompleted()

    expect(job.status).toBe('completed')
    expect(job.completedAt).toBeInstanceOf(Date)
    expect(
      (job.save as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBe(1)
  })

  it('markFailed requeues when attempts are still available', async () => {
    const job = createUnsavedJob({
      status: 'processing',
      attempts: 1,
      maxAttempts: MAX_ATTEMPTS,
    })

    const result = await job.markFailed(new Error('provider timeout'))

    expect(result.retrying).toBe(true)
    expect(job.status).toBe('queued')
    expect(job.lastError?.message).toBe('provider timeout')
  })

  it('markFailed completes as failed when attempts are exhausted', async () => {
    const job = createUnsavedJob({
      status: 'processing',
      attempts: MAX_ATTEMPTS,
      maxAttempts: MAX_ATTEMPTS,
    })

    const result = await job.markFailed(new Error('final failure'))

    expect(result.retrying).toBe(false)
    expect(job.status).toBe('failed')
    expect(job.completedAt).toBeInstanceOf(Date)
  })

  it('canRetry respects attempt count and terminal states', () => {
    const retryable = createUnsavedJob({ status: 'queued', attempts: 1 })
    expect(retryable.canRetry()).toBe(true)

    const maxed = createUnsavedJob({
      status: 'queued',
      attempts: MAX_ATTEMPTS,
      maxAttempts: MAX_ATTEMPTS,
    })
    expect(maxed.canRetry()).toBe(false)

    const completed = createUnsavedJob({ status: 'completed', attempts: 0 })
    expect(completed.canRetry()).toBe(false)
  })

  it('duration virtual returns null without startedAt', () => {
    const job = createUnsavedJob()
    expect(job.duration).toBeNull()
  })

  it('duration virtual computes elapsed milliseconds', () => {
    const startedAt = new Date(Date.now() - 5000)
    const completedAt = new Date()
    const job = createUnsavedJob({ startedAt, completedAt })

    expect(job.duration).toBeGreaterThan(4500)
    expect(job.duration).toBeLessThan(6000)
  })
})

describe('FeedbackJob static query helpers', () => {
  it('getQueuedJobs queries queued jobs ordered by createdAt with limit', async () => {
    const exec = vi.fn().mockResolvedValue([{ id: 1 }])
    const limit = vi.fn().mockReturnValue({ exec })
    const sort = vi.fn().mockReturnValue({ limit })
    const find = vi
      .spyOn(FeedbackJobModel, 'find')
      .mockReturnValue({ sort } as unknown)

    const result = await FeedbackJobModel.getQueuedJobs(3)

    expect(find).toHaveBeenCalledWith({ status: 'queued' })
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 })
    expect(limit).toHaveBeenCalledWith(3)
    expect(result).toEqual([{ id: 1 }])
  })

  it('getStaleProcessingJobs queries processing jobs older than threshold', async () => {
    const exec = vi.fn().mockResolvedValue([{ id: 'stale' }])
    const find = vi
      .spyOn(FeedbackJobModel, 'find')
      .mockReturnValue({ exec } as unknown)

    const result = await FeedbackJobModel.getStaleProcessingJobs(15)

    expect(find).toHaveBeenCalledTimes(1)
    const queryArg = find.mock.calls[0][0] as {
      status: string
      startedAt: { $lt: Date }
    }
    expect(queryArg.status).toBe('processing')
    expect(queryArg.startedAt.$lt).toBeInstanceOf(Date)
    expect(result).toEqual([{ id: 'stale' }])
  })
})
