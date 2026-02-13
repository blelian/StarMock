import {
  AIR_CONTEXT_VERSION,
  getIndustryCompetencies,
  normalizeIndustry,
  normalizeSeniority,
  resolveRoleFromJobTitle,
} from '../../config/airProfiles.js'

function normalizeText(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

export function resolveAirContext(input = {}) {
  const targetJobTitle = normalizeText(input.targetJobTitle)
  const industry = normalizeIndustry(input.industry)
  const seniority = normalizeSeniority(input.seniority)
  const jobDescriptionText = normalizeText(input.jobDescriptionText)
  const role = resolveRoleFromJobTitle(targetJobTitle)
  const competencies = unique([
    ...(role.competencies || []),
    ...getIndustryCompetencies(industry),
  ])

  return {
    version: AIR_CONTEXT_VERSION,
    targetJobTitle,
    industry,
    seniority,
    jobDescriptionText,
    role: {
      id: role.id,
      label: role.label,
      source: role.source,
      confidence: role.confidence,
    },
    competencies,
    contextKey: `${industry}:${seniority}:${role.id}`,
  }
}

export default {
  resolveAirContext,
}
