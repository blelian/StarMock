const DEFAULT_FLAGS = {
  aiRecording: {
    envEnabledKey: 'FEATURE_AI_RECORDING_ENABLED',
    envRolloutKey: 'FEATURE_AI_RECORDING_ROLLOUT_PERCENT',
    defaultEnabled: true,
    defaultRolloutPercent: 100,
  },
  audioUploads: {
    envEnabledKey: 'FEATURE_AUDIO_UPLOADS_ENABLED',
    envRolloutKey: 'FEATURE_AUDIO_UPLOADS_ROLLOUT_PERCENT',
    defaultEnabled: true,
    defaultRolloutPercent: 100,
  },
  transcription: {
    envEnabledKey: 'FEATURE_TRANSCRIPTION_ENABLED',
    envRolloutKey: 'FEATURE_TRANSCRIPTION_ROLLOUT_PERCENT',
    defaultEnabled: true,
    defaultRolloutPercent: 100,
  },
  airQuestionGeneration: {
    envEnabledKey: 'FEATURE_AIR_QUESTION_GENERATION_ENABLED',
    envRolloutKey: 'FEATURE_AIR_QUESTION_GENERATION_ROLLOUT_PERCENT',
    defaultEnabled: false,
    defaultRolloutPercent: 0,
  },
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  const normalized = String(value).toLowerCase().trim()
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function parsePercent(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return Math.max(0, Math.min(100, parsed))
}

function stableBucket(seedValue) {
  const input = String(seedValue || 'anonymous')
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1000003
  }
  return Math.abs(hash % 100)
}

function readFlagConfig(flagName) {
  const config = DEFAULT_FLAGS[flagName]
  if (!config) {
    return {
      enabled: false,
      rolloutPercent: 0,
    }
  }

  return {
    enabled: parseBoolean(
      process.env[config.envEnabledKey],
      config.defaultEnabled
    ),
    rolloutPercent: parsePercent(
      process.env[config.envRolloutKey],
      config.defaultRolloutPercent
    ),
  }
}

export function isFeatureEnabled(flagName, { userId } = {}) {
  const config = readFlagConfig(flagName)
  if (!config.enabled) {
    return false
  }

  if (config.rolloutPercent >= 100) {
    return true
  }

  if (config.rolloutPercent <= 0) {
    return false
  }

  const bucket = stableBucket(userId || 'anonymous')
  return bucket < config.rolloutPercent
}

export function getFeatureFlagsForUser(userId) {
  return {
    aiRecording: isFeatureEnabled('aiRecording', { userId }),
    audioUploads: isFeatureEnabled('audioUploads', { userId }),
    transcription: isFeatureEnabled('transcription', { userId }),
    airQuestionGeneration: isFeatureEnabled('airQuestionGeneration', {
      userId,
    }),
    rollout: {
      aiRecording: readFlagConfig('aiRecording').rolloutPercent,
      audioUploads: readFlagConfig('audioUploads').rolloutPercent,
      transcription: readFlagConfig('transcription').rolloutPercent,
      airQuestionGeneration: readFlagConfig('airQuestionGeneration')
        .rolloutPercent,
    },
  }
}

export default {
  isFeatureEnabled,
  getFeatureFlagsForUser,
}
