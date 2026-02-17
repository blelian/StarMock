/* global webkitSpeechRecognition */
document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('start-interview-btn')
  const repeatQuestionBtn = document.getElementById('repeat-question-btn')
  const prevQuestionBtn = document.getElementById('prev-question-btn')
  const nextQuestionBtn = document.getElementById('next-question-btn')
  const completeSessionBtn = document.getElementById('complete-session-btn')
  const submitBtn = document.getElementById('submit-response-btn')
  const responseInput = document.getElementById('response-input')
  const recordingEmoji = document.getElementById('recording-emoji')
  const recordingText = document.getElementById('recording-text')
  const recordingDuration = document.getElementById('recording-duration')
  const recordToggleBtn = document.getElementById('record-toggle-btn')
  const transcriptWarning = document.getElementById('transcript-warning')
  const messageEl = document.getElementById('interview-message')
  const questionMeta = document.getElementById('question-meta')
  const questionPrompt = document.getElementById('question-prompt')
  const questionProgressText = document.getElementById('question-progress-text')
  const questionAttemptLabel = document.getElementById('question-attempt-label')
  const sessionProgressPill = document.getElementById('session-progress-pill')
  const sessionAnsweredValue = document.getElementById('session-answered-value')
  const sessionAnsweredDelta = document.getElementById('session-answered-delta')
  const sessionAttemptsValue = document.getElementById('session-attempts-value')
  const sessionRetriesDelta = document.getElementById('session-retries-delta')
  const srAnnouncer = document.getElementById('sr-announcer')
  const careerProfileOverlay = document.getElementById('career-profile-overlay')
  const careerProfileForm = document.getElementById('career-profile-form')
  const careerProfileMessage = document.getElementById('career-profile-message')
  const careerProfileSubmitBtn = document.getElementById(
    'career-profile-submit-btn'
  )
  const careerProfileSkipBtn = document.getElementById(
    'career-profile-skip-btn'
  )
  const careerJobTitleInput = document.getElementById('career-job-title')
  const careerIndustrySelect = document.getElementById('career-industry')
  const careerSenioritySelect = document.getElementById('career-seniority')
  const careerJobDescriptionInput = document.getElementById(
    'career-job-description'
  )
  const careerContextBadge = document.getElementById('career-context-badge')
  const careerContextText = document.getElementById('career-context-text')
  const careerContextEditBtn = document.getElementById(
    'career-context-edit-btn'
  )
  const readAloudBtn = document.getElementById('read-aloud-btn')
  const readAloudLabel = document.getElementById('read-aloud-label')

  if (
    !startBtn ||
    !submitBtn ||
    !responseInput ||
    !recordingEmoji ||
    !recordingText ||
    !messageEl ||
    !questionMeta ||
    !questionPrompt ||
    !recordToggleBtn ||
    !recordingDuration ||
    !transcriptWarning
  ) {
    return
  }

  const liveTranscriptIndicator = document.getElementById(
    'live-transcript-indicator'
  )
  const liveTranscriptStatus = document.getElementById('live-transcript-status')

  const DEFAULT_SESSION_QUESTION_COUNT = 3
  const DRAFT_STORAGE_KEY_PREFIX = 'starmock:interview-draft:'
  let currentQuestion = null
  let preparedQuestions = []
  let sessionQuestions = []
  let currentQuestionIndex = 0
  let sessionId = null
  let sessionProgress = null
  let mediaRecorder = null
  let mediaStream = null
  let recordingStartTime = null
  let recordingTimer = null
  let recordingDurationSeconds = 0
  let recordedChunks = []
  let uploadedAudioUrl = null
  let uploadedAudioMimeType = null
  let transcriptConfidence = null
  let careerProfile = null
  let isAirMode = false
  let allowNavigationWithoutWarning = false
  let unloadAbandonRequested = false
  let featureFlags = {
    aiRecording: true,
    audioUploads: true,
    transcription: true,
  }

  // Browser-native speech recognition (Web Speech API)
  let speechRecognition = null
  let liveTranscriptParts = [] // accumulates finalized sentences
  let interimTranscript = '' // current in-progress phrase

  const SpeechRecognitionAPI =
    typeof webkitSpeechRecognition !== 'undefined'
      ? webkitSpeechRecognition
      : typeof SpeechRecognition !== 'undefined'
        ? SpeechRecognition
        : null

  const hasSpeechRecognitionSupport = !!SpeechRecognitionAPI

  // ---------- Text-to-Speech (question read-aloud) ----------
  const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null
  let ttsUtterance = null
  let isSpeaking = false
  let preferredVoice = null

  const pickPreferredVoice = () => {
    if (!synth) return null
    const voices = synth.getVoices()
    if (!Array.isArray(voices) || voices.length === 0) return null

    const englishVoices = voices.filter((voice) =>
      String(voice.lang || '')
        .toLowerCase()
        .startsWith('en')
    )
    const voicePool = englishVoices.length > 0 ? englishVoices : voices
    const localCandidate = voicePool.find((voice) => voice.localService)
    const naturalCandidate = voicePool.find((voice) =>
      /(natural|neural|enhanced|premium)/i.test(String(voice.name || ''))
    )
    return naturalCandidate || localCandidate || voicePool[0] || null
  }

  if (synth) {
    preferredVoice = pickPreferredVoice()
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.onvoiceschanged = () => {
        preferredVoice = pickPreferredVoice()
      }
    }
  }

  const stopSpeaking = () => {
    if (synth) synth.cancel()
    isSpeaking = false
    ttsUtterance = null
    if (readAloudBtn && readAloudLabel) {
      readAloudLabel.textContent = 'Read Aloud'
      readAloudBtn.setAttribute('aria-label', 'Read question aloud')
      const icon = readAloudBtn.querySelector('.material-icons-round')
      if (icon) icon.textContent = 'volume_up'
    }
  }

  const speakQuestion = () => {
    if (!synth || !questionPrompt) return
    const text = (questionPrompt.textContent || '').trim()
    if (!text || text === 'Loading interview prompt...') return

    if (isSpeaking) {
      stopSpeaking()
      return
    }

    ttsUtterance = new SpeechSynthesisUtterance(text)
    ttsUtterance.rate = 0.98
    ttsUtterance.pitch = 1
    ttsUtterance.lang = document.documentElement.lang || 'en-US'
    if (preferredVoice) {
      ttsUtterance.voice = preferredVoice
      ttsUtterance.lang = preferredVoice.lang || ttsUtterance.lang
    }

    ttsUtterance.onstart = () => {
      isSpeaking = true
      if (readAloudLabel) readAloudLabel.textContent = 'Stop'
      if (readAloudBtn) {
        readAloudBtn.setAttribute('aria-label', 'Stop reading')
        const icon = readAloudBtn.querySelector('.material-icons-round')
        if (icon) icon.textContent = 'stop'
      }
      announce('Reading question aloud.')
    }

    ttsUtterance.onend = () => {
      stopSpeaking()
      announce('Finished reading question.')
    }
    ttsUtterance.onerror = () => {
      stopSpeaking()
      setMessage(
        'Question readout is unavailable in this browser session.',
        true
      )
    }

    synth.speak(ttsUtterance)
  }

  if (readAloudBtn) {
    readAloudBtn.addEventListener('click', speakQuestion)
  }

  // Cancel TTS when the page is unloaded to avoid orphaned speech
  window.addEventListener('beforeunload', () => stopSpeaking())

  const hasMediaRecorderSupport =
    typeof MediaRecorder !== 'undefined' &&
    !!navigator?.mediaDevices?.getUserMedia
  const isAudioRecordingEnabled = () =>
    hasMediaRecorderSupport &&
    featureFlags.aiRecording !== false &&
    featureFlags.audioUploads !== false

  const announce = (message) => {
    if (!srAnnouncer) return
    srAnnouncer.textContent = ''
    window.requestAnimationFrame(() => {
      srAnnouncer.textContent = message
    })
  }

  let messageTimeout = null

  const setMessage = (message, isError = false, { durationMs = 0 } = {}) => {
    if (messageTimeout) {
      clearTimeout(messageTimeout)
      messageTimeout = null
    }
    messageEl.textContent = message
    messageEl.classList.remove(
      'text-red-400',
      'text-slate-400',
      'text-primary',
      'text-amber-400'
    )
    messageEl.classList.add(isError ? 'text-red-400' : 'text-slate-400')
    announce(message)

    if (durationMs > 0) {
      messageTimeout = setTimeout(() => {
        messageEl.textContent = ''
        messageTimeout = null
      }, durationMs)
    }
  }

  const setSuccessMessage = (message, { durationMs = 4000 } = {}) => {
    if (messageTimeout) {
      clearTimeout(messageTimeout)
      messageTimeout = null
    }
    messageEl.textContent = `✓ ${message}`
    messageEl.classList.remove(
      'text-red-400',
      'text-slate-400',
      'text-amber-400'
    )
    messageEl.classList.add('text-primary')
    announce(message)
    if (durationMs > 0) {
      messageTimeout = setTimeout(() => {
        messageEl.textContent = ''
        messageTimeout = null
      }, durationMs)
    }
  }

  // -- Loading state helpers: show spinner text on buttons during async work --
  const setButtonLoading = (button, loadingText) => {
    if (!button) return
    button.disabled = true
    button.setAttribute('data-original-text', button.textContent)
    button.textContent = `⏳ ${loadingText}`
  }

  const clearButtonLoading = (button) => {
    if (!button) return
    const original = button.getAttribute('data-original-text')
    if (original) button.textContent = original
    button.removeAttribute('data-original-text')
    // NOTE: caller decides whether to re-enable the button
  }

  // -- Retry wrapper: retries an async fn up to maxRetries times with backoff --
  const withRetry = async (
    asyncFn,
    {
      maxRetries = 2,
      baseDelayMs = 1000,
      onRetry = null,
      label = 'Operation',
    } = {}
  ) => {
    let lastError = null
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await asyncFn(attempt)
      } catch (error) {
        lastError = error
        if (attempt < maxRetries) {
          const delay = baseDelayMs * 2 ** attempt
          if (onRetry) {
            onRetry(attempt + 1, maxRetries, delay)
          } else {
            setMessage(
              `${label} failed. Retrying (${attempt + 1}/${maxRetries})...`,
              true
            )
          }
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw lastError
  }

  const toNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : ''

  const toTitleCase = (value) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => token[0].toUpperCase() + token.slice(1))
      .join(' ')

  const normalizeCareerProfile = (profile) => {
    if (!profile || typeof profile !== 'object') {
      return null
    }

    const targetJobTitle = toNonEmptyString(profile.targetJobTitle)
    const industry = toNonEmptyString(profile.industry).toLowerCase()
    const seniority = toNonEmptyString(profile.seniority).toLowerCase()
    const jobDescriptionText = toNonEmptyString(profile.jobDescriptionText)

    return {
      targetJobTitle,
      industry,
      seniority,
      jobDescriptionText,
      updatedAt: profile.updatedAt || null,
    }
  }

  const isCareerProfileComplete = (profile) =>
    Boolean(profile?.targetJobTitle && profile?.industry && profile?.seniority)

  const toggleCareerProfileOverlay = (visible) => {
    if (!careerProfileOverlay) return
    careerProfileOverlay.classList.toggle('hidden', !visible)
  }

  const setCareerProfileMessage = (message, isError = true) => {
    if (!careerProfileMessage) return
    careerProfileMessage.textContent = message
    careerProfileMessage.classList.remove(
      'hidden',
      'text-red-400',
      'text-primary'
    )
    careerProfileMessage.classList.add(
      isError ? 'text-red-400' : 'text-primary'
    )
  }

  const clearCareerProfileMessage = () => {
    if (!careerProfileMessage) return
    careerProfileMessage.textContent = ''
    careerProfileMessage.classList.add('hidden')
    careerProfileMessage.classList.remove('text-red-400', 'text-primary')
  }

  const setCareerProfileSubmitting = (isSubmitting) => {
    if (careerProfileSubmitBtn) {
      careerProfileSubmitBtn.disabled = isSubmitting
    }
    if (careerProfileSkipBtn) {
      careerProfileSkipBtn.disabled = isSubmitting
    }
  }

  const renderCareerContext = () => {
    if (!careerContextBadge || !careerContextText) return

    if (!isAirMode || !isCareerProfileComplete(careerProfile)) {
      careerContextBadge.classList.add('hidden')
      careerContextText.textContent = ''
      return
    }

    const industry = toTitleCase(careerProfile.industry)
    const seniority = toTitleCase(careerProfile.seniority)
    careerContextText.textContent = `${careerProfile.targetJobTitle} • ${industry} • ${seniority}`
    careerContextBadge.classList.remove('hidden')
  }

  const fillCareerProfileInputs = (profile) => {
    if (!profile) return
    if (careerJobTitleInput) {
      careerJobTitleInput.value = profile.targetJobTitle || ''
    }
    if (careerIndustrySelect) {
      careerIndustrySelect.value = profile.industry || ''
    }
    if (careerSenioritySelect) {
      careerSenioritySelect.value = profile.seniority || ''
    }
    if (careerJobDescriptionInput) {
      careerJobDescriptionInput.value = profile.jobDescriptionText || ''
    }
  }

  const readCareerProfileFromInputs = () => ({
    targetJobTitle: toNonEmptyString(careerJobTitleInput?.value),
    industry: toNonEmptyString(careerIndustrySelect?.value).toLowerCase(),
    seniority: toNonEmptyString(careerSenioritySelect?.value).toLowerCase(),
    jobDescriptionText: toNonEmptyString(careerJobDescriptionInput?.value),
  })

  const toQuestionId = (question) => {
    if (!question) return ''
    if (typeof question === 'string') return question
    return String(question.id || question._id || '')
  }

  const getDraftStorageKey = (activeSessionId, questionId) => {
    const normalizedSessionId = String(activeSessionId || '').trim()
    const normalizedQuestionId = String(questionId || '').trim()
    if (!normalizedSessionId || !normalizedQuestionId) {
      return ''
    }
    return `${DRAFT_STORAGE_KEY_PREFIX}${normalizedSessionId}:${normalizedQuestionId}`
  }

  const getStoredDraft = (activeSessionId, questionId) => {
    const storageKey = getDraftStorageKey(activeSessionId, questionId)
    if (!storageKey) return null

    try {
      const rawValue = window.localStorage.getItem(storageKey)
      if (!rawValue) return null
      const parsed = JSON.parse(rawValue)
      if (!parsed || typeof parsed !== 'object') return null
      return {
        text: typeof parsed.text === 'string' ? parsed.text : '',
        updatedAt: parsed.updatedAt || null,
      }
    } catch {
      return null
    }
  }

  const clearDraftForQuestion = (activeSessionId, questionId) => {
    const storageKey = getDraftStorageKey(activeSessionId, questionId)
    if (!storageKey) return
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // localStorage may be blocked in strict browser modes
    }
  }

  const clearSessionDrafts = (activeSessionId) => {
    const normalizedSessionId = String(activeSessionId || '').trim()
    if (!normalizedSessionId) return

    const uniqueQuestionIds = new Set(
      (Array.isArray(sessionQuestions) ? sessionQuestions : [])
        .map((question) => toQuestionId(question))
        .filter(Boolean)
    )

    for (const questionId of uniqueQuestionIds) {
      clearDraftForQuestion(normalizedSessionId, questionId)
    }
  }

  const saveCurrentDraft = () => {
    if (!sessionId || !currentQuestion) return

    const questionId = toQuestionId(currentQuestion)
    const storageKey = getDraftStorageKey(sessionId, questionId)
    if (!storageKey) return

    const text = responseInput.value || ''
    if (!text.trim()) {
      clearDraftForQuestion(sessionId, questionId)
      return
    }

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          text,
          updatedAt: new Date().toISOString(),
        })
      )
    } catch {
      // localStorage may be blocked in strict browser modes
    }
  }

  const restoreDraftForCurrentQuestion = () => {
    if (!sessionId || !currentQuestion) return
    const questionId = toQuestionId(currentQuestion)
    const draft = getStoredDraft(sessionId, questionId)
    if (!draft || !draft.text) return

    responseInput.value = draft.text
    transcriptConfidence = estimateTranscriptConfidence(responseInput.value)
    updateTranscriptWarning()
    updateSubmitState()
    setMessage('Restored your unsent draft for this question.')
  }

  const hasPendingSessionWork = () => {
    if (!sessionId || sessionProgress?.isComplete) {
      return false
    }
    return true
  }

  const abandonSessionOnUnload = () => {
    if (
      unloadAbandonRequested ||
      allowNavigationWithoutWarning ||
      !sessionId ||
      sessionProgress?.isComplete
    ) {
      return
    }

    unloadAbandonRequested = true
    const activeSessionId = sessionId
    clearSessionDrafts(activeSessionId)
    try {
      fetch(`/api/sessions/${activeSessionId}/abandon`, {
        method: 'PATCH',
        credentials: 'include',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'page_unload',
        }),
      }).catch(() => {})
    } catch {
      // keepalive is best-effort
    }
  }

  const createEmptyProgress = () => ({
    totalQuestions: sessionQuestions.length || preparedQuestions.length || 0,
    answeredQuestions: 0,
    remainingQuestions:
      sessionQuestions.length || preparedQuestions.length || 0,
    totalAttempts: 0,
    repeatedQuestions: 0,
    extraAttempts: 0,
    isComplete: false,
    questions: [],
  })

  const getQuestionProgress = (questionId) => {
    const normalizedId = toQuestionId(questionId)
    const progressList = Array.isArray(sessionProgress?.questions)
      ? sessionProgress.questions
      : []
    return (
      progressList.find(
        (item) => String(item?.questionId || '') === normalizedId
      ) || {
        questionId: normalizedId,
        attempts: 0,
        answered: false,
        repeated: false,
      }
    )
  }

  const updateSessionStats = () => {
    const fallbackTotal =
      sessionQuestions.length || preparedQuestions.length || 0
    const progress = sessionProgress || createEmptyProgress()
    const totalQuestions =
      Number.isFinite(progress.totalQuestions) && progress.totalQuestions >= 0
        ? progress.totalQuestions
        : fallbackTotal
    const answeredQuestions =
      Number.isFinite(progress.answeredQuestions) &&
      progress.answeredQuestions >= 0
        ? progress.answeredQuestions
        : 0
    const totalAttempts =
      Number.isFinite(progress.totalAttempts) && progress.totalAttempts >= 0
        ? progress.totalAttempts
        : 0
    const retries =
      Number.isFinite(progress.extraAttempts) && progress.extraAttempts >= 0
        ? progress.extraAttempts
        : Math.max(totalAttempts - answeredQuestions, 0)

    if (sessionAnsweredValue) {
      sessionAnsweredValue.textContent = `${answeredQuestions}/${totalQuestions}`
    }
    if (sessionAnsweredDelta) {
      sessionAnsweredDelta.textContent =
        sessionId && totalQuestions > 0
          ? `${Math.max(totalQuestions - answeredQuestions, 0)} remaining`
          : 'Session idle'
    }
    if (sessionAttemptsValue) {
      sessionAttemptsValue.textContent = String(totalAttempts)
    }
    if (sessionRetriesDelta) {
      sessionRetriesDelta.textContent = `Retries ${retries}`
    }

    if (sessionProgressPill) {
      if (!sessionId) {
        sessionProgressPill.textContent = 'Session idle'
      } else if (progress.isComplete) {
        sessionProgressPill.textContent = 'Ready to complete'
      } else {
        sessionProgressPill.textContent = `${answeredQuestions}/${totalQuestions} answered`
      }
    }
  }

  const updateQuestionProgressText = () => {
    const totalQuestions =
      sessionQuestions.length || preparedQuestions.length || 0
    const currentNumber = totalQuestions > 0 ? currentQuestionIndex + 1 : 0
    const currentQuestionId = toQuestionId(currentQuestion)
    const progressForQuestion = getQuestionProgress(currentQuestionId)
    const attempts = Number(progressForQuestion.attempts || 0)
    const nextAttempt = Math.max(attempts + 1, 1)

    if (questionProgressText) {
      if (!currentQuestion) {
        questionProgressText.textContent = 'Question progress will appear here.'
      } else {
        questionProgressText.textContent = `Question ${currentNumber} of ${totalQuestions} • ${attempts} submitted`
      }
    }

    if (questionAttemptLabel) {
      questionAttemptLabel.textContent = `Attempt ${nextAttempt}`
    }
  }

  const setControlVisibility = (element, visible) => {
    if (!element) return
    element.classList.toggle('hidden', !visible)
  }

  const syncProgress = (progress) => {
    if (progress && typeof progress === 'object') {
      sessionProgress = progress
    } else {
      sessionProgress = createEmptyProgress()
    }
    updateSessionStats()
    updateQuestionProgressText()
    if (typeof refreshSessionControls === 'function') {
      refreshSessionControls()
    }
  }

  const setPrompt = (question) => {
    const type = question.type || 'general'
    const difficulty = question.difficulty || 'unknown'
    const category = question.category || type
    const questionText =
      question.questionText || question.description || question.title || ''

    const modeLabel = isAirMode ? 'AIR' : 'Generic'
    questionMeta.textContent = `${modeLabel} • ${type} • ${difficulty} • ${category}`
    questionPrompt.textContent = questionText || 'Question unavailable.'

    // Stop any ongoing speech and show/hide Read Aloud button
    stopSpeaking()
    if (readAloudBtn) {
      readAloudBtn.classList.toggle('hidden', !(synth && questionText))
    }
    updateQuestionProgressText()
  }

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

  const formatDuration = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds))
    const mins = Math.floor(safeSeconds / 60)
    const secs = safeSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const updateRecordingDuration = () => {
    if (!recordingStartTime) {
      recordingDuration.classList.add('hidden')
      recordingDuration.textContent = '00:00'
      // Don't reset recordingDurationSeconds here - it may have been captured in onstop handler
      return
    }

    recordingDurationSeconds = (Date.now() - recordingStartTime) / 1000
    recordingDuration.textContent = formatDuration(recordingDurationSeconds)
    recordingDuration.classList.remove('hidden')
  }

  const estimateTranscriptConfidence = (text) => {
    const cleaned = text.trim()
    if (!cleaned) {
      return 0.45
    }

    const wordCount = cleaned.split(/\s+/).length
    if (wordCount >= 80) return 0.9
    if (wordCount >= 50) return 0.8
    if (wordCount >= 20) return 0.7
    return 0.55
  }

  const updateTranscriptWarning = () => {
    const isAudioMode = !!uploadedAudioUrl
    if (!isAudioMode) {
      transcriptWarning.classList.add('hidden')
      return
    }

    const confidence =
      transcriptConfidence ?? estimateTranscriptConfidence(responseInput.value)
    if (confidence < 0.75) {
      transcriptWarning.classList.remove('hidden')
    } else {
      transcriptWarning.classList.add('hidden')
    }
  }

  const updateSubmitState = () => {
    const hasActiveSession = Boolean(sessionId && currentQuestion)
    if (!hasActiveSession) {
      submitBtn.disabled = true
      if (recordToggleBtn) recordToggleBtn.disabled = true
      if (nextQuestionBtn) nextQuestionBtn.disabled = true
      if (prevQuestionBtn) prevQuestionBtn.disabled = true
      if (repeatQuestionBtn) repeatQuestionBtn.disabled = true
      if (completeSessionBtn) completeSessionBtn.disabled = true
      refreshSessionControls()
      return
    }

    const minLength = uploadedAudioUrl ? 20 : 50
    submitBtn.disabled = responseInput.value.trim().length < minLength

    // Enable record button if audio recording is available
    if (recordToggleBtn && isAudioRecordingEnabled()) {
      recordToggleBtn.disabled = false
    }
    updateTranscriptWarning()
    refreshSessionControls()
  }

  const refreshSessionControls = () => {
    const hasActiveSession = Boolean(sessionId)
    const currentQuestionId = toQuestionId(currentQuestion)
    const currentProgress = getQuestionProgress(currentQuestionId)
    const hasAnsweredCurrent = Boolean(currentProgress.answered)
    const isRecordingActive = Boolean(
      mediaRecorder && mediaRecorder.state === 'recording'
    )
    const hasNextQuestion =
      Array.isArray(sessionQuestions) &&
      currentQuestionIndex < sessionQuestions.length - 1
    const hasPrevQuestion =
      Array.isArray(sessionQuestions) && currentQuestionIndex > 0

    setControlVisibility(startBtn, !hasActiveSession)
    // Enable Start button when visible — startSession() will auto-fetch
    // questions if none are prepared yet.
    if (startBtn && !hasActiveSession) {
      startBtn.disabled = isRecordingActive
    }
    setControlVisibility(
      repeatQuestionBtn,
      hasActiveSession && Boolean(currentQuestion)
    )
    setControlVisibility(
      prevQuestionBtn,
      hasActiveSession &&
        Boolean(currentQuestion) &&
        sessionQuestions.length > 1
    )
    setControlVisibility(
      nextQuestionBtn,
      hasActiveSession &&
        Boolean(currentQuestion) &&
        sessionQuestions.length > 1
    )
    setControlVisibility(completeSessionBtn, hasActiveSession)

    if (repeatQuestionBtn) {
      repeatQuestionBtn.disabled = !hasAnsweredCurrent || isRecordingActive
    }
    if (prevQuestionBtn) {
      prevQuestionBtn.disabled = !hasPrevQuestion || isRecordingActive
    }
    if (nextQuestionBtn) {
      nextQuestionBtn.disabled =
        !hasAnsweredCurrent || !hasNextQuestion || isRecordingActive
    }
    if (completeSessionBtn) {
      completeSessionBtn.disabled =
        !sessionProgress?.isComplete || isRecordingActive
    }

    renderQuestionNav()
  }

  // -- Question navigation mini-map: clickable dots showing progress --
  const questionNavContainer = document.getElementById('question-nav-map')

  const renderQuestionNav = () => {
    if (!questionNavContainer) return

    if (
      !sessionId ||
      !Array.isArray(sessionQuestions) ||
      !sessionQuestions.length
    ) {
      questionNavContainer.classList.add('hidden')
      questionNavContainer.innerHTML = ''
      return
    }

    questionNavContainer.classList.remove('hidden')

    const progressList = Array.isArray(sessionProgress?.questions)
      ? sessionProgress.questions
      : []
    const answeredLookup = new Map(
      progressList
        .filter((item) => item?.answered)
        .map((item) => [String(item.questionId || ''), item])
    )

    const dots = sessionQuestions
      .map((question, index) => {
        const qId = toQuestionId(question)
        const isAnswered = answeredLookup.has(qId)
        const isCurrent = index === currentQuestionIndex

        let dotClasses =
          'w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all duration-200 border-2'

        if (isCurrent) {
          dotClasses +=
            ' bg-primary text-background-dark border-primary ring-2 ring-primary/30 scale-110'
        } else if (isAnswered) {
          dotClasses +=
            ' bg-primary/20 text-primary border-primary/40 hover:bg-primary/30'
        } else {
          dotClasses +=
            ' bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
        }

        const label = isAnswered ? '✓' : String(index + 1)
        const title = `Question ${index + 1}${isAnswered ? ' (answered)' : ''}${isCurrent ? ' (current)' : ''}`

        return `<button type="button" class="${dotClasses}" data-question-index="${index}" title="${title}" aria-label="${title}">${label}</button>`
      })
      .join('')

    questionNavContainer.innerHTML = dots

    // Attach click handlers
    questionNavContainer
      .querySelectorAll('[data-question-index]')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetIndex = Number(btn.getAttribute('data-question-index'))
          moveToQuestion(targetIndex)
          renderQuestionNav()
        })
      })
  }

  const resetRecordingState = () => {
    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
    recordingStartTime = null
    updateRecordingDuration()

    // Reset toggle button to "Start Recording" state
    if (recordToggleBtn) {
      recordToggleBtn.disabled = false
      recordToggleBtn.textContent = '🎙️ Start Recording'
      recordToggleBtn.setAttribute('data-recording', 'false')
      // Remove only the recording-specific classes, keep visibility state
      recordToggleBtn.classList.remove('bg-slate-700', 'hover:bg-slate-600')
      recordToggleBtn.classList.add('bg-rose-500', 'hover:bg-rose-500/90')
    }
  }

  const cleanupMedia = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
    mediaRecorder = null
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }
    resetRecordingState()
  }

  const discardActiveRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      try {
        mediaRecorder.ondataavailable = null
        mediaRecorder.onstop = null
        mediaRecorder.stop()
      } catch {
        // ignore teardown race conditions
      }
    }
  }

  const resetResponseDraft = (
    clearText = true,
    { clearStoredDraft = false } = {}
  ) => {
    const activeQuestionId = toQuestionId(currentQuestion)
    const activeSessionId = sessionId
    stopSpeaking()
    stopSpeechRecognition()
    discardActiveRecording()
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }
    mediaRecorder = null
    recordedChunks = []
    uploadedAudioUrl = null
    uploadedAudioMimeType = null
    transcriptConfidence = null
    if (clearText) {
      responseInput.value = ''
      if (clearStoredDraft && activeSessionId && activeQuestionId) {
        clearDraftForQuestion(activeSessionId, activeQuestionId)
      }
    }
    responseInput.disabled = !sessionId
    resetRecordingState()
    updateTranscriptWarning()
    updateSubmitState()
  }

  const showLiveTranscriptIndicator = (text) => {
    if (liveTranscriptIndicator) {
      liveTranscriptIndicator.classList.remove('hidden')
      liveTranscriptIndicator.style.display = 'flex'
    }
    if (liveTranscriptStatus) {
      liveTranscriptStatus.textContent = text || 'Listening... speak naturally'
    }
  }

  const hideLiveTranscriptIndicator = () => {
    if (liveTranscriptIndicator) {
      liveTranscriptIndicator.classList.add('hidden')
      liveTranscriptIndicator.style.display = 'none'
    }
  }

  const updateLiveTranscript = () => {
    const finalized = liveTranscriptParts.join(' ')
    const combined = interimTranscript
      ? `${finalized} ${interimTranscript}`.trim()
      : finalized.trim()
    if (combined) {
      responseInput.value = combined
      updateSubmitState()
      saveCurrentDraft()
    }
  }

  const startSpeechRecognition = () => {
    if (!SpeechRecognitionAPI) return

    liveTranscriptParts = []
    interimTranscript = ''

    speechRecognition = new SpeechRecognitionAPI()
    speechRecognition.continuous = true
    speechRecognition.interimResults = true
    speechRecognition.lang = 'en-US'
    speechRecognition.maxAlternatives = 1

    speechRecognition.onresult = (event) => {
      let finalChunk = ''
      let tempInterim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalChunk += result[0].transcript
        } else {
          tempInterim += result[0].transcript
        }
      }

      if (finalChunk) {
        liveTranscriptParts.push(finalChunk.trim())
      }
      interimTranscript = tempInterim
      updateLiveTranscript()
    }

    speechRecognition.onerror = (event) => {
      if (event.error === 'no-speech') return // benign, keep listening
      if (event.error === 'aborted') return // we stopped it
      console.warn('Speech recognition error:', event.error)
    }

    // Auto-restart if browser ends recognition while still recording
    speechRecognition.onend = () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        try {
          speechRecognition.start()
        } catch {
          // already started or disposed
        }
      }
    }

    try {
      speechRecognition.start()
      showLiveTranscriptIndicator('Listening... speak naturally')
      announce('Live transcript started.')
    } catch {
      console.warn('Could not start speech recognition')
    }
  }

  const stopSpeechRecognition = () => {
    hideLiveTranscriptIndicator()
    if (speechRecognition) {
      try {
        speechRecognition.onend = null // prevent auto-restart
        speechRecognition.stop()
      } catch {
        // already stopped
      }
      speechRecognition = null
    }
    // Finalize any remaining interim text
    if (interimTranscript) {
      liveTranscriptParts.push(interimTranscript.trim())
      interimTranscript = ''
    }
    updateLiveTranscript()
    announce('Live transcript stopped.')
  }

  const uploadAudioBlob = async (audioBlob) => {
    if (!sessionId) {
      throw new Error('Session ID is required before audio upload')
    }

    setMessage('Preparing secure upload...')
    const mimeType = audioBlob.type || 'audio/webm'
    const presignResult = await apiRequest('/api/uploads/audio/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        mimeType,
        sizeBytes: audioBlob.size,
        durationSeconds: Number(recordingDurationSeconds.toFixed(1)),
      }),
    })

    if (!presignResult.ok || !presignResult.payload?.upload?.uploadUrl) {
      throw new Error(
        presignResult.payload?.error?.message || 'Unable to create upload URL'
      )
    }

    const uploadDescriptor = presignResult.payload.upload
    setMessage('Uploading audio response...')
    const uploadResponse = await fetch(uploadDescriptor.uploadUrl, {
      method: uploadDescriptor.method || 'PUT',
      headers: {
        'Content-Type':
          uploadDescriptor.headers?.['Content-Type'] ||
          mimeType ||
          'audio/webm',
      },
      body: audioBlob,
    })

    let uploadPayload = null
    try {
      uploadPayload = await uploadResponse.json()
    } catch {
      uploadPayload = null
    }

    if (!uploadResponse.ok) {
      throw new Error(
        uploadPayload?.error?.message ||
          'Audio upload failed. Please try again.'
      )
    }

    uploadedAudioUrl =
      uploadPayload?.audioUrl || uploadDescriptor.audioUrl || null
    uploadedAudioMimeType = mimeType
    transcriptConfidence = estimateTranscriptConfidence(responseInput.value)
    updateTranscriptWarning()
  }

  const pickSupportedMimeType = () => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
    ]
    return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || ''
  }

  const startRecording = async () => {
    if (!sessionId || !currentQuestion?.id) {
      setMessage('Start a session before recording a response.', true)
      return
    }

    if (!isAudioRecordingEnabled()) {
      setMessage(
        'Audio recording is unavailable right now. Continue with text response.',
        true
      )
      return
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordedChunks = []
      const preferredMimeType = pickSupportedMimeType()

      mediaRecorder = preferredMimeType
        ? new MediaRecorder(mediaStream, { mimeType: preferredMimeType })
        : new MediaRecorder(mediaStream)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        stopSpeechRecognition()
        // Capture final duration before cleanup
        if (recordingStartTime) {
          recordingDurationSeconds = (Date.now() - recordingStartTime) / 1000
        }
        try {
          const audioType = mediaRecorder?.mimeType || 'audio/webm'
          const audioBlob = new Blob(recordedChunks, { type: audioType })
          await uploadAudioBlob(audioBlob)
          recordingText.textContent = 'Audio uploaded'
          recordingEmoji.classList.remove('hidden')

          // Transcript was captured live by SpeechRecognition
          // User can now review and edit before submitting
          responseInput.disabled = false
          responseInput.focus()
          transcriptConfidence = estimateTranscriptConfidence(
            responseInput.value
          )
          updateSubmitState()

          if (responseInput.value.trim().length > 0) {
            setMessage(
              'Transcript ready! Review the text below and submit when satisfied.'
            )
          } else {
            setMessage(
              'Audio uploaded. Browser speech recognition did not capture text — please type your response.',
              true
            )
          }
        } catch (error) {
          uploadedAudioUrl = null
          setMessage(error.message || 'Audio upload failed', true)
          recordingText.textContent = 'Upload failed'
          responseInput.disabled = false
        } finally {
          cleanupMedia()
          refreshSessionControls()
        }
      }

      mediaRecorder.start()
      recordingStartTime = Date.now()
      recordingTimer = setInterval(updateRecordingDuration, 250)
      updateRecordingDuration()

      // Update toggle button to "Stop Recording" state
      recordToggleBtn.textContent = '⏹️ Stop Recording'
      recordToggleBtn.setAttribute('data-recording', 'true')
      recordToggleBtn.className =
        'bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide'

      recordingText.textContent = 'Recording in progress'
      recordingEmoji.classList.remove('hidden')
      refreshSessionControls()

      // Start browser speech-to-text in parallel
      startSpeechRecognition()

      setMessage(
        hasSpeechRecognitionSupport
          ? 'Recording... Your words will appear below in real time.'
          : 'Recording... Speak clearly, then stop to type your response.'
      )
    } catch (error) {
      cleanupMedia()
      setMessage(
        error.message ||
          'Unable to access microphone. Check browser permissions.',
        true
      )
    }
  }

  const stopRecording = () => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      return
    }
    stopSpeechRecognition()
    mediaRecorder.stop()
    recordingText.textContent = 'Processing recording...'
    setMessage('Finalizing recording...')
    refreshSessionControls()
  }

  const normalizeQuestion = (question, index) => ({
    id: toQuestionId(question),
    type: question?.type || 'behavioral',
    difficulty: question?.difficulty || 'medium',
    category: question?.category || question?.type || 'general',
    title: question?.title || '',
    description: question?.description || '',
    questionText:
      question?.questionText || question?.description || question?.title || '',
    starGuidelines: question?.starGuidelines || null,
    order: Number(question?.order || index + 1),
  })

  const buildQuestionUrl = (limit = 1) => {
    const safeLimit =
      Number.isFinite(limit) && Number(limit) > 0 ? Math.floor(limit) : 1
    const params = new URLSearchParams({ limit: String(safeLimit) })

    if (isAirMode && isCareerProfileComplete(careerProfile)) {
      params.set('airMode', 'true')
      params.set('industry', careerProfile.industry)
      params.set('seniority', careerProfile.seniority)
      params.set('targetJobTitle', careerProfile.targetJobTitle)
      if (careerProfile.jobDescriptionText) {
        params.set(
          'jobDescriptionText',
          careerProfile.jobDescriptionText.slice(0, 500)
        )
      }
    }

    return `/api/questions?${params.toString()}`
  }

  const setCurrentQuestionByIndex = (index, { resetDraft = false } = {}) => {
    if (!Array.isArray(sessionQuestions) || sessionQuestions.length === 0) {
      currentQuestion = null
      questionMeta.textContent = 'Unavailable'
      questionPrompt.textContent =
        'No question could be loaded right now. Please try again.'
      updateQuestionProgressText()
      refreshSessionControls()
      return
    }

    currentQuestionIndex = Math.max(
      0,
      Math.min(index, sessionQuestions.length - 1)
    )
    currentQuestion = sessionQuestions[currentQuestionIndex]
    setPrompt(currentQuestion)
    if (resetDraft) {
      resetResponseDraft(true, { clearStoredDraft: false })
    }
    restoreDraftForCurrentQuestion()
    refreshSessionControls()
  }

  const prepareSessionQuestions = async () => {
    setMessage('Fetching practice questions for your next session...')
    setButtonLoading(startBtn, 'Loading...')

    let questionResult
    try {
      questionResult = await withRetry(
        async () => {
          const result = await apiRequest(
            buildQuestionUrl(DEFAULT_SESSION_QUESTION_COUNT)
          )
          if (!result.ok || !result.payload?.questions?.length) {
            throw new Error(
              result.payload?.error?.message ||
                'Unable to load interview questions.'
            )
          }
          return result
        },
        { maxRetries: 2, label: 'Question fetch' }
      )
    } catch (error) {
      clearButtonLoading(startBtn)
      setMessage(
        error.message || 'Unable to load questions after retries.',
        true
      )
      questionMeta.textContent = 'Unavailable'
      questionPrompt.textContent =
        'Questions could not be loaded. Please try again.'
      preparedQuestions = []
      sessionQuestions = []
      currentQuestion = null
      sessionProgress = createEmptyProgress()
      syncProgress(sessionProgress)
      startBtn.disabled = true
      refreshSessionControls()
      return
    }

    clearButtonLoading(startBtn)
    preparedQuestions = questionResult.payload.questions.map(
      (question, index) => normalizeQuestion(question, index)
    )
    sessionQuestions = [...preparedQuestions]
    currentQuestionIndex = 0
    currentQuestion = sessionQuestions[0]
    sessionProgress = createEmptyProgress()
    syncProgress(sessionProgress)

    setCurrentQuestionByIndex(0)
    startBtn.disabled = !currentQuestion
    responseInput.classList.add('hidden')
    submitBtn.classList.add('hidden')
    recordToggleBtn.classList.add('hidden')
    recordingEmoji.classList.add('hidden')
    recordingText.textContent = 'Awaiting session start'
    setMessage(
      `Session plan ready with ${sessionQuestions.length} question${sessionQuestions.length === 1 ? '' : 's'}. Press Start Session when ready.`
    )
  }

  const loadFeatureFlags = async () => {
    const featureResult = await apiRequest('/api/features')
    if (featureResult.ok && featureResult.payload?.features) {
      featureFlags = {
        ...featureFlags,
        ...featureResult.payload.features,
      }
    }
  }

  const loadCareerProfile = async () => {
    const result = await apiRequest('/api/auth/profile')
    if (!result.ok) {
      return {
        ok: false,
        error:
          result.payload?.error?.message ||
          'Unable to load your AIR career profile.',
        status: result.status,
      }
    }

    const profile = normalizeCareerProfile(result.payload?.careerProfile)
    return {
      ok: true,
      profile,
      profileComplete:
        result.payload?.profileComplete === true &&
        isCareerProfileComplete(profile),
    }
  }

  const saveCareerProfile = async (profileInput) => {
    const result = await apiRequest('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileInput),
    })

    if (!result.ok) {
      return {
        ok: false,
        error:
          result.payload?.error?.message ||
          'Unable to save your AIR career profile.',
      }
    }

    const profile = normalizeCareerProfile(result.payload?.careerProfile)
    return {
      ok: true,
      profile,
      profileComplete:
        result.payload?.profileComplete === true &&
        isCareerProfileComplete(profile),
    }
  }

  const startGenericMode = async () => {
    isAirMode = false
    careerProfile = null
    toggleCareerProfileOverlay(false)
    renderCareerContext()
    clearCareerProfileMessage()
    setMessage('Generic mode enabled. Preparing your next session...')
    await prepareSessionQuestions()
  }

  const startAirMode = async (profile) => {
    careerProfile = normalizeCareerProfile(profile)
    if (!isCareerProfileComplete(careerProfile)) {
      await startGenericMode()
      return
    }

    isAirMode = true
    toggleCareerProfileOverlay(false)
    renderCareerContext()
    clearCareerProfileMessage()
    setMessage(
      `AIR mode enabled for ${careerProfile.targetJobTitle}. Preparing role-biased questions...`
    )
    await prepareSessionQuestions()
  }

  const initializeCareerProfileFlow = async () => {
    const profileResult = await loadCareerProfile()

    if (!profileResult.ok) {
      // Keep interview usable if profile API is unavailable.
      await startGenericMode()
      return
    }

    fillCareerProfileInputs(profileResult.profile)

    if (profileResult.profileComplete) {
      await startAirMode(profileResult.profile)
      return
    }

    if (!careerProfileOverlay) {
      await startGenericMode()
      return
    }

    toggleCareerProfileOverlay(true)
    setMessage(
      'Set your target role to enable AIR prompts, or skip to continue in generic mode.'
    )
  }

  if (careerProfileForm) {
    careerProfileForm.addEventListener('submit', async (event) => {
      event.preventDefault()
      clearCareerProfileMessage()

      const profileInput = readCareerProfileFromInputs()
      if (!isCareerProfileComplete(profileInput)) {
        setCareerProfileMessage(
          'Job title, industry, and seniority are required for AIR mode.'
        )
        return
      }

      setCareerProfileSubmitting(true)
      try {
        const saveResult = await saveCareerProfile(profileInput)
        if (!saveResult.ok || !saveResult.profileComplete) {
          setCareerProfileMessage(
            saveResult.error || 'Could not save profile. Try again.'
          )
          return
        }

        await startAirMode(saveResult.profile)
      } finally {
        setCareerProfileSubmitting(false)
      }
    })
  }

  if (careerProfileSkipBtn) {
    careerProfileSkipBtn.addEventListener('click', async () => {
      clearCareerProfileMessage()
      setCareerProfileSubmitting(true)
      try {
        await startGenericMode()
      } finally {
        setCareerProfileSubmitting(false)
      }
    })
  }

  if (careerContextEditBtn) {
    careerContextEditBtn.addEventListener('click', () => {
      if (sessionId) {
        setMessage(
          'Finish the current session before changing your AIR role profile.',
          true
        )
        return
      }

      fillCareerProfileInputs(careerProfile)
      clearCareerProfileMessage()
      toggleCareerProfileOverlay(true)
      setMessage('Update your role profile and save to refresh AIR prompts.')
    })
  }

  const buildCreateSessionPayload = () => {
    const questionIds = preparedQuestions
      .map((question) => question.id)
      .filter(Boolean)
    const payload = { questionIds }
    if (isAirMode && isCareerProfileComplete(careerProfile)) {
      payload.airMode = true
      payload.airContext = {
        targetJobTitle: careerProfile.targetJobTitle,
        industry: careerProfile.industry,
        seniority: careerProfile.seniority,
        jobDescriptionText: careerProfile.jobDescriptionText || '',
      }
    }
    return payload
  }

  const getNextQuestionIndexFromProgress = (questions, progress) => {
    const normalizedQuestions = Array.isArray(questions) ? questions : []
    if (!normalizedQuestions.length) return 0

    const answeredLookup = new Map(
      (Array.isArray(progress?.questions) ? progress.questions : [])
        .map((item) => [
          String(item?.questionId || ''),
          Boolean(item?.answered),
        ])
        .filter((entry) => entry[0])
    )

    const firstUnansweredIndex = normalizedQuestions.findIndex(
      (question) => !answeredLookup.get(toQuestionId(question))
    )
    if (firstUnansweredIndex >= 0) {
      return firstUnansweredIndex
    }
    return Math.max(normalizedQuestions.length - 1, 0)
  }

  const hydrateSessionFromServer = (serverSession) => {
    if (!serverSession?.id) {
      return false
    }

    sessionId = serverSession.id
    allowNavigationWithoutWarning = false
    unloadAbandonRequested = false
    isAirMode = Boolean(serverSession.airMode)

    if (
      Array.isArray(serverSession.questions) &&
      serverSession.questions.length
    ) {
      sessionQuestions = serverSession.questions.map((question, index) =>
        normalizeQuestion(question, index)
      )
      preparedQuestions = [...sessionQuestions]
    } else {
      sessionQuestions = [...preparedQuestions]
    }

    syncProgress(serverSession.progress || createEmptyProgress())

    const nextQuestionIndex = getNextQuestionIndexFromProgress(
      sessionQuestions,
      sessionProgress
    )

    responseInput.classList.remove('hidden')
    submitBtn.classList.remove('hidden')
    responseInput.disabled = false
    setControlVisibility(recordToggleBtn, isAudioRecordingEnabled())
    recordingEmoji.classList.remove('hidden')
    recordingText.textContent = 'Session active'
    setCurrentQuestionByIndex(nextQuestionIndex, { resetDraft: true })
    responseInput.focus()
    refreshSessionControls()

    return true
  }

  const resumeExistingSession = async (activeSessionId) => {
    if (!activeSessionId) {
      return false
    }

    const sessionResult = await apiRequest(`/api/sessions/${activeSessionId}`)
    if (!sessionResult.ok || !sessionResult.payload?.session?.id) {
      setMessage(
        sessionResult.payload?.error?.message ||
          'Unable to load your active session. Try again.',
        true
      )
      return false
    }

    const resumed = hydrateSessionFromServer(sessionResult.payload.session)
    if (!resumed) {
      setMessage('Unable to restore your active session right now.', true)
      return false
    }

    setMessage('Resumed your in-progress session. Continue where you left off.')
    return true
  }

  const startSession = async () => {
    if (sessionId) {
      setMessage('A session is already active.', true)
      return
    }

    if (!preparedQuestions.length) {
      await prepareSessionQuestions()
    }

    if (!preparedQuestions.length) {
      setMessage('Questions are not ready yet. Please try again.', true)
      return
    }

    stopSpeaking()
    setButtonLoading(startBtn, 'Starting...')
    const createPayload = buildCreateSessionPayload()
    if (
      !Array.isArray(createPayload.questionIds) ||
      !createPayload.questionIds.length
    ) {
      clearButtonLoading(startBtn)
      startBtn.disabled = false
      setMessage('Question set is invalid. Refresh and try again.', true)
      return
    }

    const createResult = await apiRequest('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    })

    if (!createResult.ok) {
      // Handle active-session conflict
      if (
        createResult.status === 409 &&
        createResult.payload?.error?.code === 'ACTIVE_SESSION_EXISTS'
      ) {
        const activeSessionId = createResult.payload?.session?.id
        const shouldResume = window.confirm(
          'You already have an interview session in progress.\n\nResume it now?'
        )

        if (!shouldResume) {
          clearButtonLoading(startBtn)
          startBtn.disabled = false
          setMessage(
            'Your existing session is still active. Resume it when ready.',
            true
          )
          return
        }

        setMessage('Loading your active session...')
        const resumed = await resumeExistingSession(activeSessionId)
        clearButtonLoading(startBtn)
        startBtn.disabled = false
        if (resumed) {
          setSuccessMessage('Resumed your in-progress session.')
        }
        return
      }

      clearButtonLoading(startBtn)
      startBtn.disabled = false
      setMessage(
        createResult.payload?.error?.message || 'Unable to start session.',
        true
      )
      return
    }

    if (!hydrateSessionFromServer(createResult.payload.session)) {
      clearButtonLoading(startBtn)
      startBtn.disabled = false
      setMessage('Unable to initialize the new session. Please retry.', true)
      return
    }

    clearButtonLoading(startBtn)
    recordingText.textContent = 'Session started'

    if (isAudioRecordingEnabled()) {
      setSuccessMessage(
        'Session started! Answer each question, then repeat to improve before completing.'
      )
    } else {
      setSuccessMessage(
        'Session started in text mode. Answer each question, then repeat to improve.'
      )
    }
  }

  const moveToNextQuestion = () => {
    if (!sessionId || !currentQuestion) {
      return
    }

    const currentProgress = getQuestionProgress(toQuestionId(currentQuestion))
    if (!currentProgress.answered) {
      setMessage('Submit at least one answer before moving on.', true, {
        durationMs: 3000,
      })
      responseInput.focus()
      return
    }

    if (currentQuestionIndex >= sessionQuestions.length - 1) {
      if (sessionProgress?.isComplete) {
        setMessage(
          'All questions answered! Complete the session or repeat any question.',
          false
        )
      } else {
        setMessage(
          'This is the final question. You can repeat it or complete the session.',
          false
        )
      }
      return
    }

    setCurrentQuestionByIndex(currentQuestionIndex + 1, { resetDraft: true })
    setSuccessMessage(
      `Question ${currentQuestionIndex + 1} of ${sessionQuestions.length}`,
      { durationMs: 2500 }
    )
    responseInput.focus()
  }

  const moveToQuestion = (targetIndex) => {
    if (!sessionId || !Array.isArray(sessionQuestions)) return
    if (targetIndex < 0 || targetIndex >= sessionQuestions.length) return
    if (targetIndex === currentQuestionIndex) return

    setCurrentQuestionByIndex(targetIndex, { resetDraft: true })
    setMessage(
      `Jumped to question ${targetIndex + 1} of ${sessionQuestions.length}.`
    )
    responseInput.focus()
  }

  const autoAdvanceToNextUnanswered = () => {
    if (!sessionId || !Array.isArray(sessionQuestions)) return false
    if (sessionProgress?.isComplete) return false

    const progressList = Array.isArray(sessionProgress?.questions)
      ? sessionProgress.questions
      : []
    const answeredLookup = new Map(
      progressList
        .filter((item) => item?.answered)
        .map((item) => [String(item.questionId || ''), true])
    )

    // Look ahead from current position first, then wrap around
    for (let offset = 1; offset < sessionQuestions.length; offset++) {
      const candidateIndex =
        (currentQuestionIndex + offset) % sessionQuestions.length
      const candidateId = toQuestionId(sessionQuestions[candidateIndex])
      if (!answeredLookup.get(candidateId)) {
        setCurrentQuestionByIndex(candidateIndex, { resetDraft: true })
        return true
      }
    }
    return false
  }

  const prepareRepeatAttempt = () => {
    if (!sessionId || !currentQuestion) {
      setMessage('Start a session first.', true)
      return
    }

    const currentProgress = getQuestionProgress(toQuestionId(currentQuestion))
    if (!currentProgress.answered) {
      setMessage(
        'Submit your first attempt before repeating this question.',
        true
      )
      return
    }

    // Warn if there's unsaved text in the input
    const currentText = responseInput.value.trim()
    if (currentText.length > 10) {
      const confirmed = window.confirm(
        'This will clear your current draft. Continue?'
      )
      if (!confirmed) return
    }

    resetResponseDraft(true)
    const attempts = Number(currentProgress.attempts || 0)
    recordingText.textContent = 'Ready for retry'
    setMessage(
      `Attempt ${attempts + 1} — focus on specific actions and measurable outcomes.`
    )
    responseInput.focus()
  }

  const completeCurrentSession = async () => {
    if (!sessionId) {
      setMessage('No active session to complete.', true)
      return
    }

    if (!sessionProgress?.isComplete) {
      const remaining = sessionProgress?.remainingQuestions ?? '?'
      setMessage(
        `Answer all questions before completing. ${remaining} remaining.`,
        true
      )
      return
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      setMessage('Stop recording before completing the session.', true)
      return
    }

    // Confirmation dialog for irreversible action
    const confirmed = window.confirm(
      'Complete this session and generate feedback?\n\nYou will not be able to add more answers after this.'
    )
    if (!confirmed) return

    setButtonLoading(completeSessionBtn, 'Completing...')
    submitBtn.disabled = true
    responseInput.disabled = true
    if (recordToggleBtn) recordToggleBtn.disabled = true
    stopSpeechRecognition()
    stopSpeaking()

    setMessage('Completing session and queueing feedback...')

    try {
      await withRetry(
        async () => {
          const result = await apiRequest(
            `/api/sessions/${sessionId}/complete`,
            { method: 'POST' }
          )
          if (!result.ok) {
            throw new Error(
              result.payload?.error?.message || 'Failed to complete session.'
            )
          }
          return result
        },
        { maxRetries: 2, label: 'Session completion' }
      )
    } catch (error) {
      clearButtonLoading(completeSessionBtn)
      responseInput.disabled = false
      submitBtn.disabled = false
      if (recordToggleBtn && isAudioRecordingEnabled()) {
        recordToggleBtn.disabled = false
      }
      refreshSessionControls()
      setMessage(error.message || 'Failed to complete session.', true)
      return
    }

    clearButtonLoading(completeSessionBtn)
    recordingText.textContent = 'Completed'
    const completedSessionId = sessionId
    clearSessionDrafts(completedSessionId)
    allowNavigationWithoutWarning = true
    sessionId = null
    const nextUrl = `/feedback.html?sessionId=${encodeURIComponent(completedSessionId)}`
    setSuccessMessage('Session completed! Redirecting to feedback...', {
      durationMs: 0,
    })
    setTimeout(() => {
      window.location.href = nextUrl
    }, 800)
  }

  if (startBtn) {
    startBtn.addEventListener('click', startSession)
  }

  if (recordToggleBtn) {
    recordToggleBtn.addEventListener('click', () => {
      const isRecording =
        recordToggleBtn.getAttribute('data-recording') === 'true'
      if (isRecording) {
        stopRecording()
      } else {
        startRecording()
      }
    })
  }
  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', moveToNextQuestion)
  }
  if (prevQuestionBtn) {
    prevQuestionBtn.addEventListener('click', () => {
      if (!sessionId || currentQuestionIndex <= 0) return
      setCurrentQuestionByIndex(currentQuestionIndex - 1, { resetDraft: true })
      setMessage(
        `Question ${currentQuestionIndex + 1} of ${sessionQuestions.length}.`
      )
      responseInput.focus()
    })
  }
  if (repeatQuestionBtn) {
    repeatQuestionBtn.addEventListener('click', prepareRepeatAttempt)
  }
  if (completeSessionBtn) {
    completeSessionBtn.addEventListener('click', completeCurrentSession)
  }

  responseInput.addEventListener('input', () => {
    updateSubmitState()
    saveCurrentDraft()
    const textLength = responseInput.value.trim().length
    const minLength = uploadedAudioUrl ? 20 : 50

    if (textLength > 0 && textLength < minLength) {
      const remaining = minLength - textLength
      setMessage(
        `${remaining} more character${remaining === 1 ? '' : 's'} needed.`
      )
    } else if (textLength >= minLength) {
      if (uploadedAudioUrl) {
        transcriptConfidence = estimateTranscriptConfidence(responseInput.value)
      }
      // Don't overwrite success messages from recent submit
      if (messageTimeout) return
      const questionAttempts = getQuestionProgress(
        toQuestionId(currentQuestion)
      ).attempts
      if (questionAttempts > 0) {
        setMessage('Ready to submit an improved attempt.')
      } else {
        setMessage('Ready to submit.')
      }
    }
  })

  submitBtn.addEventListener('click', async () => {
    if (!sessionId || !currentQuestion?.id) {
      setMessage('Session has not started correctly. Please retry.', true)
      return
    }

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      setMessage('Stop recording before submitting your answer.', true)
      return
    }

    const responseText = responseInput.value.trim()
    const minLength = uploadedAudioUrl ? 20 : 50
    if (responseText.length < minLength) {
      setMessage(
        `Response is too short. Minimum ${minLength} characters required.`,
        true
      )
      responseInput.focus()
      return
    }

    setButtonLoading(submitBtn, 'Submitting...')
    responseInput.disabled = true
    if (recordToggleBtn) recordToggleBtn.disabled = true
    stopSpeechRecognition()

    const currentProgress = getQuestionProgress(currentQuestion.id)
    const payload = {
      questionId: currentQuestion.id,
      responseText,
      responseType: uploadedAudioUrl ? 'audio_transcript' : 'text',
      allowRepeat: Boolean(currentProgress?.answered),
    }

    if (uploadedAudioUrl) {
      payload.audioUrl = uploadedAudioUrl
      payload.audioMimeType = uploadedAudioMimeType || 'audio/webm'
      payload.audioDurationSeconds = Number(recordingDurationSeconds.toFixed(1))
      payload.transcriptConfidence =
        transcriptConfidence ?? estimateTranscriptConfidence(responseText)
      payload.transcriptProvider = 'browser'
    }

    let submitResponseResult
    try {
      submitResponseResult = await withRetry(
        async () => {
          const result = await apiRequest(
            `/api/sessions/${sessionId}/responses`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          )
          if (!result.ok) {
            // Don't retry 4xx client errors (duplicate, max attempts, etc.)
            if (result.status >= 400 && result.status < 500) {
              const clientError = new Error(
                result.payload?.error?.message || 'Submission rejected.'
              )
              clientError.noRetry = true
              throw clientError
            }
            throw new Error(
              result.payload?.error?.message || 'Failed to submit response.'
            )
          }
          return result
        },
        {
          maxRetries: 2,
          label: 'Response submission',
        }
      )
    } catch (error) {
      clearButtonLoading(submitBtn)
      responseInput.disabled = false
      submitBtn.disabled = false
      if (recordToggleBtn && isAudioRecordingEnabled()) {
        recordToggleBtn.disabled = false
      }
      setMessage(error.message || 'Failed to submit response.', true)
      return
    }

    clearButtonLoading(submitBtn)
    uploadedAudioUrl = null
    uploadedAudioMimeType = null
    transcriptConfidence = null
    liveTranscriptParts = []
    interimTranscript = ''
    recordedChunks = []
    hideLiveTranscriptIndicator()
    updateTranscriptWarning()

    syncProgress(submitResponseResult.payload?.progress)
    const updatedQuestionProgress =
      submitResponseResult.payload?.questionProgress ||
      getQuestionProgress(currentQuestion.id)
    const attempts = Number(updatedQuestionProgress?.attempts || 1)

    clearDraftForQuestion(sessionId, toQuestionId(currentQuestion))
    responseInput.value = ''
    responseInput.disabled = false
    submitBtn.disabled = false
    if (recordToggleBtn && isAudioRecordingEnabled()) {
      recordToggleBtn.disabled = false
    }
    recordingText.textContent = `Attempt ${attempts} saved`
    updateSubmitState()

    if (sessionProgress?.isComplete) {
      setSuccessMessage(
        `Attempt ${attempts} saved! All questions answered — complete the session whenever you're ready.`
      )
    } else if (attempts === 1) {
      // First attempt saved — auto-advance to next unanswered question
      const advanced = autoAdvanceToNextUnanswered()
      if (advanced) {
        setSuccessMessage(
          `Attempt saved! Moved to the next unanswered question.`
        )
      } else {
        setSuccessMessage(
          'Attempt saved! Repeat this question or move to the next one.'
        )
      }
    } else {
      setSuccessMessage(`Attempt ${attempts} saved. Keep refining or move on.`)
    }

    refreshSessionControls()
    updateQuestionProgressText()
    renderQuestionNav()
  })

  window.addEventListener('beforeunload', (event) => {
    cleanupMedia()
    stopSpeechRecognition()

    if (allowNavigationWithoutWarning) {
      return
    }

    if (hasPendingSessionWork()) {
      event.preventDefault()
      event.returnValue = ''
    }
  })

  window.addEventListener('pagehide', () => {
    cleanupMedia()
    stopSpeechRecognition()
    abandonSessionOnUnload()
  })

  syncProgress(createEmptyProgress())
  refreshSessionControls()

  await loadFeatureFlags()
  await initializeCareerProfileFlow()
})
