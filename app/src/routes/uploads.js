import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import express from 'express'
import { InterviewSession } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validate.js'
import { validateAudioPresignRequest } from '../validators/api.js'
import { isFeatureEnabled } from '../config/featureFlags.js'
import { incrementCounter } from '../services/metrics/index.js'

const router = express.Router()

const DEFAULT_ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
]

const DEFAULT_UPLOAD_TTL_SECONDS = 300
const DEFAULT_UPLOAD_MAX_BYTES = 12 * 1024 * 1024
const DEFAULT_STORAGE_DIR = path.join(process.cwd(), 'tmp', 'audio-uploads')

function getAllowedMimeTypes() {
  const configured = process.env.UPLOAD_ALLOWED_AUDIO_MIME
  if (!configured || configured.trim().length === 0) {
    return new Set(DEFAULT_ALLOWED_MIME_TYPES.map((item) => item.toLowerCase()))
  }
  return new Set(
    configured
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  )
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function sanitizeObjectKey(objectKey) {
  if (!/^[a-zA-Z0-9._-]+$/.test(objectKey)) {
    return null
  }
  return objectKey
}

function guessExtension(mimeType) {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mp4')) return 'mp4'
  return 'bin'
}

function getSigningSecret() {
  return (
    process.env.UPLOAD_SIGNING_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'unsafe-local-upload-secret'
  )
}

function signUploadPayload(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url')
  return `${encodedPayload}.${signature}`
}

function verifyUploadToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return null
  }

  const [encodedPayload, signature] = token.split('.', 2)
  const expectedSignature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url')

  if (signature !== expectedSignature) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    )
    if (!payload || typeof payload !== 'object') {
      return null
    }
    if (!payload.exp || Date.now() > payload.exp) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

function buildAudioUrl(objectKey) {
  return `local-upload://${objectKey}`
}

router.post(
  '/audio/presign',
  requireAuth,
  validateRequest(validateAudioPresignRequest),
  async (req, res) => {
    try {
      if (!isFeatureEnabled('audioUploads', { userId: req.userId })) {
        incrementCounter('starmock_upload_presign_total', {
          status: 'disabled',
        })
        return res.status(403).json({
          error: {
            message: 'Audio uploads are currently disabled',
            code: 'FEATURE_DISABLED',
          },
        })
      }

      const {
        sessionId,
        mimeType,
        sizeBytes,
        durationSeconds,
        responseId = null,
      } = req.body

      const normalizedMimeType = String(mimeType).trim().toLowerCase()
      const allowedMimeTypes = getAllowedMimeTypes()
      if (!allowedMimeTypes.has(normalizedMimeType)) {
        incrementCounter('starmock_upload_presign_total', {
          status: 'invalid_mime',
        })
        return res.status(400).json({
          error: {
            message: 'Unsupported audio MIME type',
            code: 'UNSUPPORTED_AUDIO_MIME',
          },
        })
      }

      const maxBytes = toPositiveInteger(
        process.env.UPLOAD_MAX_AUDIO_BYTES,
        DEFAULT_UPLOAD_MAX_BYTES
      )
      if (sizeBytes > maxBytes) {
        incrementCounter('starmock_upload_presign_total', {
          status: 'too_large',
        })
        return res.status(400).json({
          error: {
            message: `Audio exceeds maximum allowed size of ${maxBytes} bytes`,
            code: 'AUDIO_TOO_LARGE',
          },
        })
      }

      const session = await InterviewSession.findOne({
        _id: sessionId,
        userId: req.userId,
      })
      if (!session) {
        incrementCounter('starmock_upload_presign_total', {
          status: 'session_missing',
        })
        return res.status(404).json({
          error: {
            message: 'Session not found',
            code: 'NOT_FOUND',
          },
        })
      }

      const extension = guessExtension(normalizedMimeType)
      const objectKey = `${sessionId}-${Date.now()}-${crypto.randomUUID()}.${extension}`
      const expiresInSeconds = toPositiveInteger(
        process.env.UPLOAD_URL_TTL_SECONDS,
        DEFAULT_UPLOAD_TTL_SECONDS
      )
      const expiresAtMs = Date.now() + expiresInSeconds * 1000
      const token = signUploadPayload({
        objectKey,
        sessionId,
        userId: String(req.userId),
        mimeType: normalizedMimeType,
        sizeBytes,
        durationSeconds: durationSeconds || null,
        responseId,
        exp: expiresAtMs,
      })

      incrementCounter('starmock_upload_presign_total', { status: 'success' })
      return res.status(201).json({
        upload: {
          objectKey,
          uploadUrl: `/api/uploads/audio/${encodeURIComponent(objectKey)}?token=${encodeURIComponent(token)}`,
          method: 'PUT',
          headers: {
            'Content-Type': normalizedMimeType,
          },
          expiresAt: new Date(expiresAtMs).toISOString(),
          expiresInSeconds,
          maxBytes,
          audioUrl: buildAudioUrl(objectKey),
        },
      })
    } catch (error) {
      console.error('Create audio upload URL error:', error)
      incrementCounter('starmock_upload_presign_total', { status: 'error' })
      return res.status(500).json({
        error: {
          message: 'Failed to create upload URL',
          code: 'UPLOAD_PRESIGN_ERROR',
        },
      })
    }
  }
)

