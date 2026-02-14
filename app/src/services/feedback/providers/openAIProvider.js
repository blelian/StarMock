const PROVIDER_ID = 'ai_model'
const DEFAULT_MODEL = process.env.OPENAI_FEEDBACK_MODEL || 'gpt-4o-mini'
const DEFAULT_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000)
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || 'star-eval.v1'
const OPENAI_BASE_URL = (
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
).replace(/\/+$/, '')
const INDUSTRY_REVIEW_LENSES = {
  technology: 'system reliability, scalability tradeoffs, and engineering rigor',
  finance: 'risk controls, compliance rigor, and auditability',
  healthcare: 'patient safety, privacy obligations, and cross-team coordination',
  education: 'learner outcomes, accessibility, and instructional effectiveness',
  retail: 'customer impact, operations quality, and execution under demand spikes',
  manufacturing: 'process discipline, quality control, and operational resilience',
  government: 'policy alignment, public accountability, and stakeholder trust',
  consulting: 'client impact, stakeholder alignment, and structured analysis',
  media: 'audience impact, editorial judgment, and delivery velocity',
  other: 'domain-specific constraints, stakeholder impact, and measurable outcomes',
}
const SENIORITY_REVIEW_EXPECTATIONS = {
  entry: 'foundational execution and learning agility',
  mid: 'independent ownership and cross-functional delivery',
  senior: 'strategic judgment, leadership, and complex decision-making',
}

function getQuestionText(question) {
  if (!question) return ''
  if (typeof question === 'string') return question
  return (
    question.questionText ||
    question.description ||
    question.title ||
    question.prompt ||
    ''
  )
}

function clampScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function toOptionalScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function normalizeCompetencyKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

function normalizeCompetencyScores(rawScores, allowedCompetencies = []) {
  if (!rawScores || typeof rawScores !== 'object') {
    return {}
  }

  const allowedSet = new Set(
    (Array.isArray(allowedCompetencies) ? allowedCompetencies : [])
      .map((competency) => normalizeCompetencyKey(competency))
      .filter(Boolean)
  )

  const normalized = {}
  for (const [key, rawScore] of Object.entries(rawScores)) {
    const normalizedKey = normalizeCompetencyKey(key)
    if (!normalizedKey) continue
    if (allowedSet.size > 0 && !allowedSet.has(normalizedKey)) continue
    const score = toOptionalScore(rawScore)
    if (score === null) continue
    normalized[normalizedKey] = score
  }

  return normalized
}

function deriveRating(overall) {
  if (overall >= 85) return 'excellent'
  if (overall >= 70) return 'good'
  if (overall >= 50) return 'fair'
  return 'needs_improvement'
}

