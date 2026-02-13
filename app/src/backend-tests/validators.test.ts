// @vitest-environment node

import { describe, expect, it } from 'vitest'
import {
  validateAudioPresignRequest,
  validateCreateSessionRequest,
  validateLoginRequest,
  validateSignupRequest,
  validateSubmitResponseRequest,
} from '../validators/api.js'

describe('API validators', () => {
  it('validates signup payloads', () => {
    const invalid = validateSignupRequest({
      body: {
        email: 'bad-email',
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
      },
    } as any)

    expect(invalid.valid).toBe(false)
    expect(invalid.code).toBe('INVALID_EMAIL')

    const valid = validateSignupRequest({
      body: {
        email: 'user@example.com',
        password: 'StrongPassword123!',
        firstName: 'Test',
        lastName: 'User',
      },
    } as any)

    expect(valid).toEqual({ valid: true })
  })

  it('validates login payloads', () => {
    const missing = validateLoginRequest({ body: {} } as any)
    expect(missing.valid).toBe(false)
    expect(missing.code).toBe('MISSING_CREDENTIALS')

    const valid = validateLoginRequest({
      body: {
        email: 'user@example.com',
        password: 'StrongPassword123!',
      },
    } as any)

    expect(valid).toEqual({ valid: true })
  })

  it('validates create-session payloads', () => {
    const invalid = validateCreateSessionRequest({
      body: {
        questionIds: ['q-1', ''],
      },
    } as any)

    expect(invalid.valid).toBe(false)
    expect(invalid.code).toBe('INVALID_QUESTION_ID')

    const valid = validateCreateSessionRequest({
      body: {
        questionIds: ['q-1', 'q-2'],
      },
    } as any)

    expect(valid).toEqual({ valid: true })
  })

  it('validates submit-response payloads', () => {
    const tooShort = validateSubmitResponseRequest({
      body: {
        questionId: 'q-1',
        responseText: 'too short',
      },
    } as any)

    expect(tooShort.valid).toBe(false)
    expect(tooShort.code).toBe('RESPONSE_TOO_SHORT')

    const valid = validateSubmitResponseRequest({
      body: {
        questionId: 'q-1',
        responseText:
          'Situation: I led a launch with competing deadlines. Task: align teams. Action: I created milestones, resolved blockers, and tracked risk daily. Result: we shipped on schedule with fewer bugs.',
      },
    } as any)

    expect(valid).toEqual({ valid: true })
  })

  it('validates audio transcript response payloads', () => {
    const missingAudio = validateSubmitResponseRequest({
      body: {
        questionId: 'q-1',
        responseType: 'audio_transcript',
        responseText: '',
      },
    } as any)

    expect(missingAudio.valid).toBe(false)
    expect(missingAudio.code).toBe('MISSING_AUDIO_URL')

    const validAudio = validateSubmitResponseRequest({
      body: {
        questionId: 'q-1',
        responseType: 'audio_transcript',
        audioUrl: 'local-upload://audio-123.webm',
        responseText: 'This is an edited transcript with enough content.',
        transcriptConfidence: 0.67,
      },
    } as any)

    expect(validAudio).toEqual({ valid: true })
  })

  it('validates audio upload presign payloads', () => {
    const invalid = validateAudioPresignRequest({
      body: {
        sessionId: '',
        mimeType: 'text/plain',
        sizeBytes: -1,
      },
    } as any)

    expect(invalid.valid).toBe(false)
    expect(invalid.code).toBe('MISSING_SESSION_ID')

    const valid = validateAudioPresignRequest({
      body: {
        sessionId: 'session-1',
        mimeType: 'audio/webm',
        sizeBytes: 1024,
        durationSeconds: 9.3,
      },
    } as any)

    expect(valid).toEqual({ valid: true })
  })
})
