const PROVIDER_ID = 'ai_model'
const DEFAULT_MODEL = process.env.OPENAI_FEEDBACK_MODEL || 'gpt-4o-mini'
const DEFAULT_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || 15000)
const PROMPT_VERSION = process.env.OPENAI_PROMPT_VERSION || 'star-eval.v1'
const OPENAI_BASE_URL = (
  process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
).replace(/\/+$/, '')

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

function normalizeEvaluation(payload, modelName, usage) {
  const scores = payload?.scores || {}
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
    ? payload.suggestions
        .filter((item) => typeof item === 'string')
        .slice(0, 6)
    : []

  return {
    scores: normalizedScores,
    rating,
    strengths,
    suggestions,
    analysis: {
      ...(payload?.analysis || {}),
      provider: 'openai',
      model: modelName,
      promptVersion: PROMPT_VERSION,
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

function buildPrompt(responseText, question) {
  const questionText = getQuestionText(question)
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
  "analysis": object
}

Scoring rules:
- Each score is integer 0-100.
- Weigh Action/Result higher than Situation/Task.
- Favor specific measurable outcomes.
- "overall" must be consistent with subscores.

Question:
${questionText || 'Not provided'}

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
      throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`)
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
  evaluate: async ({ responseText, question }) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    const model = process.env.OPENAI_FEEDBACK_MODEL || DEFAULT_MODEL
    const prompt = buildPrompt(responseText, question)
    const { payload, usage, model: resolvedModel } = await requestOpenAI({
      apiKey,
      model,
      prompt,
    })

    return normalizeEvaluation(payload, resolvedModel || model, usage)
  },
}

export default openAIFeedbackProvider