function stripCodeFences(content) {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```')) {
    return trimmed
  }
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
}

function parseJsonContent(content) {
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('OpenAI response did not contain JSON content')
  }

  const cleaned = stripCodeFences(content)
  return JSON.parse(cleaned)
}

function serializeAirContextSummary(airContext) {
  if (!airContext || typeof airContext !== 'object') {
    return null
  }

  return {
    contextKey: airContext.contextKey || null,
    roleId: airContext.role?.id || 'custom_role',
    roleLabel: airContext.role?.label || airContext.targetJobTitle || null,
    industry: airContext.industry || null,
    seniority: airContext.seniority || null,
    targetJobTitle: airContext.targetJobTitle || null,
    competencies: Array.isArray(airContext.competencies)
      ? airContext.competencies
      : [],
  }
}

function normalizeEvaluation(payload, modelName, usage, airContext) {
  const scores = payload?.scores || {}
  const rawAnalysis =
    payload?.analysis && typeof payload.analysis === 'object'
      ? payload.analysis
      : {}
  const normalizedScores = {
    situation: clampScore(scores.situation),
    task: clampScore(scores.task),
    action: clampScore(scores.action),
    result: clampScore(scores.result),
    detail: clampScore(scores.detail),
    overall: clampScore(scores.overall),
  }

  if (!normalizedScores.overall) {
    normalizedScores.overall = clampScore(
      normalizedScores.situation * 0.2 +
        normalizedScores.task * 0.2 +
        normalizedScores.action * 0.25 +
        normalizedScores.result * 0.25 +
        normalizedScores.detail * 0.1
    )
  }

  const rating =
    typeof payload?.rating === 'string' && payload.rating.trim().length > 0
      ? payload.rating
      : deriveRating(normalizedScores.overall)

  const strengths = Array.isArray(payload?.strengths)
    ? payload.strengths.filter((item) => typeof item === 'string').slice(0, 6)
    : []

  const suggestions = Array.isArray(payload?.suggestions)
    ? payload.suggestions.filter((item) => typeof item === 'string').slice(0, 6)
    : []

  const expectedCompetencies = Array.isArray(airContext?.competencies)
    ? airContext.competencies
    : []
  const competencyScores = normalizeCompetencyScores(
    rawAnalysis.competencyScores,
    expectedCompetencies
  )
  const competencyValues = Object.values(competencyScores)
  const roleFitScore =
    toOptionalScore(rawAnalysis.roleFitScore) ??
    (competencyValues.length
      ? clampScore(
          competencyValues.reduce((sum, value) => sum + value, 0) /
            competencyValues.length
        )
      : normalizedScores.overall)
  const competencyCoverage =
    expectedCompetencies.length > 0
      ? clampScore(
          (Object.keys(competencyScores).length / expectedCompetencies.length) *
            100
        )
      : null
  const roleFitSummary =
    typeof rawAnalysis.roleFitSummary === 'string' &&
    rawAnalysis.roleFitSummary.trim().length > 0
      ? rawAnalysis.roleFitSummary.trim().slice(0, 220)
      : null

  return {
    scores: normalizedScores,
    rating,
    strengths,
    suggestions,
    analysis: {
      ...rawAnalysis,
      provider: 'openai',
      model: modelName,
      promptVersion: PROMPT_VERSION,
      airContext: serializeAirContextSummary(airContext),
      airContextUsed: Boolean(airContext?.contextKey),
      roleFitScore,
      roleFitSummary,
      competencyScores,
      competencyCoverage,
      tokenUsage:
        usage && typeof usage === 'object'
          ? {
              promptTokens: usage.prompt_tokens || 0,
              completionTokens: usage.completion_tokens || 0,
              totalTokens: usage.total_tokens || 0,
            }
          : null,
    },
  }
}

function buildAirContextBlock(airContext) {
  const summary = serializeAirContextSummary(airContext)
  if (!summary) {
    return ''
  }
  const industryLens =
    INDUSTRY_REVIEW_LENSES[summary.industry] || INDUSTRY_REVIEW_LENSES.other
  const seniorityExpectation =
    SENIORITY_REVIEW_EXPECTATIONS[summary.seniority] ||
    SENIORITY_REVIEW_EXPECTATIONS.mid

  return `
AIR context:
- Target role: ${summary.roleLabel || 'Custom role'}
- Role ID: ${summary.roleId}
- Industry: ${summary.industry || 'Not provided'}
- Seniority: ${summary.seniority || 'Not provided'}
- Core competencies: ${summary.competencies.join(', ') || 'Not provided'}
- Industry review lens: ${industryLens}
- Seniority expectation: ${seniorityExpectation}

AIR guidance:
- Evaluate answer quality in the context of this role and industry.
- Score stronger when evidence matches the seniority expectation.
- Penalize generic answers that ignore domain constraints.
- Keep STAR scoring objective and role-appropriate.
- Include concise role-fit observations in "analysis".
`.trim()
}

function buildPrompt(responseText, question, airContext) {
  const questionText = getQuestionText(question)
  const questionType =
    typeof question?.type === 'string' ? question.type : 'unknown'
  const questionDifficulty =
    typeof question?.difficulty === 'string' ? question.difficulty : 'unknown'
  const questionCategory =
    typeof question?.category === 'string' ? question.category : 'unknown'
  const airContextBlock = buildAirContextBlock(airContext)
  const competencySchema = airContextBlock
    ? `
  "analysis": {
    "roleFitScore": number,
    "roleFitSummary": string,
    "competencyScores": { "<competency-key>": number }
  }`
    : '"analysis": object'
  return `
You are evaluating a mock interview answer using the STAR framework.
Return ONLY strict JSON with this shape:
{
  "scores": {
    "situation": number,
    "task": number,
    "action": number,
    "result": number,
    "detail": number,
    "overall": number
  },
  "rating": "excellent" | "good" | "fair" | "needs_improvement",
  "strengths": string[],
  "suggestions": string[],
  ${competencySchema}
}

Scoring rules:
- Each score is integer 0-100.
- Weigh Action/Result higher than Situation/Task.
- Favor specific measurable outcomes.
- "overall" must be consistent with subscores.
${airContextBlock ? `- Use AIR context when judging role-fit depth.\n` : ''}
${airContextBlock ? `- Fill analysis.roleFitScore as 0-100.\n` : ''}
${airContextBlock ? `- Fill analysis.competencyScores only with competency keys from AIR context.\n` : ''}
${airContextBlock ? `- Apply stronger relevance bias to industry/profession context than generic storytelling.\n` : ''}
${airContextBlock ? `- Reward correct domain terminology and context-aware tradeoffs.\n` : ''}

${airContextBlock ? `${airContextBlock}\n` : ''}

Question:
${questionText || 'Not provided'}

Question metadata:
- Type: ${questionType}
- Difficulty: ${questionDifficulty}
- Category: ${questionCategory}

Candidate response:
${responseText}
`.trim()
}

async function requestOpenAI({ apiKey, model, prompt }) {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an expert interview coach. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `OpenAI request failed (${response.status}): ${errorBody}`
      )
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    return {
      payload: parseJsonContent(content),
      usage: data?.usage || null,
      model: data?.model || model,
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`OpenAI request timed out after ${DEFAULT_TIMEOUT_MS}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}

export const openAIFeedbackProvider = {
  id: PROVIDER_ID,
  evaluate: async ({ responseText, question, airContext }) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    const model = process.env.OPENAI_FEEDBACK_MODEL || DEFAULT_MODEL
    const prompt = buildPrompt(responseText, question, airContext)
    const {
      payload,
      usage,
      model: resolvedModel,
    } = await requestOpenAI({
      apiKey,
      model,
      prompt,
    })

    return normalizeEvaluation(
      payload,
      resolvedModel || model,
      usage,
      airContext
    )
  },
}

export default openAIFeedbackProvider
