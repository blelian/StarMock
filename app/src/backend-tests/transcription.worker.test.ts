// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import { InterviewResponse } from '../models/index.js'
import { processTranscriptionJob } from '../services/transcription/index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('transcription worker', () => {
  it('processes uploaded jobs to ready state', async () => {
    const responseSave = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(InterviewResponse, 'findOne').mockResolvedValue({
      _id: 'response-1',
      userId: 'user-1',
      responseText: '',
      audioDurationSeconds: 15,
      save: responseSave,
    } as never)

    const job = {
      _id: 'job-1',
      responseId: 'response-1',
      userId: 'user-1',
      metadata: { provider: 'mock', audioUrl: 'local-upload://audio-1.webm' },
      markTranscribing: vi.fn().mockResolvedValue(true),
      markReady: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue({ retrying: false }),
    }

    const result = await processTranscriptionJob(job as any)

    expect(result).toMatchObject({
      processed: true,
      status: 'ready',
      jobId: 'job-1',
    })
    expect(job.markReady).toHaveBeenCalledTimes(1)
    expect(responseSave).toHaveBeenCalled()
  })

  it('requeues or fails jobs when processing throws', async () => {
    vi.spyOn(InterviewResponse, 'findOne').mockResolvedValue(null)
    const updateSpy = vi
      .spyOn(InterviewResponse, 'updateOne')
      .mockResolvedValue({ modifiedCount: 1 } as never)

    const job = {
      _id: 'job-2',
      responseId: 'response-missing',
      userId: 'user-1',
      metadata: { provider: 'mock', audioUrl: 'local-upload://missing.webm' },
      markTranscribing: vi.fn().mockResolvedValue(true),
      markReady: vi.fn().mockResolvedValue(undefined),
      markFailed: vi.fn().mockResolvedValue({ retrying: true }),
    }

    const result = await processTranscriptionJob(job as any)

    expect(result).toMatchObject({
      processed: true,
      status: 'uploaded',
      retrying: true,
    })
    expect(job.markFailed).toHaveBeenCalledTimes(1)
    expect(updateSpy).toHaveBeenCalledTimes(1)
  })
})
