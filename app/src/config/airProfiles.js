export const AIR_CONTEXT_VERSION = 'air-context.v1'

export const SUPPORTED_INDUSTRIES = [
  'technology',
  'finance',
  'healthcare',
  'education',
  'retail',
  'manufacturing',
  'government',
  'consulting',
  'media',
  'other',
]

export const SUPPORTED_SENIORITY_LEVELS = ['entry', 'mid', 'senior']

const ROLE_CATALOG = [
  {
    id: 'software_engineer',
    label: 'Software Engineer',
    aliases: [
      'software engineer',
      'software developer',
      'full stack developer',
      'full stack engineer',
      'application engineer',
      'developer',
    ],
    competencies: [
      'problem-solving',
      'technical-depth',
      'system-design',
      'communication',
    ],
  },
  {
    id: 'frontend_developer',
    label: 'Frontend Developer',
    aliases: [
      'frontend developer',
      'front-end developer',
      'frontend engineer',
      'front-end engineer',
      'ui engineer',
    ],
    competencies: [
      'ui-implementation',
      'accessibility',
      'performance-optimization',
      'communication',
    ],
  },
  {
    id: 'backend_developer',
    label: 'Backend Developer',
    aliases: [
      'backend developer',
      'back-end developer',
      'backend engineer',
      'back-end engineer',
      'api engineer',
      'platform engineer',
    ],
    competencies: [
      'api-design',
      'distributed-systems',
      'reliability',
      'problem-solving',
    ],
  },
  {
    id: 'data_analyst',
    label: 'Data Analyst',
    aliases: ['data analyst', 'business intelligence analyst', 'bi analyst'],
    competencies: [
      'analytics',
      'stakeholder-communication',
      'problem-solving',
      'insight-generation',
    ],
  },
  {
    id: 'data_scientist',
    label: 'Data Scientist',
    aliases: ['data scientist', 'ml scientist', 'machine learning scientist'],
    competencies: [
      'modeling',
      'experimentation',
      'statistics',
      'communication',
    ],
  },
  {
    id: 'product_manager',
    label: 'Product Manager',
    aliases: ['product manager', 'pm', 'technical product manager'],
    competencies: [
      'prioritization',
      'stakeholder-management',
      'execution',
      'communication',
    ],
  },
  {
    id: 'project_manager',
    label: 'Project Manager',
    aliases: ['project manager', 'program manager', 'delivery manager'],
    competencies: ['planning', 'risk-management', 'execution', 'leadership'],
  },
  {
    id: 'business_analyst',
    label: 'Business Analyst',
    aliases: ['business analyst', 'systems analyst', 'process analyst'],
    competencies: [
      'requirements-analysis',
      'communication',
      'process-improvement',
      'problem-solving',
    ],
  },
]

const INDUSTRY_COMPETENCIES = {
  technology: ['technical-depth', 'adaptability'],
  finance: ['accuracy', 'risk-awareness'],
  healthcare: ['safety-mindset', 'compliance-awareness'],
  education: ['communication', 'coaching'],
  retail: ['customer-focus', 'execution'],
  manufacturing: ['process-improvement', 'quality-focus'],
  government: ['policy-awareness', 'accountability'],
  consulting: ['stakeholder-management', 'problem-solving'],
  media: ['storytelling', 'agility'],
  other: ['communication', 'execution'],
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function isSupportedIndustry(industry) {
  return SUPPORTED_INDUSTRIES.includes(normalizeText(industry))
}

export function isSupportedSeniority(seniority) {
  return SUPPORTED_SENIORITY_LEVELS.includes(normalizeText(seniority))
}

export function getAirRoleCatalog() {
  return ROLE_CATALOG.map((role) => ({
    id: role.id,
    label: role.label,
    aliases: [...role.aliases],
    competencies: [...role.competencies],
  }))
}

function scoreRoleMatch(normalizedTitle, role) {
  let bestScore = 0

  for (const alias of role.aliases) {
    const normalizedAlias = normalizeText(alias)
    if (!normalizedAlias) continue
    if (normalizedTitle === normalizedAlias) {
      bestScore = Math.max(bestScore, 100)
      continue
    }
    if (normalizedTitle.includes(normalizedAlias)) {
      bestScore = Math.max(bestScore, 80)
      continue
    }
    if (normalizedAlias.includes(normalizedTitle) && normalizedTitle.length > 3) {
      bestScore = Math.max(bestScore, 70)
    }
  }

  return bestScore
}

export function resolveRoleFromJobTitle(targetJobTitle) {
  const normalizedTitle = normalizeText(targetJobTitle)
  if (!normalizedTitle) {
    return {
      id: 'custom_role',
      label: 'Custom Role',
      source: 'custom',
      confidence: 'low',
      competencies: ['communication', 'problem-solving', 'execution'],
    }
  }

  const bestMatch = ROLE_CATALOG.map((role) => ({
    role,
    score: scoreRoleMatch(normalizedTitle, role),
  })).sort((a, b) => b.score - a.score)[0]

  if (!bestMatch || bestMatch.score < 70) {
    return {
      id: 'custom_role',
      label: targetJobTitle.trim(),
      source: 'custom',
      confidence: 'low',
      competencies: ['communication', 'problem-solving', 'execution'],
    }
  }

  return {
    id: bestMatch.role.id,
    label: bestMatch.role.label,
    source: 'catalog',
    confidence: bestMatch.score >= 100 ? 'high' : 'medium',
    competencies: [...bestMatch.role.competencies],
  }
}

export function getIndustryCompetencies(industry) {
  const normalizedIndustry = normalizeText(industry)
  return INDUSTRY_COMPETENCIES[normalizedIndustry] || INDUSTRY_COMPETENCIES.other
}

export function normalizeIndustry(industry) {
  const normalizedIndustry = normalizeText(industry)
  if (!isSupportedIndustry(normalizedIndustry)) {
    return 'other'
  }
  return normalizedIndustry
}

export function normalizeSeniority(seniority) {
  const normalizedSeniority = normalizeText(seniority)
  if (!isSupportedSeniority(normalizedSeniority)) {
    return 'mid'
  }
  return normalizedSeniority
}

export default {
  AIR_CONTEXT_VERSION,
  SUPPORTED_INDUSTRIES,
  SUPPORTED_SENIORITY_LEVELS,
  getAirRoleCatalog,
  isSupportedIndustry,
  isSupportedSeniority,
  resolveRoleFromJobTitle,
  getIndustryCompetencies,
  normalizeIndustry,
  normalizeSeniority,
}
