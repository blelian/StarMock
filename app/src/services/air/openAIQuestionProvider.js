import { AIR_CONTEXT_VERSION } from '../../config/airProfiles.js'

const OPENAI_BASE_URL = (
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
).replace(/\/+$/, '')

const DEFAULT_MODEL = process.env.OPENAI_AIR_QUESTION_MODEL || 'gpt-4o-mini'
const DEFAULT_TIMEOUT_MS = Number(
  process.env.OPENAI_AIR_QUESTION_TIMEOUT_MS || 15000
)
const PROMPT_VERSION =
  process.env.OPENAI_AIR_QUESTION_PROMPT_VERSION || 'air-questions.v1'
const DEFAULT_MAX_TOKENS = Number(
  process.env.OPENAI_AIR_QUESTION_MAX_TOKENS || 1200
)
const DEFAULT_RETRIES = Number(process.env.OPENAI_AIR_QUESTION_RETRIES || 1)

const ALLOWED_QUESTION_TYPES = new Set([
  'behavioral',
  'technical',
  'situational',
  'leadership',
])
const ALLOWED_DIFFICULTIES = new Set(['easy', 'medium', 'hard'])
const ALLOWED_CATEGORIES = new Set([
  'teamwork',
  'leadership',
  'problem-solving',
  'communication',
  'conflict-resolution',
  'time-management',
  'adaptability',
  'initiative',
])

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

function clampString(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
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
    throw new Error('OpenAI AIR question response did not contain JSON content')
  }

  const cleaned = stripCodeFences(content)
  return JSON.parse(cleaned)
}

function normalizeQuestionType(value, fallback) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (ALLOWED_QUESTION_TYPES.has(normalized)) {
      return normalized
    }
  }
  return fallback && ALLOWED_QUESTION_TYPES.has(fallback) ? fallback : 'behavioral'
}

function normalizeDifficulty(value, fallback) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (ALLOWED_DIFFICULTIES.has(normalized)) {
      return normalized
    }
  }
  return fallback && ALLOWED_DIFFICULTIES.has(fallback) ? fallback : 'medium'
}

function defaultCategoryForType(type) {
  if (type === 'technical') return 'problem-solving'
  if (type === 'situational') return 'adaptability'
  if (type === 'leadership') return 'leadership'
  return 'communication'
}

function normalizeCategory(value, type) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (ALLOWED_CATEGORIES.has(normalized)) {
      return normalized
    }
  }
  return defaultCategoryForType(type)
}

function normalizeStarGuidelines(guidelines = {}) {
  return {
    situation:
      clampString(guidelines.situation, 240) ||
      'Describe the context and background of the situation',
    task:
      clampString(guidelines.task, 240) ||
      'Explain your responsibility and what needed to be accomplished',
    action:
      clampString(guidelines.action, 240) ||
      'Detail the specific steps you took to address the situation',
    result:
      clampString(guidelines.result, 240) ||
      'Share the outcomes and what you learned',
  }
}

function toQuestionText(rawQuestion) {
  return (
    clampString(rawQuestion?.questionText, 800) ||
    clampString(rawQuestion?.description, 800) ||
    clampString(rawQuestion?.prompt, 800)
  )
}

function toQuestionTitle(rawQuestion, fallbackQuestionText, index) {
  const explicitTitle = clampString(rawQuestion?.title, 120)
  if (explicitTitle) {
    return explicitTitle
  }

  const fromText = fallbackQuestionText.split(/[?.!]/)[0]?.trim()
  if (fromText) {
    return fromText.slice(0, 120)
  }

  return `AIR question ${index + 1}`
}

function normalizeGeneratedQuestions({
  payload,
  airContext,
  count,
  type,
  difficulty,
}) {
  const rawQuestions = Array.isArray(payload?.questions)
    ? payload.questions
    : Array.isArray(payload?.items)
      ? payload.items
      : []

  const normalized = []
  const seenDescriptions = new Set()

  for (let index = 0; index < rawQuestions.length; index += 1) {
    const rawQuestion = rawQuestions[index]
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      continue
    }

    const questionType = normalizeQuestionType(rawQuestion.type, type)
    const questionDifficulty = normalizeDifficulty(
      rawQuestion.difficulty,
      difficulty
    )
    const questionText = toQuestionText(rawQuestion)
    if (!questionText) {
      continue
    }

    const dedupeKey = questionText.toLowerCase()
    if (seenDescriptions.has(dedupeKey)) {
      continue
    }
    seenDescriptions.add(dedupeKey)

    const category = normalizeCategory(rawQuestion.category, questionType)
    const title = toQuestionTitle(rawQuestion, questionText, index)

    normalized.push({
      title,
      description: questionText,
      type: questionType,
      difficulty: questionDifficulty,
      category,
      tags: ['ai-generated', 'air'],
      starGuidelines: normalizeStarGuidelines(rawQuestion.starGuidelines),
      isActive: true,
      airProfile: {
        contextVersion: airContext.version || AIR_CONTEXT_VERSION,
        industries: [airContext.industry],
        roles: [airContext.role?.id || 'custom_role'],
        seniority: [airContext.seniority],
        competencies: Array.isArray(airContext.competencies)
          ? airContext.competencies
          : [],
      },
    })

    if (normalized.length >= count) {
      break
    }
  }

  return normalized
}

