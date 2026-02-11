export function validateRequest(validator) {
  return (req, res, next) => {
    const result = validator(req)

    if (result.valid) {
      return next()
    }

    return res.status(result.status || 400).json({
      error: {
        message: result.message || 'Invalid request payload',
        code: result.code || 'VALIDATION_ERROR',
        ...(result.fields ? { fields: result.fields } : {}),
      },
    })
  }
}

export default {
  validateRequest,
}
