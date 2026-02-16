document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('history-list');
  const messageEl = document.getElementById('history-message');

  if (!listEl || !messageEl) {
    return;
  }

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

  const formatDate = (isoDate) => {
    if (!isoDate) return 'Unknown date';
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (durationSeconds) => {
    if (!Number.isFinite(durationSeconds)) return '';
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  const getTypeBadgeClass = (type) => {
    const normalized = (type || '').toLowerCase();
    if (normalized === 'behavioral') return 'bg-primary/20 text-primary';
    if (normalized === 'technical') return 'bg-purple-500/20 text-purple-400';
    if (normalized === 'leadership') return 'bg-amber-500/20 text-amber-400';
    return 'bg-slate-600/30 text-slate-300';
  };

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

  const formatTrend = (trend) => {
    if (!trend || !Number.isFinite(trend.delta)) {
      return 'No baseline yet';
    }

    const delta = Math.round(trend.delta);
    const deltaLabel = `${delta >= 0 ? '+' : ''}${delta} pts`;
    if (trend.direction === 'up') return `Improving (${deltaLabel})`;
    if (trend.direction === 'down') return `Declining (${deltaLabel})`;
    return `Stable (${deltaLabel})`;
  };

  const buildItemHtml = (session, metrics) => {
    const primaryType = session.questionTypes?.[0] || 'General';
    const statusLabel = (session.status || 'unknown').replace('_', ' ');
    const dateLabel = formatDate(session.completedAt || session.startedAt);
    const questionLabel = session.previewQuestion || 'Interview practice session';
    const shortQuestionLabel =
      questionLabel.length > 110
        ? `${questionLabel.slice(0, 107)}...`
        : questionLabel;
    const badgeClass = getTypeBadgeClass(primaryType);
    const duration = formatDuration(session.duration);
    const scoreLabel =
      metrics?.overallScore === null || metrics?.overallScore === undefined
        ? '--'
        : `${Math.round(metrics.overallScore)}%`;
    const feedbackHref = `/feedback.html?sessionId=${encodeURIComponent(
      session.id
    )}`;
    const details = duration ? `${statusLabel} • ${dateLabel} • ${duration}` : `${statusLabel} • ${dateLabel}`;
    const isAirMode = Boolean(session.airMode || metrics?.airMode);
    const roleFit = toPercent(metrics?.roleFitScore);
    const coverage = toPercent(metrics?.competencyCoverage);
    const trendLabel = formatTrend(metrics?.trend);
    const retryLabel =
      Number.isFinite(metrics?.extraAttempts) && metrics.extraAttempts > 0
        ? ` • Retries ${Math.round(metrics.extraAttempts)}`
        : '';
    const airDetails = isAirMode
      ? `
      <p class="text-xs text-primary/80 mt-2">
        AIR mode • Role fit ${roleFit === null ? '--' : `${roleFit}%`} • Coverage ${
          coverage === null ? '--' : `${coverage}%`
        } • ${escapeHtml(trendLabel)}
      </p>
    `
      : '';
    const airBadge = isAirMode
      ? `
            <span class="inline-block mb-2 bg-primary/15 text-primary text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded">
              AIR
            </span>
          `
      : '';

    return `
      <div class="history-item" data-session-id="${escapeHtml(session.id)}">
        <div>
          ${airBadge}
          <span class="inline-block mb-2 ${badgeClass} text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded">
            ${escapeHtml(primaryType)}
          </span>
          <h3 class="text-lg font-bold text-white">${escapeHtml(shortQuestionLabel)}</h3>
          <p class="text-sm text-slate-400 mt-1">${escapeHtml(details)}${escapeHtml(retryLabel)}</p>
          ${airDetails}
        </div>
        <div class="flex items-center gap-4">
          <div class="text-center">
            <p class="text-xs uppercase tracking-wider text-slate-400">Score</p>
            <p class="text-xl font-bold text-primary">${scoreLabel}</p>
          </div>
          <a href="${feedbackHref}" class="interview-btn-primary">
            View Feedback
          </a>
        </div>
      </div>
    `;
  };

  messageEl.textContent = 'Loading history...';

  const historyResult = await apiRequest('/api/history?page=1&limit=20');
  if (!historyResult.ok) {
    messageEl.textContent =
      historyResult.payload?.error?.message || 'Unable to load interview history.';
    messageEl.classList.remove('text-slate-400');
    messageEl.classList.add('text-red-400');
    return;
  }

  const sessions = historyResult.payload?.sessions || [];
  if (!sessions.length) {
    messageEl.textContent = 'No interview sessions found yet. Start one to build your history.';
    listEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = sessions
    .map((session) => buildItemHtml(session, session.feedbackSummary || null))
    .join('');

  messageEl.textContent = `Loaded ${sessions.length} session${
    sessions.length === 1 ? '' : 's'
  }.`;
});
