export const AIR_CONTEXT_VERSION = 'air-context.v2'

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
  'energy',
  'legal',
  'nonprofit',
  'real-estate',
  'transportation',
  'hospitality',
  'agriculture',
  'pharmaceutical',
  'telecommunications',
  'aerospace',
  'construction',
  'other',
]

export const SUPPORTED_SENIORITY_LEVELS = [
  'intern',
  'entry',
  'mid',
  'senior',
  'lead',
  'director',
  'executive',
]

// ---------------------------------------------------------------------------
// Competency Framework — inspired by SHRM BoCK, Amazon Leadership Principles,
// Google hiring dimensions, and common industry rubrics.
// Each role maps to a set of competencies that interviewers actually assess.
// ---------------------------------------------------------------------------

const ROLE_CATALOG = [
  // ── Engineering & Technical ──────────────────────────────────────
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
      'sde',
      'web developer',
    ],
    competencies: [
      'problem-solving',
      'technical-depth',
      'system-design',
      'ownership',
      'communication',
      'bias-for-action',
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
      'ui developer',
    ],
    competencies: [
      'ui-implementation',
      'accessibility',
      'performance-optimization',
      'customer-obsession',
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
      'server engineer',
    ],
    competencies: [
      'api-design',
      'distributed-systems',
      'reliability',
      'problem-solving',
      'ownership',
    ],
  },
  {
    id: 'devops_engineer',
    label: 'DevOps Engineer',
    aliases: [
      'devops engineer',
      'site reliability engineer',
      'sre',
      'infrastructure engineer',
      'cloud engineer',
      'platform engineer',
      'systems engineer',
    ],
    competencies: [
      'automation',
      'reliability',
      'incident-management',
      'system-design',
      'problem-solving',
      'bias-for-action',
    ],
  },
  {
    id: 'qa_engineer',
    label: 'QA Engineer',
    aliases: [
      'qa engineer',
      'quality assurance engineer',
      'test engineer',
      'sdet',
      'software tester',
      'automation tester',
    ],
    competencies: [
      'attention-to-detail',
      'analytical-thinking',
      'test-strategy',
      'communication',
      'process-improvement',
    ],
  },
  {
    id: 'mobile_developer',
    label: 'Mobile Developer',
    aliases: [
      'mobile developer',
      'mobile engineer',
      'ios developer',
      'android developer',
      'flutter developer',
      'react native developer',
    ],
    competencies: [
      'mobile-architecture',
      'performance-optimization',
      'customer-obsession',
      'problem-solving',
      'communication',
    ],
  },
  {
    id: 'ml_engineer',
    label: 'Machine Learning Engineer',
    aliases: [
      'machine learning engineer',
      'ml engineer',
      'ai engineer',
      'deep learning engineer',
    ],
    competencies: [
      'modeling',
      'experimentation',
      'system-design',
      'technical-depth',
      'communication',
    ],
  },
  {
    id: 'security_engineer',
    label: 'Security Engineer',
    aliases: [
      'security engineer',
      'cybersecurity engineer',
      'information security analyst',
      'appsec engineer',
      'security analyst',
    ],
    competencies: [
      'risk-assessment',
      'attention-to-detail',
      'technical-depth',
      'compliance-awareness',
      'communication',
    ],
  },
  // ── Data ─────────────────────────────────────────────────────────
  {
    id: 'data_analyst',
    label: 'Data Analyst',
    aliases: [
      'data analyst',
      'business intelligence analyst',
      'bi analyst',
      'analytics analyst',
      'reporting analyst',
    ],
    competencies: [
      'analytics',
      'stakeholder-communication',
      'problem-solving',
      'insight-generation',
      'attention-to-detail',
    ],
  },
  {
    id: 'data_scientist',
    label: 'Data Scientist',
    aliases: [
      'data scientist',
      'ml scientist',
      'machine learning scientist',
      'research scientist',
      'applied scientist',
    ],
    competencies: [
      'modeling',
      'experimentation',
      'statistics',
      'communication',
      'critical-thinking',
    ],
  },
  {
    id: 'data_engineer',
    label: 'Data Engineer',
    aliases: [
      'data engineer',
      'etl developer',
      'data platform engineer',
      'analytics engineer',
    ],
    competencies: [
      'data-modeling',
      'system-design',
      'reliability',
      'problem-solving',
      'ownership',
    ],
  },
  // ── Product & Design ─────────────────────────────────────────────
  {
    id: 'product_manager',
    label: 'Product Manager',
    aliases: [
      'product manager',
      'pm',
      'technical product manager',
      'product owner',
      'associate product manager',
      'apm',
    ],
    competencies: [
      'prioritization',
      'stakeholder-management',
      'customer-obsession',
      'execution',
      'communication',
      'strategic-thinking',
    ],
  },
  {
    id: 'ux_designer',
    label: 'UX Designer',
    aliases: [
      'ux designer',
      'ui ux designer',
      'product designer',
      'interaction designer',
      'user experience designer',
      'visual designer',
    ],
    competencies: [
      'user-research',
      'design-thinking',
      'communication',
      'customer-obsession',
      'collaboration',
    ],
  },
  {
    id: 'ux_researcher',
    label: 'UX Researcher',
    aliases: ['ux researcher', 'user researcher', 'design researcher'],
    competencies: [
      'user-research',
      'analytical-thinking',
      'communication',
      'insight-generation',
      'critical-thinking',
    ],
  },
  // ── Management & Leadership ──────────────────────────────────────
  {
    id: 'project_manager',
    label: 'Project Manager',
    aliases: [
      'project manager',
      'program manager',
      'delivery manager',
      'scrum master',
      'agile coach',
    ],
    competencies: [
      'planning',
      'risk-management',
      'execution',
      'leadership',
      'stakeholder-management',
    ],
  },
  {
    id: 'engineering_manager',
    label: 'Engineering Manager',
    aliases: [
      'engineering manager',
      'software engineering manager',
      'dev manager',
      'development manager',
      'tech lead manager',
    ],
    competencies: [
      'people-management',
      'technical-depth',
      'hiring',
      'strategic-thinking',
      'ownership',
      'communication',
    ],
  },
  // ── Business & Operations ────────────────────────────────────────
  {
    id: 'business_analyst',
    label: 'Business Analyst',
    aliases: [
      'business analyst',
      'systems analyst',
      'process analyst',
      'business systems analyst',
    ],
    competencies: [
      'requirements-analysis',
      'communication',
      'process-improvement',
      'problem-solving',
      'critical-thinking',
    ],
  },
  {
    id: 'marketing_manager',
    label: 'Marketing Manager',
    aliases: [
      'marketing manager',
      'digital marketing manager',
      'growth marketer',
      'marketing specialist',
      'brand manager',
      'content strategist',
    ],
    competencies: [
      'strategic-thinking',
      'analytics',
      'communication',
      'customer-obsession',
      'execution',
    ],
  },
  {
    id: 'sales_representative',
    label: 'Sales Representative',
    aliases: [
      'sales representative',
      'account executive',
      'sales engineer',
      'business development representative',
      'bdr',
      'sdr',
      'sales manager',
    ],
    competencies: [
      'customer-obsession',
      'negotiation',
      'communication',
      'execution',
      'resilience',
    ],
  },
  {
    id: 'hr_specialist',
    label: 'HR Specialist',
    aliases: [
      'hr specialist',
      'human resources specialist',
      'hr generalist',
      'people operations',
      'talent acquisition',
      'recruiter',
      'hr manager',
    ],
    competencies: [
      'communication',
      'ethical-practice',
      'relationship-management',
      'compliance-awareness',
      'critical-thinking',
    ],
  },
  {
    id: 'financial_analyst',
    label: 'Financial Analyst',
    aliases: [
      'financial analyst',
      'finance analyst',
      'investment analyst',
      'fp&a analyst',
      'accountant',
      'auditor',
    ],
    competencies: [
      'analytics',
      'attention-to-detail',
      'risk-assessment',
      'communication',
      'critical-thinking',
    ],
  },
  {
    id: 'operations_manager',
    label: 'Operations Manager',
    aliases: [
      'operations manager',
      'operations analyst',
      'supply chain manager',
      'logistics manager',
      'warehouse manager',
    ],
    competencies: [
      'process-improvement',
      'execution',
      'planning',
      'leadership',
      'problem-solving',
    ],
  },
  {
    id: 'customer_success',
    label: 'Customer Success Manager',
    aliases: [
      'customer success manager',
      'csm',
      'customer support manager',
      'client success',
      'account manager',
    ],
    competencies: [
      'customer-obsession',
      'relationship-management',
      'communication',
      'problem-solving',
      'execution',
    ],
  },
  {
    id: 'consultant',
    label: 'Consultant',
    aliases: [
      'consultant',
      'management consultant',
      'strategy consultant',
      'it consultant',
      'advisory',
    ],
    competencies: [
      'problem-solving',
      'stakeholder-management',
      'communication',
      'analytical-thinking',
      'strategic-thinking',
    ],
  },
  {
    id: 'teacher',
    label: 'Teacher / Educator',
    aliases: [
      'teacher',
      'educator',
      'instructor',
      'professor',
      'tutor',
      'academic',
      'lecturer',
    ],
    competencies: [
      'communication',
      'coaching',
      'adaptability',
      'planning',
      'critical-thinking',
    ],
  },
  {
    id: 'nurse',
    label: 'Nurse',
    aliases: [
      'nurse',
      'registered nurse',
      'rn',
      'nurse practitioner',
      'clinical nurse',
      'lpn',
    ],
    competencies: [
      'patient-care',
      'communication',
      'attention-to-detail',
      'adaptability',
      'ethical-practice',
    ],
  },
  {
    id: 'lawyer',
    label: 'Lawyer / Attorney',
    aliases: [
      'lawyer',
      'attorney',
      'legal counsel',
      'paralegal',
      'associate attorney',
      'corporate counsel',
    ],
    competencies: [
      'analytical-thinking',
      'communication',
      'attention-to-detail',
      'negotiation',
      'ethical-practice',
    ],
  },
]

