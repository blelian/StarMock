// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'
import {
  getFeatureFlagsForUser,
  isFeatureEnabled,
} from '../config/featureFlags.js'

const featureEnvKeys = [
  'FEATURE_AI_RECORDING_ENABLED',
  'FEATURE_AI_RECORDING_ROLLOUT_PERCENT',
  'FEATURE_AUDIO_UPLOADS_ENABLED',
  'FEATURE_AUDIO_UPLOADS_ROLLOUT_PERCENT',
  'FEATURE_TRANSCRIPTION_ENABLED',
  'FEATURE_TRANSCRIPTION_ROLLOUT_PERCENT',
  'FEATURE_AIR_QUESTION_GENERATION_ENABLED',
  'FEATURE_AIR_QUESTION_GENERATION_ROLLOUT_PERCENT',
]

afterEach(() => {
  for (const key of featureEnvKeys) {
    delete process.env[key]
  }
})

describe('feature flag evaluation', () => {
  it('disables feature when env flag is off', () => {
    process.env.FEATURE_AI_RECORDING_ENABLED = 'false'
    expect(isFeatureEnabled('aiRecording', { userId: 'user-1' })).toBe(false)
  })

  it('supports rollout percentage by stable user bucket', () => {
    process.env.FEATURE_AI_RECORDING_ENABLED = 'true'
    process.env.FEATURE_AI_RECORDING_ROLLOUT_PERCENT = '0'
    expect(isFeatureEnabled('aiRecording', { userId: 'user-2' })).toBe(false)

    process.env.FEATURE_AI_RECORDING_ROLLOUT_PERCENT = '100'
    expect(isFeatureEnabled('aiRecording', { userId: 'user-2' })).toBe(true)
  })

  it('returns flag snapshot with rollout settings', () => {
    process.env.FEATURE_AUDIO_UPLOADS_ENABLED = 'true'
    process.env.FEATURE_AUDIO_UPLOADS_ROLLOUT_PERCENT = '45'
    process.env.FEATURE_AIR_QUESTION_GENERATION_ENABLED = 'true'
    process.env.FEATURE_AIR_QUESTION_GENERATION_ROLLOUT_PERCENT = '25'

    const snapshot = getFeatureFlagsForUser('user-3')
    expect(snapshot).toHaveProperty('audioUploads')
    expect(snapshot).toHaveProperty('airQuestionGeneration')
    expect(snapshot.rollout.audioUploads).toBe(45)
    expect(snapshot.rollout.airQuestionGeneration).toBe(25)
  })
})
