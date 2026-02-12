document.addEventListener('DOMContentLoaded', async () => {
  const messageEl = document.getElementById('feedback-message');
  const overallScoreValueEl = document.getElementById('overall-score-value');
  const overallScoreRingEl = document.getElementById('overall-score-ring');
  const breakdownEl = document.getElementById('star-breakdown');
  const suggestionsEl = document.getElementById('feedback-suggestions');

  if (
    !messageEl ||
    !overallScoreValueEl ||
    !overallScoreRingEl ||
    !breakdownEl ||
    !suggestionsEl
  ) {
    return;
  }

  const DASH_ARRAY = 552;
  const FEEDBACK_POLL_INTERVAL_MS = 2500;
  const FEEDBACK_POLL_TIMEOUT_MS = 120000;

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    return { ok: response.ok, status: response.status, payload };
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const escapeHtml = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const toPercent = (score) => {
    if (!Number.isFinite(score)) return null;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const scoreLabel = (score) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Developing';
    return 'Needs focus';
  };

  const scoreTone = (score) => {
    if (score >= 70) {
      return {
        icon: 'check_circle',
        iconColor: 'bg-primary/20 text-primary',
        labelColor: 'text-primary',
      };
    }
    if (score >= 50) {
      return {
        icon: 'error',
        iconColor: 'bg-amber-500/20 text-amber-500',
        labelColor: 'text-amber-500',
      };
    }
    return {
      icon: 'warning',
      iconColor: 'bg-red-500/20 text-red-400',
      labelColor: 'text-red-400',
    };
  };

  const average = (values) => {
    const filtered = values.filter((value) => Number.isFinite(value));
    if (!filtered.length) return null;
    return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
  };

  const componentGuidance = {
    situation: 'Set context clearly: role, timeline, and challenge.',
    task: 'State your exact ownership and what success required.',
    action: 'Detail concrete steps you personally took.',
    result: 'Quantify outcomes and reflect on impact.',
  };

  const renderBreakdown = (scores) => {
    const entries = [
      ['Situation', scores.situation],
      ['Task', scores.task],
      ['Action', scores.action],
      ['Result', scores.result],
    ];

    breakdownEl.innerHTML = entries
      .map(([name, value]) => {
        const normalizedScore = toPercent(value);
        const tone = scoreTone(normalizedScore ?? 0);
        const label = scoreLabel(normalizedScore ?? 0);
        const guidance = componentGuidance[name.toLowerCase()];

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
        `;
      })
      .join('');
  };

  const renderSuggestions = (feedbackItems) => {
    const suggestionPool = feedbackItems.flatMap((item) =>
      Array.isArray(item.suggestions) ? item.suggestions : []
    );
    const uniqueSuggestions = [...new Set(suggestionPool)].slice(0, 4);

    if (!uniqueSuggestions.length) {
      suggestionsEl.innerHTML =
        '<li>Keep practicing. Focus on structure and measurable outcomes.</li>';
      return;
    }

    suggestionsEl.innerHTML = uniqueSuggestions
      .map((suggestion) => `<li>${escapeHtml(suggestion)}</li>`)
      .join('');
  };

  const resolveSessionId = async () => {
    const fromQuery = new URLSearchParams(window.location.search).get('sessionId');
    if (fromQuery) return fromQuery;

    const historyResult = await apiRequest('/api/history?status=completed&page=1&limit=1');
    if (!historyResult.ok) return null;
    return historyResult.payload?.sessions?.[0]?.id || null;
  };

  messageEl.textContent = 'Loading feedback...';

  const sessionId = await resolveSessionId();
  if (!sessionId) {
    messageEl.textContent =
      'No completed interview session found. Complete an interview first.';
    messageEl.classList.remove('text-slate-500', 'dark:text-slate-400');
    messageEl.classList.add('text-red-400');
    return;
  }

  const loadFeedbackWithPolling = async () => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < FEEDBACK_POLL_TIMEOUT_MS) {
      const statusResult = await apiRequest(
        `/api/sessions/${sessionId}/feedback-status`
      );

      if (!statusResult.ok) {
        return {
          ok: false,
          message:
            statusResult.payload?.error?.message ||
            'Unable to check feedback status.',
        };
      }

      const statusPayload = statusResult.payload || {};
      const feedbackState = statusPayload.feedback || {};
      const job = feedbackState.job || null;

      if (feedbackState.ready) {
        const feedbackResult = await apiRequest(`/api/sessions/${sessionId}/feedback`);
        if (feedbackResult.status === 202) {
          messageEl.textContent =
            feedbackResult.payload?.message || 'Feedback is still processing...';
          await wait(FEEDBACK_POLL_INTERVAL_MS);
          continue;
        }

        if (!feedbackResult.ok || !Array.isArray(feedbackResult.payload?.feedback)) {
          return {
            ok: false,
            message:
              feedbackResult.payload?.error?.message ||
              'Unable to load feedback.',
          };
        }

        return {
          ok: true,
          feedbackItems: feedbackResult.payload.feedback,
        };
      }

      if (job?.status === 'failed') {
        return {
          ok: false,
          message:
            job?.lastError?.message ||
            'Feedback generation failed. Please retry this session.',
        };
      }

      if (job?.status === 'processing') {
        messageEl.textContent = `Generating feedback (attempt ${job.attempts || 1}/${job.maxAttempts || 3})...`;
      } else if (job?.status === 'queued') {
        messageEl.textContent = 'Feedback is queued and will be ready shortly...';
      } else {
        messageEl.textContent = 'Preparing feedback...';
      }

      await wait(FEEDBACK_POLL_INTERVAL_MS);
    }

    return {
      ok: false,
      message:
        'Feedback is taking longer than expected. Please refresh in a moment.',
    };
  };

  const feedbackLoadResult = await loadFeedbackWithPolling();
  if (!feedbackLoadResult.ok) {
    messageEl.textContent = feedbackLoadResult.message;
    messageEl.classList.remove('text-slate-500', 'dark:text-slate-400');
    messageEl.classList.add('text-red-400');
    return;
  }

  const feedbackItems = feedbackLoadResult.feedbackItems;
  if (!feedbackItems.length) {
    messageEl.textContent = 'No feedback generated for this session yet.';
    return;
  }

  const aggregateScores = {
    situation: average(feedbackItems.map((item) => item?.scores?.situation)),
    task: average(feedbackItems.map((item) => item?.scores?.task)),
    action: average(feedbackItems.map((item) => item?.scores?.action)),
    result: average(feedbackItems.map((item) => item?.scores?.result)),
    overall: average(feedbackItems.map((item) => item?.scores?.overall)),
  };

  const overall = toPercent(aggregateScores.overall) ?? 0;
  overallScoreValueEl.textContent = `${overall}%`;
  overallScoreRingEl.setAttribute(
    'stroke-dashoffset',
    String(DASH_ARRAY - (DASH_ARRAY * overall) / 100)
  );

  renderBreakdown(aggregateScores);
  renderSuggestions(feedbackItems);

  messageEl.textContent = `Feedback loaded for session ${sessionId.slice(-6)}.`;
});