const INDUSTRY_COMPETENCIES = {
  technology: ['technical-depth', 'adaptability', 'bias-for-action'],
  finance: ['accuracy', 'risk-awareness', 'compliance-awareness'],
  healthcare: ['safety-mindset', 'compliance-awareness', 'ethical-practice'],
  education: ['communication', 'coaching', 'adaptability'],
  retail: ['customer-focus', 'execution', 'adaptability'],
  manufacturing: [
    'process-improvement',
    'quality-focus',
    'attention-to-detail',
  ],
  government: ['policy-awareness', 'accountability', 'ethical-practice'],
  consulting: [
    'stakeholder-management',
    'problem-solving',
    'strategic-thinking',
  ],
  media: ['storytelling', 'agility', 'communication'],
  energy: ['safety-mindset', 'compliance-awareness', 'problem-solving'],
  legal: ['analytical-thinking', 'attention-to-detail', 'ethical-practice'],
  nonprofit: ['communication', 'stakeholder-management', 'adaptability'],
  'real-estate': ['negotiation', 'customer-obsession', 'communication'],
  transportation: ['planning', 'risk-assessment', 'execution'],
  hospitality: ['customer-obsession', 'adaptability', 'communication'],
  agriculture: ['problem-solving', 'planning', 'adaptability'],
  pharmaceutical: [
    'compliance-awareness',
    'attention-to-detail',
    'critical-thinking',
  ],
  telecommunications: [
    'technical-depth',
    'customer-obsession',
    'problem-solving',
  ],
  aerospace: ['technical-depth', 'attention-to-detail', 'safety-mindset'],
  construction: ['planning', 'risk-assessment', 'execution'],
  other: ['communication', 'execution', 'problem-solving'],
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
    if (
      normalizedAlias.includes(normalizedTitle) &&
      normalizedTitle.length > 3
    ) {
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
  return (
    INDUSTRY_COMPETENCIES[normalizedIndustry] || INDUSTRY_COMPETENCIES.other
  )
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