router.put(
  '/audio/:objectKey',
  express.raw({ type: '*/*', limit: '20mb' }),
  async (req, res) => {
    try {
      const objectKey = sanitizeObjectKey(req.params.objectKey)
      if (!objectKey) {
        return res.status(400).json({
          error: {
            message: 'Invalid upload object key',
            code: 'INVALID_OBJECT_KEY',
          },
        })
      }

      const token = String(req.query.token || '')
      const payload = verifyUploadToken(token)
      if (!payload || payload.objectKey !== objectKey) {
        incrementCounter('starmock_audio_upload_total', { status: 'invalid_token' })
        return res.status(403).json({
          error: {
            message: 'Invalid or expired upload token',
            code: 'INVALID_UPLOAD_TOKEN',
          },
        })
      }

      const contentType = String(req.headers['content-type'] || '').toLowerCase()
      if (!contentType || !contentType.startsWith('audio/')) {
        incrementCounter('starmock_audio_upload_total', {
          status: 'invalid_content_type',
        })
        return res.status(400).json({
          error: {
            message: 'Upload content must be audio/*',
            code: 'INVALID_UPLOAD_CONTENT_TYPE',
          },
        })
      }

      if (contentType !== payload.mimeType) {
        incrementCounter('starmock_audio_upload_total', { status: 'mime_mismatch' })
        return res.status(400).json({
          error: {
            message: 'Upload content type does not match signed request',
            code: 'MIME_MISMATCH',
          },
        })
      }

      const bodyBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body || '')
      if (!bodyBuffer.length) {
        incrementCounter('starmock_audio_upload_total', { status: 'empty' })
        return res.status(400).json({
          error: {
            message: 'Empty audio payload',
            code: 'EMPTY_AUDIO_PAYLOAD',
          },
        })
      }

      const maxBytes = toPositiveInteger(
        process.env.UPLOAD_MAX_AUDIO_BYTES,
        DEFAULT_UPLOAD_MAX_BYTES
      )
      if (bodyBuffer.length > maxBytes || bodyBuffer.length > payload.sizeBytes) {
        incrementCounter('starmock_audio_upload_total', { status: 'too_large' })
        return res.status(400).json({
          error: {
            message: 'Audio payload exceeds allowed size',
            code: 'AUDIO_TOO_LARGE',
          },
        })
      }

      const storageDir = process.env.UPLOAD_STORAGE_DIR || DEFAULT_STORAGE_DIR
      await fs.mkdir(storageDir, { recursive: true })
      const filePath = path.join(storageDir, objectKey)

      try {
        await fs.access(filePath)
        incrementCounter('starmock_audio_upload_total', { status: 'replay' })
        return res.status(409).json({
          error: {
            message: 'This upload URL has already been used',
            code: 'UPLOAD_ALREADY_USED',
          },
        })
      } catch {
        // No existing file, continue.
      }

      await fs.writeFile(filePath, bodyBuffer)
      incrementCounter('starmock_audio_upload_total', { status: 'success' })

      return res.status(200).json({
        uploaded: true,
        objectKey,
        audioUrl: buildAudioUrl(objectKey),
        sizeBytes: bodyBuffer.length,
      })
    } catch (error) {
      console.error('Audio upload error:', error)
      incrementCounter('starmock_audio_upload_total', { status: 'error' })
      return res.status(500).json({
        error: {
          message: 'Failed to upload audio',
          code: 'AUDIO_UPLOAD_ERROR',
        },
      })
    }
  }
)

export default router
