import {
  SUPPORTED_INDUSTRIES,
  SUPPORTED_SENIORITY_LEVELS,
} from '../config/airProfiles.js'

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value)
}

const ALLOWED_INDUSTRIES = new Set(SUPPORTED_INDUSTRIES)
const ALLOWED_SENIORITY_LEVELS = new Set(SUPPORTED_SENIORITY_LEVELS)

export function validateSignupRequest(req) {
  const { email, password, firstName, lastName } = req.body || {}

  if (!email || !password || !firstName || !lastName) {
    return {
      valid: false,
      message: 'All fields are required',
      code: 'MISSING_FIELDS',
      fields: { email, password, firstName, lastName },
    }
  }

  if (!isValidEmail(email)) {
    return {
      valid: false,
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
    }
  }

  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
      code: 'WEAK_PASSWORD',
    }
  }

  if (!isNonEmptyString(firstName) || !isNonEmptyString(lastName)) {
    return {
      valid: false,
      message: 'First and last name are required',
      code: 'INVALID_NAME',
    }
  }

  return { valid: true }
}

export function validateLoginRequest(req) {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return {
      valid: false,
      message: 'Email and password are required',
      code: 'MISSING_CREDENTIALS',
    }
  }

  if (!isValidEmail(email)) {
    return {
      valid: false,
      message: 'Invalid email format',
      code: 'INVALID_EMAIL',
    }
  }

  return { valid: true }
}

export function validateCareerProfileRequest(req) {
  const {
    targetJobTitle,
    industry,
    seniority,
    jobDescriptionText = '',
  } = req.body || {}

  const normalizedJobTitle =
    typeof targetJobTitle === 'string' ? targetJobTitle.trim() : ''
  const normalizedIndustry =
    typeof industry === 'string' ? industry.trim().toLowerCase() : ''
  const normalizedSeniority =
    typeof seniority === 'string' ? seniority.trim().toLowerCase() : ''

  if (!normalizedJobTitle) {
    return {
      valid: false,
      message: 'Target job title is required',
      code: 'MISSING_TARGET_JOB_TITLE',
    }
  }

  if (normalizedJobTitle.length > 120) {
    return {
      valid: false,
      message: 'Target job title must be 120 characters or fewer',
      code: 'INVALID_TARGET_JOB_TITLE',
    }
  }

  if (!normalizedIndustry) {
    return {
      valid: false,
      message: 'Industry is required',
      code: 'MISSING_INDUSTRY',
    }
  }

  if (!ALLOWED_INDUSTRIES.has(normalizedIndustry)) {
    return {
      valid: false,
      message: 'Industry is not supported',
      code: 'INVALID_INDUSTRY',
    }
  }

  if (!normalizedSeniority) {
    return {
      valid: false,
      message: 'Seniority is required',
      code: 'MISSING_SENIORITY',
    }
  }

  if (!ALLOWED_SENIORITY_LEVELS.has(normalizedSeniority)) {
    return {
      valid: false,
      message: 'Seniority level is not supported',
      code: 'INVALID_SENIORITY',
    }
  }

  if (
    typeof jobDescriptionText !== 'string' ||
    jobDescriptionText.trim().length > 3000
  ) {
    return {
      valid: false,
      message: 'Job description must be a string of at most 3000 characters',
      code: 'INVALID_JOB_DESCRIPTION',
    }
  }

  return { valid: true }
}

export function validateCreateSessionRequest(req) {
  const { questionIds, airMode, airContext } = req.body || {}

  if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
    return {
      valid: false,
      message: 'Question IDs are required',
      code: 'MISSING_QUESTIONS',
    }
  }

  const hasInvalidId = questionIds.some((id) => !isNonEmptyString(id))
  if (hasInvalidId) {
    return {
      valid: false,
      message: 'Each question ID must be a valid string',
      code: 'INVALID_QUESTION_ID',
    }
  }

  if (airMode !== undefined && typeof airMode !== 'boolean') {
    return {
      valid: false,
      message: 'airMode must be a boolean value when provided',
      code: 'INVALID_AIR_MODE',
    }
  }

  if (
    airContext !== undefined &&
    (!airContext || typeof airContext !== 'object')
  ) {
    return {
      valid: false,
      message: 'airContext must be an object when provided',
      code: 'INVALID_AIR_CONTEXT',
    }
  }

  if (airMode === true) {
    if (!airContext || typeof airContext !== 'object') {
      return {
        valid: false,
        message: 'airContext is required when airMode is enabled',
        code: 'MISSING_AIR_CONTEXT',
      }
    }

    const profileValidation = validateCareerProfileRequest({
      body: airContext,
    })
    if (!profileValidation.valid) {
      return {
        valid: false,
        message: profileValidation.message,
        code: profileValidation.code,
      }
    }
  }

  return { valid: true }
}

