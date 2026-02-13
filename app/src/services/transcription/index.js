import fs from 'fs/promises'
import path from 'path'
import {
  InterviewResponse,
  TranscriptionJob,
} from '../../models/index.js'
import {
  incrementCounter,
  observeDuration,
  setGauge,
} from '../metrics/index.js'

const DEFAULT_PROVIDER_ID = process.env.TRANSCRIPTION_PROVIDER || 'mock'
const DEFAULT_BATCH_SIZE = 2
const DEFAULT_POLL_INTERVAL_MS = 6000
const DEFAULT_STALE_MINUTES = 10
const DEFAULT_REVIEW_CONFIDENCE_THRESHOLD = Number(
  process.env.TRANSCRIPT_REVIEW_CONFIDENCE_THRESHOLD || 0.75
)

let pollTimer = null
let cycleInProgress = false

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function resolveUploadPath(audioUrl) {
  if (typeof audioUrl !== 'string' || !audioUrl.startsWith('local-upload://')) {
    return null
  }
  const objectKey = audioUrl.replace('local-upload://', '').trim()
  if (!objectKey) {
    return null
  }
  const storageDir =
    process.env.UPLOAD_STORAGE_DIR || path.join(process.cwd(), 'tmp', 'audio-uploads')
  return path.join(storageDir, objectKey)
}

async function mockTranscribe({ response, audioUrl }) {
  const audioPath = resolveUploadPath(audioUrl)
  let audioHint = ''

  if (audioPath) {
    try {
      const stats = await fs.stat(audioPath)
      const kb = Math.max(1, Math.round(stats.size / 1024))
      audioHint = `Audio sample size: ${kb}KB.`
    } catch {
      audioHint = ''
    }
  }

  const existingText =
    typeof response.responseText === 'string' ? response.responseText.trim() : ''
  const transcriptText =
    existingText ||
    `Auto transcript placeholder for response ${response._id}. ${audioHint} Please review and edit before final submit.`

  const confidence = existingText
    ? 0.92
    : response.audioDurationSeconds && response.audioDurationSeconds > 20
      ? 0.78
      : 0.66

  return {
    transcriptText,
    confidence,
    segments: [
      {
        startMs: 0,
        endMs: Math.max(1000, Math.round((response.audioDurationSeconds || 10) * 1000)),
        text: transcriptText,
        confidence,
      },
    ],
    provider: 'mock',
  }
}

const transcriptionProviders = new Map([['mock', { transcribe: mockTranscribe }]])

function getTranscriptionProvider(providerId = DEFAULT_PROVIDER_ID) {
  const normalized = (providerId || 'mock').toLowerCase().trim()
  return transcriptionProviders.get(normalized) || transcriptionProviders.get('mock')
}

async function applyTranscriptToResponse(response, transcriptResult) {
  const confidence = Number(transcriptResult.confidence || 0)
  const normalizedTranscript =
    typeof transcriptResult.transcriptText === 'string'
      ? transcriptResult.transcriptText.trim()
      : ''

  response.responseText = normalizedTranscript
  response.transcriptConfidence = Math.max(0, Math.min(1, confidence))
  response.transcriptProvider = transcriptResult.provider || DEFAULT_PROVIDER_ID
  response.transcriptSegments = Array.isArray(transcriptResult.segments)
    ? transcriptResult.segments
    : []
  response.transcriptionStatus =
    response.transcriptConfidence < DEFAULT_REVIEW_CONFIDENCE_THRESHOLD
      ? 'review_required'
      : 'ready'
  response.transcriptEdited = false
  await response.save()
}