function buildPrompt({ airContext, count, type, difficulty, existingQuestions }) {
  const competencies = Array.isArray(airContext.competencies)
    ? airContext.competencies.join(', ')
    : ''
  const roleLabel = airContext.role?.label || airContext.targetJobTitle
  const exclusions =
    Array.isArray(existingQuestions) && existingQuestions.length > 0
      ? existingQuestions
          .slice(0, 8)
          .map((question, index) => `${index + 1}. ${question}`)
          .join('\n')
      : 'None'

  const typeRule =
    typeof type === 'string' && ALLOWED_QUESTION_TYPES.has(type)
      ? `Question type must be "${type}".`
      : 'Mix question types based on role fit.'
  const difficultyRule =
    typeof difficulty === 'string' && ALLOWED_DIFFICULTIES.has(difficulty)
      ? `Difficulty must be "${difficulty}".`
      : 'Set realistic interview difficulty for the role and seniority.'

  return `
Generate ${count} realistic mock interview questions.
Return ONLY strict JSON with this exact shape:
{
  "questions": [
    {
      "title": string,
      "questionText": string,
      "type": "behavioral" | "technical" | "situational" | "leadership",
      "difficulty": "easy" | "medium" | "hard",
      "category": "teamwork" | "leadership" | "problem-solving" | "communication" | "conflict-resolution" | "time-management" | "adaptability" | "initiative",
      "starGuidelines": {
        "situation": string,
        "task": string,
        "action": string,
        "result": string
      }
    }
  ]
}

AIR context:
- Target role: ${roleLabel}
- Raw target job title: ${airContext.targetJobTitle}
- Industry: ${airContext.industry}
- Seniority: ${airContext.seniority}
- Core competencies: ${competencies || 'communication, execution'}
- Job description hints: ${airContext.jobDescriptionText || 'Not provided'}

Rules:
- Questions must be specific to this role and industry.
- ${typeRule}
- ${difficultyRule}
- Avoid generic or repeated wording.
- Use interview prompts that are answerable via STAR.
- Keep each questionText under 320 characters.
- Do NOT repeat these already-seen prompts:
${exclusions}
`.trim()
}

function normalizeTokenUsage(usage) {
  if (!usage || typeof usage !== 'object') {
    return null
  }
  return {
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
  }
}

async function requestOpenAI({ apiKey, model, prompt, timeoutMs, maxTokens }) {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You generate role-aware interview questions and always return valid JSON only.',
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
        `OpenAI AIR question request failed (${response.status}): ${errorBody}`
      )
    }

    const data = await response.json()
    return {
      payload: parseJsonContent(data?.choices?.[0]?.message?.content),
      usage: data?.usage || null,
      model: data?.model || model,
    }
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`OpenAI AIR question request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}

export async function generateAirQuestions({
  airContext,
  count,
  type,
  difficulty,
  existingQuestions = [],
}) {
  const requestedCount = toPositiveInteger(count, 1)
  if (!airContext || typeof airContext !== 'object') {
    throw new Error('AIR context is required to generate questions')
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const model = process.env.OPENAI_AIR_QUESTION_MODEL || DEFAULT_MODEL
  const timeoutMs = toPositiveInteger(
    process.env.OPENAI_AIR_QUESTION_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS
  )
  const maxTokens = toPositiveInteger(
    process.env.OPENAI_AIR_QUESTION_MAX_TOKENS,
    DEFAULT_MAX_TOKENS
  )
  const retries = toPositiveInteger(
    process.env.OPENAI_AIR_QUESTION_RETRIES,
    DEFAULT_RETRIES
  )

  const prompt = buildPrompt({
    airContext,
    count: requestedCount,
    type,
    difficulty,
    existingQuestions,
  })

  const startedAt = Date.now()
  const attemptErrors = []

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const {
        payload,
        usage,
        model: resolvedModel,
      } = await requestOpenAI({
        apiKey,
        model,
        prompt,
        timeoutMs,
        maxTokens,
      })

      const questions = normalizeGeneratedQuestions({
        payload,
        airContext,
        count: requestedCount,
        type,
        difficulty,
      })

      if (questions.length === 0) {
        throw new Error('OpenAI AIR question response had no usable questions')
      }

      return {
        questions,
        metadata: {
          provider: 'openai',
          model: resolvedModel || model,
          promptVersion: PROMPT_VERSION,
          attempts: attempt + 1,
          retries,
          latencyMs: Date.now() - startedAt,
          tokenUsage: normalizeTokenUsage(usage),
        },
      }
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error('Unknown OpenAI AIR error')
      attemptErrors.push({
        message: normalizedError.message,
        code: normalizedError.code || 'OPENAI_AIR_GENERATION_ERROR',
      })
      if (attempt === retries) {
        normalizedError.attemptErrors = attemptErrors
        throw normalizedError
      }
    }
  }

  throw new Error('OpenAI AIR generation failed after retry policy')
}

export default {
  generateAirQuestions,
}
