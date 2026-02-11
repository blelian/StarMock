function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(value)
}

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

export function validateCreateSessionRequest(req) {
  const { questionIds } = req.body || {}

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

  return { valid: true }
}

export function validateSubmitResponseRequest(req) {
  const { questionId, responseText } = req.body || {}

  if (!isNonEmptyString(questionId) || !isNonEmptyString(responseText)) {
    return {
      valid: false,
      message: 'Question ID and response text are required',
      code: 'MISSING_FIELDS',
    }
  }

  if (responseText.trim().length < 50) {
    return {
      valid: false,
      message: 'Response must be at least 50 characters',
      code: 'RESPONSE_TOO_SHORT',
    }
  }

  return { valid: true }
}

export default {
  validateSignupRequest,
  validateLoginRequest,
  validateCreateSessionRequest,
  validateSubmitResponseRequest,
}