export async function processTranscriptionJob(job) {
  if (!job) {
    return { processed: false, reason: 'missing_job' }
  }

  const transitioned = await job.markTranscribing()
  if (!transitioned) {
    return { processed: false, reason: 'not_uploaded', status: job.status }
  }

  const startedAt = Date.now()
  try {
    const response = await InterviewResponse.findOne({
      _id: job.responseId,
      userId: job.userId,
    })
    if (!response) {
      throw new Error('Interview response not found for transcription')
    }

    response.transcriptionStatus = 'transcribing'
    await response.save()

    const provider = getTranscriptionProvider(job.metadata?.provider)
    const transcriptResult = await provider.transcribe({
      response,
      audioUrl: job.metadata?.audioUrl || response.audioUrl,
    })

    await applyTranscriptToResponse(response, transcriptResult)
    await job.markReady({
      transcriptText: transcriptResult.transcriptText,
      confidence: transcriptResult.confidence,
    })

    observeDuration(
      'starmock_transcription_job_duration_ms',
      Date.now() - startedAt,
      { status: 'ready' }
    )
    incrementCounter('starmock_transcription_jobs_total', { status: 'ready' }, 1)

    return {
      processed: true,
      status: 'ready',
      jobId: job._id,
      responseId: response._id,
    }
  } catch (error) {
    const failure = await job.markFailed(error)
    await InterviewResponse.updateOne(
      { _id: job.responseId, userId: job.userId },
      {
        $set: {
          transcriptionStatus: failure.retrying ? 'uploaded' : 'failed',
        },
      }
    )

    observeDuration(
      'starmock_transcription_job_duration_ms',
      Date.now() - startedAt,
      { status: failure.retrying ? 'retrying' : 'failed' }
    )
    incrementCounter(
      'starmock_transcription_jobs_total',
      { status: failure.retrying ? 'retrying' : 'failed' },
      1
    )

    return {
      processed: true,
      status: failure.retrying ? 'uploaded' : 'failed',
      retrying: failure.retrying,
      error: error.message,
      jobId: job._id,
    }
  }
}

export async function recoverStaleTranscriptionJobs(
  staleMinutes = DEFAULT_STALE_MINUTES
) {
  const staleJobs = await TranscriptionJob.getStaleTranscribingJobs(staleMinutes)

  for (const staleJob of staleJobs) {
    await staleJob.markFailed(new Error('Transcription job timed out'))
  }

  return staleJobs.length
}

export async function processNextTranscriptionJobs(batchSize = DEFAULT_BATCH_SIZE) {
  const jobs = await TranscriptionJob.getQueuedJobs(batchSize)
  const results = []
  for (const job of jobs) {
    results.push(await processTranscriptionJob(job))
  }
  return results
}

export async function runTranscriptionJobCycle() {
  if (cycleInProgress) {
    return {
      skipped: true,
      reason: 'cycle_in_progress',
    }
  }

  cycleInProgress = true
  try {
    const staleMinutes = toPositiveInteger(
      process.env.TRANSCRIPTION_JOB_STALE_MINUTES,
      DEFAULT_STALE_MINUTES
    )
    const batchSize = toPositiveInteger(
      process.env.TRANSCRIPTION_JOB_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    )

    const staleRecovered = await recoverStaleTranscriptionJobs(staleMinutes)
    const processedJobs = await processNextTranscriptionJobs(batchSize)
    const queueDepth = await TranscriptionJob.countDocuments({ status: 'uploaded' })
    setGauge('starmock_transcription_queue_depth', {}, queueDepth)
    if (staleRecovered > 0) {
      incrementCounter(
        'starmock_transcription_stale_recovered_total',
        {},
        staleRecovered
      )
    }

    return {
      staleRecovered,
      processedJobs,
      skipped: false,
    }
  } finally {
    cycleInProgress = false
  }
}

export function startTranscriptionWorker() {
  if (process.env.TRANSCRIPTION_JOB_WORKER_ENABLED === 'false') {
    return null
  }

  if (pollTimer) {
    return pollTimer
  }

  const pollIntervalMs = toPositiveInteger(
    process.env.TRANSCRIPTION_JOB_POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS
  )
  pollTimer = setInterval(() => {
    runTranscriptionJobCycle().catch((error) => {
      console.error('[transcription-worker] Cycle error:', error)
    })
  }, pollIntervalMs)

  runTranscriptionJobCycle().catch((error) => {
    console.error('[transcription-worker] Initial cycle error:', error)
  })

  console.log(
    `[transcription-worker] Started (${pollIntervalMs}ms interval, provider=${DEFAULT_PROVIDER_ID})`
  )
  return pollTimer
}

export function stopTranscriptionWorker() {
  if (!pollTimer) {
    return
  }
  clearInterval(pollTimer)
  pollTimer = null
  console.log('[transcription-worker] Stopped')
}

export default {
  processTranscriptionJob,
  processNextTranscriptionJobs,
  recoverStaleTranscriptionJobs,
  runTranscriptionJobCycle,
  startTranscriptionWorker,
  stopTranscriptionWorker,
}
