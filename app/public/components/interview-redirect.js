document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('start-interview-btn');
  const submitBtn = document.getElementById('submit-response-btn');
  const responseInput = document.getElementById('response-input');
  const recordingEmoji = document.getElementById('recording-emoji');
  const recordingText = document.getElementById('recording-text');
  const messageEl = document.getElementById('interview-message');
  const questionMeta = document.getElementById('question-meta');
  const questionPrompt = document.getElementById('question-prompt');

  if (
    !startBtn ||
    !submitBtn ||
    !responseInput ||
    !recordingEmoji ||
    !recordingText ||
    !messageEl ||
    !questionMeta ||
    !questionPrompt
  ) {
    return;
  }

  let currentQuestion = null;
  let sessionId = null;

  const setMessage = (message, isError = false) => {
    messageEl.textContent = message;
    messageEl.classList.remove('text-red-400', 'text-slate-400');
    messageEl.classList.add(isError ? 'text-red-400' : 'text-slate-400');
  };

  const setPrompt = (question) => {
    const type = question.type || 'general';
    const difficulty = question.difficulty || 'unknown';
    const category = question.category || type;
    const questionText =
      question.questionText || question.description || question.title || '';

    questionMeta.textContent = `${type} • ${difficulty} • ${category}`;
    questionPrompt.textContent = questionText || 'Question unavailable.';
  };

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

  const loadQuestion = async () => {
    setMessage('Fetching a practice question...');
    const questionResult = await apiRequest('/api/questions?limit=1');

    if (!questionResult.ok || !questionResult.payload?.questions?.length) {
      setMessage(
        questionResult.payload?.error?.message ||
          'Unable to load interview question.',
        true
      );
      questionMeta.textContent = 'Unavailable';
      questionPrompt.textContent =
        'No question could be loaded right now. Please try again.';
      return;
    }

    currentQuestion = questionResult.payload.questions[0];
    setPrompt(currentQuestion);
    startBtn.disabled = false;
    setMessage('Question ready. Press Start to begin your session.');
  };

  startBtn.addEventListener('click', async () => {
    if (!currentQuestion?.id) {
      setMessage('Question is not ready yet. Please wait a moment.', true);
      return;
    }

    startBtn.disabled = true;
    setMessage('Creating interview session...');

    const createResult = await apiRequest('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds: [currentQuestion.id] }),
    });

    if (!createResult.ok || !createResult.payload?.session?.id) {
      startBtn.disabled = false;
      setMessage(
        createResult.payload?.error?.message || 'Unable to start session.',
        true
      );
      return;
    }

    sessionId = createResult.payload.session.id;
    recordingEmoji.classList.remove('hidden');
    recordingText.textContent = 'Recording...';
    responseInput.classList.remove('hidden');
    submitBtn.classList.remove('hidden');
    submitBtn.disabled = true;
    responseInput.disabled = false;
    responseInput.focus();
    setMessage('Session started. Write your response and submit.');
  });

  responseInput.addEventListener('input', () => {
    const minLength = 50;
    const textLength = responseInput.value.trim().length;
    submitBtn.disabled = textLength < minLength;
    if (textLength > 0 && textLength < minLength) {
      setMessage(`Keep going. Minimum ${minLength} characters required.`);
    } else if (textLength >= minLength) {
      setMessage('Response length looks good. You can submit now.');
    }
  });

  submitBtn.addEventListener('click', async () => {
    if (!sessionId || !currentQuestion?.id) {
      setMessage('Session has not started correctly. Please retry.', true);
      return;
    }

    const responseText = responseInput.value.trim();
    if (responseText.length < 50) {
      setMessage('Response is too short. Please provide more detail.', true);
      return;
    }

    submitBtn.disabled = true;
    responseInput.disabled = true;
    setMessage('Submitting your response...');

    const submitResponseResult = await apiRequest(
      `/api/sessions/${sessionId}/responses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          responseText,
        }),
      }
    );

    if (!submitResponseResult.ok) {
      responseInput.disabled = false;
      submitBtn.disabled = false;
      setMessage(
        submitResponseResult.payload?.error?.message ||
          'Failed to submit response.',
        true
      );
      return;
    }

    setMessage('Completing session...');
    const completeResult = await apiRequest(`/api/sessions/${sessionId}/complete`, {
      method: 'POST',
    });

    if (!completeResult.ok) {
      responseInput.disabled = false;
      submitBtn.disabled = false;
      setMessage(
        completeResult.payload?.error?.message || 'Failed to complete session.',
        true
      );
      return;
    }

    recordingText.textContent = 'Completed';
    const nextUrl = `/feedback.html?sessionId=${encodeURIComponent(sessionId)}`;
    setMessage('Session completed. Redirecting to feedback...');
    window.location.href = nextUrl;
  });

  await loadQuestion();
});
