document.addEventListener('DOMContentLoaded', async () => {
  const messageEl = document.getElementById('feedback-message')
  const overallScoreValueEl = document.getElementById('overall-score-value')
  const overallScoreRingEl = document.getElementById('overall-score-ring')
  const breakdownEl = document.getElementById('star-breakdown')
  const suggestionsEl = document.getElementById('feedback-suggestions')
  const airMetricsPanelEl = document.getElementById('air-metrics-panel')
  const airRoleFitScoreEl = document.getElementById('air-role-fit-score')
  const airCoverageEl = document.getElementById('air-competency-coverage')
  const airWeakestEl = document.getElementById('air-weakest-competency')
  const airTrendEl = document.getElementById('air-trend-score')
  const airCompetencyBreakdownEl = document.getElementById(
    'air-competency-breakdown'
  )
  const questionRollupSummaryEl = document.getElementById(
    'question-rollup-summary'
  )
  const questionMetricsListEl = document.getElementById('question-metrics-list')
  const progressIndicatorEl = document.getElementById(
    'feedback-progress-indicator'
  )
  const progressTextEl = document.getElementById('feedback-progress-text')
  const feedbackActionsEl = document.getElementById('feedback-actions')
  const feedbackRetryBtn = document.getElementById('feedback-retry-btn')
  const providerBadgeEl = document.getElementById('provider-badge')
  const providerBadgeLabelEl = document.getElementById('provider-badge-label')
  const providerBadgeIconEl = document.getElementById('provider-badge-icon')
  const providerBadgeTextEl = document.getElementById('provider-badge-text')
  const strengthsEl = document.getElementById('feedback-strengths')
  const airRoleFitSummaryPanelEl = document.getElementById(
    'air-role-fit-summary-panel'
  )
  const airRoleFitSummaryEl = document.getElementById('air-role-fit-summary')
  const perQuestionFeedbackEl = document.getElementById(
    'per-question-feedback'
  )
  const perQuestionCardsEl = document.getElementById('per-question-cards')

  if (
    !messageEl ||
    !overallScoreValueEl ||
    !overallScoreRingEl ||
    !breakdownEl ||
    !suggestionsEl
  ) {
    return
  }

  const DASH_ARRAY = 552
  const FEEDBACK_POLL_BASE_INTERVAL_MS = 2500
  const FEEDBACK_POLL_MAX_INTERVAL_MS = 30000
  const FEEDBACK_POLL_JITTER_RATIO = 0.2
  const FEEDBACK_POLL_TIMEOUT_MS = 120000

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    return { ok: response.ok, status: response.status, payload }
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const computePollDelay = (attemptNumber) => {
    const exponentialDelay = Math.min(
      FEEDBACK_POLL_BASE_INTERVAL_MS * 2 ** attemptNumber,
      FEEDBACK_POLL_MAX_INTERVAL_MS
    )
    const jitterOffset =
      (Math.random() * 2 - 1) * FEEDBACK_POLL_JITTER_RATIO * exponentialDelay
    return Math.max(1000, Math.round(exponentialDelay + jitterOffset))
  }

  const setProgress = (message, isVisible = true) => {
    if (!progressIndicatorEl || !progressTextEl) {
      return
    }

    progressTextEl.textContent = message
    progressIndicatorEl.classList.toggle('hidden', !isVisible)
  }

  const escapeHtml = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')

  const toPercent = (score) => {
    if (!Number.isFinite(score)) return null
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  const scoreLabel = (score) => {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Strong'
    if (score >= 50) return 'Developing'
    return 'Needs focus'
  }

  const scoreTone = (score) => {
    if (score >= 70) {
      return {
        icon: 'check_circle',
        iconColor: 'bg-primary/20 text-primary',
        labelColor: 'text-primary',
      }
    }
    if (score >= 50) {
      return {
        icon: 'error',
        iconColor: 'bg-amber-500/20 text-amber-500',
        labelColor: 'text-amber-500',
      }
    }
    return {
      icon: 'warning',
      iconColor: 'bg-red-500/20 text-red-400',
      labelColor: 'text-red-400',
    }
  }

  const average = (values) => {
    const filtered = values.filter((value) => Number.isFinite(value))
    if (!filtered.length) return null
    return filtered.reduce((sum, value) => sum + value, 0) / filtered.length
  }

  const componentGuidance = {
    situation: 'Set context clearly: role, timeline, and challenge.',
    task: 'State your exact ownership and what success required.',
    action: 'Detail concrete steps you personally took.',
    result: 'Quantify outcomes and reflect on impact.',
  }

  const formatDelta = (delta) => {
    if (!Number.isFinite(delta)) return '--'
    return `${delta >= 0 ? '+' : ''}${Math.round(delta)} pts`
  }

  const renderQuestionMetrics = (summary) => {
    if (!questionRollupSummaryEl || !questionMetricsListEl) {
      return
    }

    const sessionMetrics = summary?.sessionMetrics || null
    const questionMetrics = Array.isArray(summary?.questionMetrics)
      ? summary.questionMetrics
      : []

    if (!sessionMetrics || !questionMetrics.length) {
      questionRollupSummaryEl.textContent = 'No retries'
      questionMetricsListEl.innerHTML =
        '<li>No question-attempt rollup is available for this session.</li>'
      return
    }

    questionRollupSummaryEl.textContent = `${sessionMetrics.questionCount || questionMetrics.length} questions • ${sessionMetrics.totalAttempts || questionMetrics.length} attempts`
    questionMetricsListEl.innerHTML = questionMetrics
      .slice(0, 8)
      .map((item, index) => {
        const bestScore = toPercent(item?.bestAttempt?.overallScore)
        const latestScore = toPercent(item?.latestAttempt?.overallScore)
        const improvement = item?.improvement?.overallDelta
        const improvementLabel =
          Number.isFinite(improvement) && improvement !== 0
            ? `${improvement > 0 ? '+' : ''}${Math.round(improvement)} pts`
            : 'No change'
        const questionLabel =
          typeof item?.questionText === 'string' && item.questionText.trim()
            ? item.questionText.trim()
            : `Question ${index + 1}`
        const attemptCount = Number(item?.attemptCount || 0)

        return `
          <li class="rounded-xl border border-white/10 bg-white/5 p-3">
            <p class="font-semibold">${escapeHtml(questionLabel)}</p>
            <p class="text-xs mt-1">
              Attempts: ${attemptCount} • Best: ${bestScore ?? '--'}% • Latest: ${
                latestScore ?? '--'
              }% • Delta: ${escapeHtml(improvementLabel)}
            </p>
          </li>
        `
      })
      .join('')
  }

  const renderAirMetrics = (summary) => {
    if (
      !airMetricsPanelEl ||
      !airRoleFitScoreEl ||
      !airCoverageEl ||
      !airWeakestEl ||
      !airTrendEl ||
      !airCompetencyBreakdownEl
    ) {
      return
    }

    const roleMetrics = summary?.roleMetrics || {}
    const roleFitScore = toPercent(roleMetrics.roleFitScore)
    const coverage = toPercent(roleMetrics.competencyCoverage)
    const weakest = roleMetrics.weakestCompetency || null
    const trend = roleMetrics.trend || null
    const competencyScores = Array.isArray(roleMetrics.competencyScores)
      ? roleMetrics.competencyScores
      : []

    if (!summary?.airMode) {
      airMetricsPanelEl.classList.add('hidden')
      return
    }

    airMetricsPanelEl.classList.remove('hidden')
    airRoleFitScoreEl.textContent =
      roleFitScore === null ? '--%' : `${roleFitScore}%`
    airCoverageEl.textContent = coverage === null ? '--%' : `${coverage}%`
    airWeakestEl.textContent = weakest
      ? `${weakest.label} (${toPercent(weakest.score)}%)`
      : '--'

    if (trend && Number.isFinite(trend.delta)) {
      const directionLabel =
        trend.direction === 'up'
          ? 'Improving'
          : trend.direction === 'down'
            ? 'Declining'
            : 'Stable'
      airTrendEl.textContent = `${directionLabel} (${formatDelta(trend.delta)})`
    } else {
      airTrendEl.textContent = 'No baseline yet'
    }

    if (!competencyScores.length) {
      airCompetencyBreakdownEl.innerHTML =
        '<li>No competency-level scores available yet.</li>'
      return
    }

    airCompetencyBreakdownEl.innerHTML = competencyScores
      .slice(0, 6)
      .map((item) => {
        const score = toPercent(item.score)
        return `<li class="flex items-center justify-between"><span>${escapeHtml(item.label)}</span><span class="font-semibold">${score ?? '--'}%</span></li>`
      })
      .join('')
  }

  const renderBreakdown = (scores) => {
    const entries = [
      ['Situation', scores.situation],
      ['Task', scores.task],
      ['Action', scores.action],
      ['Result', scores.result],
    ]

    breakdownEl.innerHTML = entries
      .map(([name, value]) => {
        const normalizedScore = toPercent(value)
        const tone = scoreTone(normalizedScore ?? 0)
        const label = scoreLabel(normalizedScore ?? 0)
        const guidance = componentGuidance[name.toLowerCase()]

        return `
          <div class="flex items-start gap-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-white/10">
            <div class="flex items-center justify-center rounded-lg ${tone.iconColor} shrink-0 w-12 h-12">
              <span class="material-icons-round">${tone.icon}</span>
            </div>
            <div class="flex flex-col flex-1">
              <div class="flex justify-between items-center mb-1">
                <p class="text-base font-bold leading-none">${name}</p>
                <span class="text-[10px] font-bold ${tone.labelColor} uppercase">${label} (${normalizedScore ?? '--'}%)</span>
              </div>
              <p class="text-slate-600 dark:text-primary/60 text-sm font-normal leading-snug">
                ${escapeHtml(guidance)}
              </p>
            </div>
          </div>
        `
      })
      .join('')
  }

  const renderSuggestions = (feedbackItems) => {
    const suggestionPool = feedbackItems.flatMap((item) =>
      Array.isArray(item.suggestions) ? item.suggestions : []
    )
    const uniqueSuggestions = [...new Set(suggestionPool)].slice(0, 4)

    if (!uniqueSuggestions.length) {
      suggestionsEl.innerHTML =
        '<li>Keep practicing. Focus on structure and measurable outcomes.</li>'
      return
    }

    suggestionsEl.innerHTML = uniqueSuggestions
      .map((suggestion) => `<li>${escapeHtml(suggestion)}</li>`)
      .join('')
  }

  const renderProviderBadge = (feedbackItems) => {
    if (
      !providerBadgeEl ||
      !providerBadgeLabelEl ||
      !providerBadgeIconEl ||
      !providerBadgeTextEl
    ) {
      return
    }

    const providers = new Set(
      feedbackItems
        .map((item) => item?.evaluatorType)
        .filter((type) => typeof type === 'string')
    )

    if (!providers.size) {
      providerBadgeEl.classList.add('hidden')
      return
    }

    const isAI = providers.has('ai_model')
    const isFallback = feedbackItems.some(
      (item) => item?.evaluatorMetadata?.fallback === true
    )

    if (isAI && !isFallback) {
      providerBadgeIconEl.textContent = 'auto_awesome'
      providerBadgeTextEl.textContent = 'AI-Powered Feedback'
      providerBadgeLabelEl.className =
        'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full uppercase bg-violet-500/15 text-violet-400'
    } else if (isAI && isFallback) {
      providerBadgeIconEl.textContent = 'auto_awesome'
      providerBadgeTextEl.textContent = 'AI + Rule-Based Feedback'
      providerBadgeLabelEl.className =
        'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full uppercase bg-amber-500/15 text-amber-400'
    } else {
      providerBadgeIconEl.textContent = 'rule'
      providerBadgeTextEl.textContent = 'Rule-Based Feedback'
      providerBadgeLabelEl.className =
        'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full uppercase bg-primary/10 text-primary'
    }

    providerBadgeEl.classList.remove('hidden')
    providerBadgeEl.style.display = 'flex'
  }

  const renderStrengths = (feedbackItems) => {
    if (!strengthsEl) return

    const strengthPool = feedbackItems.flatMap((item) =>
      Array.isArray(item.strengths) ? item.strengths : []
    )
    const uniqueStrengths = [...new Set(strengthPool)].slice(0, 4)

    if (!uniqueStrengths.length) {
      strengthsEl.innerHTML =
        '<li>Complete more responses to see identified strengths.</li>'
      return
    }

    strengthsEl.innerHTML = uniqueStrengths
      .map((strength) => `<li>${escapeHtml(strength)}</li>`)
      .join('')
  }

  const renderRoleFitSummary = (feedbackItems) => {
    if (!airRoleFitSummaryPanelEl || !airRoleFitSummaryEl) return

    const summaries = feedbackItems
      .map((item) => item?.analysis?.roleFitSummary)
      .filter((summary) => typeof summary === 'string' && summary.trim())

    if (!summaries.length) {
      airRoleFitSummaryPanelEl.classList.add('hidden')
      return
    }

    airRoleFitSummaryEl.textContent = summaries[0]
    airRoleFitSummaryPanelEl.classList.remove('hidden')
  }

  const renderPerQuestionFeedback = (feedbackItems) => {
    if (!perQuestionFeedbackEl || !perQuestionCardsEl) return

    const validItems = feedbackItems.filter(
      (item) => item?.scores && typeof item.scores.overall === 'number'
    )

    if (!validItems.length) {
      perQuestionFeedbackEl.classList.add('hidden')
      return
    }

    perQuestionCardsEl.innerHTML = validItems
      .map((item, index) => {
        const questionLabel =
          typeof item.questionText === 'string' && item.questionText.trim()
            ? item.questionText.trim()
            : `Question ${index + 1}`
        const overall = toPercent(item.scores.overall) ?? 0
        const tone = scoreTone(overall)
        const label = scoreLabel(overall)
        const starEntries = [
          ['S', item.scores.situation],
          ['T', item.scores.task],
          ['A', item.scores.action],
          ['R', item.scores.result],
        ]
        const itemSuggestions = Array.isArray(item.suggestions)
          ? item.suggestions.slice(0, 2)
          : []
        const itemStrengths = Array.isArray(item.strengths)
          ? item.strengths.slice(0, 2)
          : []

        return `
          <div class="rounded-xl border border-white/10 bg-white/5 p-4">
            <div class="flex items-start justify-between mb-3">
              <p class="font-semibold text-sm leading-snug flex-1 pr-3">${escapeHtml(questionLabel)}</p>
              <span class="text-xs font-bold ${tone.labelColor} uppercase whitespace-nowrap">${label} (${overall}%)</span>
            </div>
            <div class="flex gap-2 mb-3">
              ${starEntries
                .map(([key, value]) => {
                  const score = toPercent(value) ?? 0
                  const entryTone = scoreTone(score)
                  return `<span class="text-xs font-semibold px-2 py-1 rounded-lg ${entryTone.iconColor}">${key}: ${score}%</span>`
                })
                .join('')}
            </div>
            ${
              itemStrengths.length
                ? `<div class="mb-2"><p class="text-xs font-semibold text-emerald-400 mb-1">Strengths</p><ul class="text-xs text-slate-500 dark:text-primary/60 space-y-1">${itemStrengths.map((s) => `<li>• ${escapeHtml(s)}</li>`).join('')}</ul></div>`
                : ''
            }
            ${
              itemSuggestions.length
                ? `<div><p class="text-xs font-semibold text-primary mb-1">Suggestions</p><ul class="text-xs text-slate-500 dark:text-primary/60 space-y-1">${itemSuggestions.map((s) => `<li>• ${escapeHtml(s)}</li>`).join('')}</ul></div>`
                : ''
            }
          </div>
        `
      })
      .join('')

    perQuestionFeedbackEl.classList.remove('hidden')
  }

  const resolveSessionId = async () => {
    const fromQuery = new URLSearchParams(window.location.search).get(
      'sessionId'
    )
    if (fromQuery) return fromQuery

    const historyResult = await apiRequest(
      '/api/history?status=completed&page=1&limit=1'
    )
    if (!historyResult.ok) return null
    return historyResult.payload?.sessions?.[0]?.id || null
  }

  const showFeedbackActions = (showRetry = false) => {
    if (feedbackActionsEl) {
      feedbackActionsEl.classList.remove('hidden')
      feedbackActionsEl.style.display = 'flex'
    }
    if (feedbackRetryBtn) {
      feedbackRetryBtn.classList.toggle('hidden', !showRetry)
    }
  }

  const loadFeedbackWithPolling = async (sessionId) => {
    const startedAt = Date.now()
    let pollAttempt = 0

    while (Date.now() - startedAt < FEEDBACK_POLL_TIMEOUT_MS) {
      const statusResult = await apiRequest(
        `/api/sessions/${sessionId}/feedback-status`
      )

      if (!statusResult.ok) {
        return {
          ok: false,
          message:
            statusResult.payload?.error?.message ||
            'Unable to check feedback status.',
        }
      }

      const statusPayload = statusResult.payload || {}
      const feedbackState = statusPayload.feedback || {}
      const job = feedbackState.job || null

      if (feedbackState.ready) {
        const feedbackResult = await apiRequest(
          `/api/sessions/${sessionId}/feedback`
        )
        if (feedbackResult.status === 202) {
          const waitMs = computePollDelay(pollAttempt)
          pollAttempt += 1
          messageEl.textContent =
            feedbackResult.payload?.message || 'Feedback is still processing...'
          setProgress(`Checking again in ${Math.ceil(waitMs / 1000)}s...`)
          await wait(waitMs)
          continue
        }

        if (
          !feedbackResult.ok ||
          !Array.isArray(feedbackResult.payload?.feedback)
        ) {
          return {
            ok: false,
            message:
              feedbackResult.payload?.error?.message ||
              'Unable to load feedback.',
          }
        }

        return {
          ok: true,
          feedbackItems: feedbackResult.payload.feedback,
          summary: feedbackResult.payload.summary || null,
        }
      }

      if (job?.status === 'failed') {
        return {
          ok: false,
          message:
            job?.lastError?.message ||
            'Feedback generation failed. You can retry or start a new session.',
        }
      }

      const waitMs = computePollDelay(pollAttempt)
      pollAttempt += 1
      if (job?.status === 'processing') {
        messageEl.textContent = `Generating feedback (attempt ${job.attempts || 1}/${job.maxAttempts || 3})...`
      } else if (job?.status === 'queued') {
        messageEl.textContent =
          'Feedback is queued and will be ready shortly...'
      } else {
        messageEl.textContent = 'Preparing feedback...'
      }
      setProgress(`Checking again in ${Math.ceil(waitMs / 1000)}s...`)

      await wait(waitMs)
    }

    return {
      ok: false,
      message:
        'Feedback is taking longer than expected. Try again in a moment.',
    }
  }

  const loadAndRenderFeedback = async () => {
    messageEl.textContent = 'Loading feedback...'
    setProgress('Preparing feedback generation status...')

    try {
      const sessionId = await resolveSessionId()
      if (!sessionId) {
        messageEl.textContent =
          'No completed interview session found. Complete an interview first.'
        setProgress('', false)
        messageEl.classList.remove('text-slate-500', 'dark:text-slate-400')
        messageEl.classList.add('text-red-400')
        showFeedbackActions(false)
        return
      }

      const feedbackLoadResult = await loadFeedbackWithPolling(sessionId)
      if (!feedbackLoadResult.ok) {
        setProgress('', false)
        messageEl.textContent = feedbackLoadResult.message
        messageEl.classList.remove('text-slate-500', 'dark:text-slate-400')
        messageEl.classList.add('text-red-400')
        showFeedbackActions(true)
        return
      }

      setProgress('', false)
      const feedbackItems = feedbackLoadResult.feedbackItems
      const summary = feedbackLoadResult.summary || null
      if (!feedbackItems.length) {
        messageEl.textContent = 'No feedback generated for this session yet.'
        showFeedbackActions(true)
        return
      }

      const aggregateScores = summary?.starScores || {
        situation: average(
          feedbackItems.map((item) => item?.scores?.situation)
        ),
        task: average(feedbackItems.map((item) => item?.scores?.task)),
        action: average(feedbackItems.map((item) => item?.scores?.action)),
        result: average(feedbackItems.map((item) => item?.scores?.result)),
        overall: average(feedbackItems.map((item) => item?.scores?.overall)),
      }

      const overall = toPercent(aggregateScores.overall) ?? 0
      overallScoreValueEl.textContent = `${overall}%`
      overallScoreRingEl.setAttribute(
        'stroke-dashoffset',
        String(DASH_ARRAY - (DASH_ARRAY * overall) / 100)
      )

      renderBreakdown(aggregateScores)
      renderSuggestions(feedbackItems)
      renderStrengths(feedbackItems)
      renderProviderBadge(feedbackItems)
      renderAirMetrics(summary)
      renderRoleFitSummary(feedbackItems)
      renderQuestionMetrics(summary)
      renderPerQuestionFeedback(feedbackItems)

      messageEl.textContent = `Feedback loaded for session ${sessionId.slice(-6)}.`
      showFeedbackActions(false)
    } catch (error) {
      console.error('Feedback load error:', error)
      setProgress('', false)
      messageEl.textContent =
        'Unable to load feedback. Please check your connection and try again.'
      messageEl.classList.remove('text-slate-500', 'dark:text-slate-400')
      messageEl.classList.add('text-red-400')
      showFeedbackActions(true)
    }
  }

  // Wire up retry button
  if (feedbackRetryBtn) {
    feedbackRetryBtn.addEventListener('click', () => {
      if (feedbackActionsEl) feedbackActionsEl.classList.add('hidden')
      loadAndRenderFeedback()
    })
  }

  await loadAndRenderFeedback()
})
