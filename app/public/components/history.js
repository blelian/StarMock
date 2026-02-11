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

  const buildItemHtml = (session, score) => {
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
      score === null || score === undefined ? '--' : `${Math.round(score)}%`;
    const feedbackHref = `/feedback.html?sessionId=${encodeURIComponent(
      session.id
    )}`;
    const details = duration ? `${statusLabel} • ${dateLabel} • ${duration}` : `${statusLabel} • ${dateLabel}`;

    return `
      <div class="history-item">
        <div>
          <span class="inline-block mb-2 ${badgeClass} text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded">
            ${escapeHtml(primaryType)}
          </span>
          <h3 class="text-lg font-bold text-white">${escapeHtml(shortQuestionLabel)}</h3>
          <p class="text-sm text-slate-400 mt-1">${escapeHtml(details)}</p>
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

  const fetchSessionScore = async (sessionId, status) => {
    if (status !== 'completed') {
      return null;
    }

    const feedbackResult = await apiRequest(`/api/sessions/${sessionId}/feedback`);
    if (!feedbackResult.ok || !Array.isArray(feedbackResult.payload?.feedback)) {
      return null;
    }

    const scores = feedbackResult.payload.feedback
      .map((item) => item?.scores?.overall)
      .filter((value) => Number.isFinite(value));

    if (!scores.length) {
      return null;
    }

    const total = scores.reduce((sum, value) => sum + value, 0);
    return total / scores.length;
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

  const sessionScores = await Promise.all(
    sessions.map((session) => fetchSessionScore(session.id, session.status))
  );

  listEl.innerHTML = sessions
    .map((session, index) => buildItemHtml(session, sessionScores[index]))
    .join('');

  messageEl.textContent = `Loaded ${sessions.length} session${
    sessions.length === 1 ? '' : 's'
  }.`;
});
