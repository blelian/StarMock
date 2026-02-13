import fs from 'fs/promises'
import path from 'path'

const OPENAI_BASE_URL = (
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
).replace(/\/+$/, '')

const DEFAULT_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1'
const DEFAULT_TIMEOUT_MS = Number(
  process.env.OPENAI_TRANSCRIPTION_TIMEOUT_MS || 60000
)

function resolveUploadPath(audioUrl) {
  if (typeof audioUrl !== 'string' || !audioUrl.startsWith('local-upload://')) {
    return null
  }
  const objectKey = audioUrl.replace('local-upload://', '').trim()
  if (!objectKey) {
    return null
  }
  const storageDir =
    process.env.UPLOAD_STORAGE_DIR ||
    path.join(process.cwd(), 'tmp', 'audio-uploads')
  return path.join(storageDir, objectKey)
}

function mimeToExtension(mimeType) {
  const map = {
    'audio/webm': '.webm',
    'audio/webm;codecs=opus': '.webm',
    'audio/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/flac': '.flac',
  }
  return map[(mimeType || '').toLowerCase().split(';')[0].trim()] || '.webm'
}

/**
 * Call OpenAI Whisper API to transcribe an audio file.
 *
 * @param {Object}  opts
 * @param {Buffer}  opts.audioBuffer  – raw bytes of the audio file
 * @param {string}  opts.fileName     – filename to send (e.g. "recording.webm")
 * @param {string}  opts.apiKey       – OpenAI API key
 * @param {string} [opts.model]       – Whisper model id
 * @param {string} [opts.language]    – ISO-639-1 language hint (e.g. "en")
 * @returns {Promise<{text: string, segments: Array, language: string, duration: number}>}
 */
async function callWhisperAPI({
  audioBuffer,
  fileName,
  apiKey,
  model = DEFAULT_MODEL,
  language,
}) {
  const mimeType = fileName.endsWith('.mp3')
    ? 'audio/mpeg'
    : fileName.endsWith('.mp4')
      ? 'audio/mp4'
      : fileName.endsWith('.ogg')
        ? 'audio/ogg'
        : fileName.endsWith('.wav')
          ? 'audio/wav'
          : fileName.endsWith('.flac')
            ? 'audio/flac'
            : 'audio/webm'

  const blob = new Blob([audioBuffer], { type: mimeType })
  const formData = new FormData()
  formData.append('file', blob, fileName)
  formData.append('model', model)
  formData.append('response_format', 'verbose_json')
  formData.append('timestamp_granularities[]', 'segment')
  if (language) {
    formData.append('language', language)
  }

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `OpenAI Whisper request failed (${response.status}): ${errorBody}`
      )
    }

    return await response.json()
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        `OpenAI Whisper request timed out after ${DEFAULT_TIMEOUT_MS}ms`
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}

/**
 * Transcription provider implementation for OpenAI Whisper.
 * Matches the same interface as mockTranscribe:
 *
 * @param {{ response: Object, audioUrl: string }} opts
 * @returns {Promise<{transcriptText: string, confidence: number, segments: Array, provider: string}>}
 */
export async function openAITranscribe({ response, audioUrl }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured — cannot run Whisper transcription'
    )
  }

  const audioPath = resolveUploadPath(audioUrl)
  if (!audioPath) {
    throw new Error(
      `Cannot resolve audio file path from URL: ${audioUrl || '(empty)'}`
    )
  }

  let audioBuffer
  try {
    audioBuffer = await fs.readFile(audioPath)
  } catch (err) {
    throw new Error(`Cannot read audio file at ${audioPath}: ${err.message}`)
  }

  if (audioBuffer.length === 0) {
    throw new Error('Audio file is empty — nothing to transcribe')
  }

  const mimeType = response.audioMimeType || 'audio/webm'
  const ext = mimeToExtension(mimeType)
  const fileName = `recording${ext}`

  const whisperResult = await callWhisperAPI({
    audioBuffer,
    fileName,
    apiKey,
    language: 'en',
  })

  const transcriptText =
    typeof whisperResult.text === 'string' ? whisperResult.text.trim() : ''

  if (!transcriptText) {
    throw new Error('Whisper returned an empty transcript')
  }

  const durationMs = whisperResult.duration
    ? Math.round(whisperResult.duration * 1000)
    : Math.max(1000, Math.round((response.audioDurationSeconds || 10) * 1000))

  const segments = Array.isArray(whisperResult.segments)
    ? whisperResult.segments.map((seg) => ({
        startMs: Math.round((seg.start || 0) * 1000),
        endMs: Math.round((seg.end || 0) * 1000),
        text: (seg.text || '').trim(),
        confidence: seg.avg_logprob
          ? Math.min(1, Math.max(0, 1 + seg.avg_logprob))
          : 0.85,
      }))
    : [
        {
          startMs: 0,
          endMs: durationMs,
          text: transcriptText,
          confidence: 0.85,
        },
      ]

  // Derive overall confidence from segment-level avg_logprob values.
  // Whisper avg_logprob is typically between -1.0 (low) and 0.0 (high).
  // We normalise to 0-1 with: confidence = clamp(1 + avg_logprob, 0, 1).
  const segConfidences = segments
    .filter((s) => typeof s.confidence === 'number')
    .map((s) => s.confidence)

  const confidence =
    segConfidences.length > 0
      ? Math.round(
          (segConfidences.reduce((a, b) => a + b, 0) / segConfidences.length) *
            100
        ) / 100
      : 0.85

  return {
    transcriptText,
    confidence,
    segments,
    provider: 'openai',
  }
}

export const openAITranscriptionProvider = {
  transcribe: openAITranscribe,
}

export default openAITranscriptionProvider