export function validateSubmitResponseRequest(req) {
  const {
    questionId,
    responseText,
    responseType = 'text',
    audioUrl,
    audioMimeType,
    audioSizeBytes,
    audioDurationSeconds,
    transcriptConfidence,
  } = req.body || {}

  if (!isNonEmptyString(questionId)) {
    return {
      valid: false,
      message: 'Question ID is required',
      code: 'MISSING_QUESTION_ID',
    }
  }

  if (!['text', 'audio_transcript'].includes(responseType)) {
    return {
      valid: false,
      message: 'Response type must be text or audio_transcript',
      code: 'INVALID_RESPONSE_TYPE',
    }
  }

  const normalizedText =
    typeof responseText === 'string' ? responseText.trim() : ''

  if (responseType === 'text') {
    if (!isNonEmptyString(normalizedText)) {
      return {
        valid: false,
        message: 'Response text is required for text submissions',
        code: 'MISSING_RESPONSE_TEXT',
      }
    }

    if (normalizedText.length < 50) {
      return {
        valid: false,
        message: 'Response must be at least 50 characters',
        code: 'RESPONSE_TOO_SHORT',
      }
    }

    if (isNonEmptyString(audioUrl)) {
      return {
        valid: false,
        message: 'Audio URL cannot be provided for text responses',
        code: 'INVALID_AUDIO_FOR_TEXT',
      }
    }
  }

  if (responseType === 'audio_transcript') {
    if (!isNonEmptyString(audioUrl)) {
      return {
        valid: false,
        message: 'Audio URL is required for audio transcript responses',
        code: 'MISSING_AUDIO_URL',
      }
    }

    if (normalizedText.length > 0 && normalizedText.length < 20) {
      return {
        valid: false,
        message: 'Transcript text must be at least 20 characters when provided',
        code: 'TRANSCRIPT_TOO_SHORT',
      }
    }

    if (
      audioMimeType !== undefined &&
      (!isNonEmptyString(audioMimeType) || !audioMimeType.startsWith('audio/'))
    ) {
      return {
        valid: false,
        message: 'Audio MIME type must be a valid audio/* value',
        code: 'INVALID_AUDIO_MIME',
      }
    }

    if (
      audioSizeBytes !== undefined &&
      (!Number.isFinite(audioSizeBytes) || audioSizeBytes <= 0)
    ) {
      return {
        valid: false,
        message: 'Audio size must be a positive number of bytes',
        code: 'INVALID_AUDIO_SIZE',
      }
    }

    if (
      audioDurationSeconds !== undefined &&
      (!Number.isFinite(audioDurationSeconds) || audioDurationSeconds <= 0)
    ) {
      return {
        valid: false,
        message: 'Audio duration must be a positive number in seconds',
        code: 'INVALID_AUDIO_DURATION',
      }
    }

    if (
      transcriptConfidence !== undefined &&
      (!Number.isFinite(transcriptConfidence) ||
        transcriptConfidence < 0 ||
        transcriptConfidence > 1)
    ) {
      return {
        valid: false,
        message: 'Transcript confidence must be between 0 and 1',
        code: 'INVALID_TRANSCRIPT_CONFIDENCE',
      }
    }
  }

  return { valid: true }
}

export function validateAudioPresignRequest(req) {
  const {
    sessionId,
    mimeType,
    sizeBytes,
    durationSeconds,
    responseId,
    responseType = 'audio_transcript',
  } = req.body || {}

  if (!isNonEmptyString(sessionId)) {
    return {
      valid: false,
      message: 'Session ID is required',
      code: 'MISSING_SESSION_ID',
    }
  }

  if (!isNonEmptyString(mimeType) || !mimeType.startsWith('audio/')) {
    return {
      valid: false,
      message: 'mimeType must be a valid audio/* value',
      code: 'INVALID_AUDIO_MIME',
    }
  }

  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return {
      valid: false,
      message: 'sizeBytes must be a positive number',
      code: 'INVALID_AUDIO_SIZE',
    }
  }

  if (
    durationSeconds !== undefined &&
    (!Number.isFinite(durationSeconds) || durationSeconds <= 0)
  ) {
    return {
      valid: false,
      message: 'durationSeconds must be a positive number',
      code: 'INVALID_AUDIO_DURATION',
    }
  }

  if (
    responseId !== undefined &&
    !(typeof responseId === 'string' && responseId.trim().length > 0)
  ) {
    return {
      valid: false,
      message: 'responseId must be a non-empty string when provided',
      code: 'INVALID_RESPONSE_ID',
    }
  }

  if (!['audio_transcript'].includes(responseType)) {
    return {
      valid: false,
      message: 'responseType must be audio_transcript',
      code: 'INVALID_RESPONSE_TYPE',
    }
  }

  return { valid: true }
}

export default {
  validateSignupRequest,
  validateLoginRequest,
  validateCreateSessionRequest,
  validateSubmitResponseRequest,
  validateAudioPresignRequest,
}
