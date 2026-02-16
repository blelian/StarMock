import { InterviewSession } from '../../models/index.js'

const DEFAULT_STALE_MINUTES = 120
const DEFAULT_BATCH_SIZE = 25
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000

let pollTimer = null
let cycleInProgress = false

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

export async function runSessionAbandonmentCycle() {
  if (cycleInProgress) {
    return {
      skipped: true,
      reason: 'cycle_in_progress',
      abandoned: 0,
    }
  }

  cycleInProgress = true
  try {
    const staleMinutes = toPositiveInteger(
      process.env.SESSION_ABANDONMENT_STALE_MINUTES,
      DEFAULT_STALE_MINUTES
    )
    const batchSize = toPositiveInteger(
      process.env.SESSION_ABANDONMENT_BATCH_SIZE,
      DEFAULT_BATCH_SIZE
    )
    const staleThreshold = new Date(Date.now() - staleMinutes * 60 * 1000)

    const staleSessions = await InterviewSession.find({
      status: 'in_progress',
      updatedAt: { $lt: staleThreshold },
    })
      .sort({ updatedAt: 1 })
      .limit(batchSize)

    if (!staleSessions.length) {
      return {
        skipped: false,
        abandoned: 0,
      }
    }

    let abandoned = 0
    for (const session of staleSessions) {
      session.status = 'abandoned'
      session.completedAt = new Date()
      await session.save()
      abandoned += 1
    }

    if (abandoned > 0) {
      console.log(
        `[session-worker] Abandoned ${abandoned} stale session${abandoned === 1 ? '' : 's'}`
      )
    }

    return {
      skipped: false,
      abandoned,
    }
  } finally {
    cycleInProgress = false
  }
}

export function startSessionAbandonmentWorker() {
  if (process.env.SESSION_ABANDONMENT_WORKER_ENABLED === 'false') {
    console.log(
      '[session-worker] Disabled via SESSION_ABANDONMENT_WORKER_ENABLED=false'
    )
    return null
  }

  if (pollTimer) {
    return pollTimer
  }

  const pollIntervalMs = toPositiveInteger(
    process.env.SESSION_ABANDONMENT_POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS
  )
  pollTimer = setInterval(() => {
    runSessionAbandonmentCycle().catch((error) => {
      console.error('[session-worker] Cycle error:', error)
    })
  }, pollIntervalMs)
  runSessionAbandonmentCycle().catch((error) => {
    console.error('[session-worker] Initial cycle error:', error)
  })

  console.log(`[session-worker] Started (${pollIntervalMs}ms interval)`)
  return pollTimer
}

export function stopSessionAbandonmentWorker() {
  if (!pollTimer) {
    return
  }

  clearInterval(pollTimer)
  pollTimer = null
  console.log('[session-worker] Stopped')
}

export default {
  runSessionAbandonmentCycle,
  startSessionAbandonmentWorker,
  stopSessionAbandonmentWorker,
}
