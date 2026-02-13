import crypto from 'crypto'

const CORRELATION_HEADER = 'x-correlation-id'

function normalizeCorrelationId(value) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.length > 128) {
    return trimmed.slice(0, 128)
  }

  return trimmed
}

export function createCorrelationId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function requestContext(req, res, next) {
  const incomingCorrelationId = normalizeCorrelationId(
    req.headers[CORRELATION_HEADER]
  )
  const correlationId = incomingCorrelationId || createCorrelationId()

  req.correlationId = correlationId
  res.locals.correlationId = correlationId
  res.setHeader(CORRELATION_HEADER, correlationId)

  next()
}

export function getCorrelationId(req) {
  return req?.correlationId || null
}

export default {
  requestContext,
  getCorrelationId,
  createCorrelationId,
}
