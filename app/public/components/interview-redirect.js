/* global webkitSpeechRecognition */
document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('start-interview-btn')
  const submitBtn = document.getElementById('submit-response-btn')
  const responseInput = document.getElementById('response-input')
  const recordingEmoji = document.getElementById('recording-emoji')
  const recordingText = document.getElementById('recording-text')
  const recordingDuration = document.getElementById('recording-duration')
  const startRecordingBtn = document.getElementById('start-recording-btn')
  const stopRecordingBtn = document.getElementById('stop-recording-btn')
  const transcriptWarning = document.getElementById('transcript-warning')
  const messageEl = document.getElementById('interview-message')
  const questionMeta = document.getElementById('question-meta')
  const questionPrompt = document.getElementById('question-prompt')
  const careerProfileOverlay = document.getElementById('career-profile-overlay')
  const careerProfileForm = document.getElementById('career-profile-form')
  const careerProfileMessage = document.getElementById('career-profile-message')
  const careerProfileSubmitBtn = document.getElementById(
    'career-profile-submit-btn'
  )
  const careerProfileSkipBtn = document.getElementById('career-profile-skip-btn')
  const careerJobTitleInput = document.getElementById('career-job-title')
  const careerIndustrySelect = document.getElementById('career-industry')
  const careerSenioritySelect = document.getElementById('career-seniority')
  const careerJobDescriptionInput = document.getElementById(
    'career-job-description'
  )
  const careerContextBadge = document.getElementById('career-context-badge')
  const careerContextText = document.getElementById('career-context-text')
  const careerContextEditBtn = document.getElementById('career-context-edit-btn')

  if (
    !startBtn ||
    !submitBtn ||
    !responseInput ||
    !recordingEmoji ||
    !recordingText ||
    !messageEl ||
    !questionMeta ||
    !questionPrompt ||
    !startRecordingBtn ||
    !stopRecordingBtn ||
    !recordingDuration ||
    !transcriptWarning
  ) {
    return
  }

  const liveTranscriptIndicator = document.getElementById(
    'live-transcript-indicator'
  )
  const liveTranscriptStatus = document.getElementById('live-transcript-status')

  let currentQuestion = null
  let sessionId = null
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

  const hasMediaRecorderSupport =
    typeof MediaRecorder !== 'undefined' &&
    !!navigator?.mediaDevices?.getUserMedia
  const isAudioRecordingEnabled = () =>
    hasMediaRecorderSupport &&
    featureFlags.aiRecording !== false &&
    featureFlags.audioUploads !== false

  const setMessage = (message, isError = false) => {
    messageEl.textContent = message
    messageEl.classList.remove('text-red-400', 'text-slate-400')
    messageEl.classList.add(isError ? 'text-red-400' : 'text-slate-400')
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
    careerProfileMessage.classList.remove('hidden', 'text-red-400', 'text-primary')
    careerProfileMessage.classList.add(isError ? 'text-red-400' : 'text-primary')
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

  const setPrompt = (question) => {
    const type = question.type || 'general'
    const difficulty = question.difficulty || 'unknown'
    const category = question.category || type
    const questionText =
      question.questionText || question.description || question.title || ''

    const modeLabel = isAirMode ? 'AIR' : 'Generic'
    questionMeta.textContent = `${modeLabel} • ${type} • ${difficulty} • ${category}`
    questionPrompt.textContent = questionText || 'Question unavailable.'
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
      recordingDurationSeconds = 0
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
    if (!sessionId) {
      submitBtn.disabled = true
      return
    }

    const minLength = uploadedAudioUrl ? 20 : 50
    submitBtn.disabled = responseInput.value.trim().length < minLength
    updateTranscriptWarning()
  }

  const resetRecordingState = () => {
    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
    recordingStartTime = null
    updateRecordingDuration()
    stopRecordingBtn.disabled = true
    startRecordingBtn.disabled = false
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

  const showLiveTranscriptIndicator = (text) => {
    if (liveTranscriptIndicator) {
      liveTranscriptIndicator.classList.remove('hidden')
      liveTranscriptIndicator.style.display = 'flex'
    }
    if (liveTranscriptStatus) {
      liveTranscriptStatus.textContent = text || 'Listening... speak clearly'
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
      showLiveTranscriptIndicator('Listening... speak clearly')
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
        }
      }

      mediaRecorder.start()
      recordingStartTime = Date.now()
      recordingTimer = setInterval(updateRecordingDuration, 250)
      updateRecordingDuration()

      startRecordingBtn.disabled = true
      stopRecordingBtn.disabled = false
      recordingText.textContent = 'Recording in progress'
      recordingEmoji.classList.remove('hidden')

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
  }

  const buildQuestionUrl = () => {
    const params = new URLSearchParams({ limit: '1' })

    if (isAirMode && isCareerProfileComplete(careerProfile)) {
      params.set('airMode', 'true')
      params.set('industry', careerProfile.industry)
      params.set('seniority', careerProfile.seniority)
      params.set('targetJobTitle', careerProfile.targetJobTitle)
    }

    return `/api/questions?${params.toString()}`
  }

  const loadQuestion = async () => {
    setMessage('Fetching a practice question...')
    const questionResult = await apiRequest(buildQuestionUrl())

    if (!questionResult.ok || !questionResult.payload?.questions?.length) {
      setMessage(
        questionResult.payload?.error?.message ||
          'Unable to load interview question.',
        true
      )
      questionMeta.textContent = 'Unavailable'
      questionPrompt.textContent =
        'No question could be loaded right now. Please try again.'
      return
    }

    currentQuestion = questionResult.payload.questions[0]
    setPrompt(currentQuestion)
    startBtn.disabled = false
    setMessage('Question ready. Press Start to begin your session.')
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
    setMessage('Generic mode enabled. Fetching a practice question...')
    await loadQuestion()
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
      `AIR mode enabled for ${careerProfile.targetJobTitle}. Fetching your question...`
    )
    await loadQuestion()
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

  startBtn.addEventListener('click', async () => {
    if (!currentQuestion?.id) {
      setMessage('Question is not ready yet. Please wait a moment.', true)
      return
    }

    startBtn.disabled = true
    setMessage('Creating interview session...')

    const createSessionPayload = { questionIds: [currentQuestion.id] }
    if (isAirMode && isCareerProfileComplete(careerProfile)) {
      createSessionPayload.airMode = true
      createSessionPayload.airContext = {
        targetJobTitle: careerProfile.targetJobTitle,
        industry: careerProfile.industry,
        seniority: careerProfile.seniority,
        jobDescriptionText: careerProfile.jobDescriptionText || '',
      }
    }

    const createResult = await apiRequest('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createSessionPayload),
    })

    if (!createResult.ok || !createResult.payload?.session?.id) {
      startBtn.disabled = false
      setMessage(
        createResult.payload?.error?.message || 'Unable to start session.',
        true
      )
      return
    }

    sessionId = createResult.payload.session.id
    recordingEmoji.classList.remove('hidden')
    recordingText.textContent = 'Session started'
    responseInput.classList.remove('hidden')
    submitBtn.classList.remove('hidden')
    submitBtn.disabled = true
    responseInput.disabled = false
    responseInput.focus()

    if (isAudioRecordingEnabled()) {
      startRecordingBtn.classList.remove('hidden')
      stopRecordingBtn.classList.remove('hidden')
      stopRecordingBtn.disabled = true
      setMessage(
        'Session started. Record audio or type a STAR response before submitting.'
      )
    } else {
      setMessage(
        'Session started. Audio recording is disabled for your account/browser, so submit a text response.',
        true
      )
    }
  })

  startRecordingBtn.addEventListener('click', startRecording)
  stopRecordingBtn.addEventListener('click', stopRecording)

  responseInput.addEventListener('input', () => {
    updateSubmitState()
    const textLength = responseInput.value.trim().length
    const minLength = uploadedAudioUrl ? 20 : 50

    if (textLength > 0 && textLength < minLength) {
      setMessage(`Keep going. Minimum ${minLength} characters required.`)
    } else if (textLength >= minLength) {
      if (uploadedAudioUrl) {
        transcriptConfidence = estimateTranscriptConfidence(responseInput.value)
      }
      setMessage('Response looks good. You can submit now.')
    }
  })

  submitBtn.addEventListener('click', async () => {
    if (!sessionId || !currentQuestion?.id) {
      setMessage('Session has not started correctly. Please retry.', true)
      return
    }

    const responseText = responseInput.value.trim()
    const minLength = uploadedAudioUrl ? 20 : 50
    if (responseText.length < minLength) {
      setMessage(
        `Response is too short. Minimum ${minLength} characters required.`,
        true
      )
      return
    }

    submitBtn.disabled = true
    responseInput.disabled = true
    startRecordingBtn.disabled = true
    stopRecordingBtn.disabled = true
    stopSpeechRecognition()

    // Submit response (text or audio+transcript)
    setMessage('Submitting your response...')

    const payload = {
      questionId: currentQuestion.id,
      responseText,
      responseType: uploadedAudioUrl ? 'audio_transcript' : 'text',
    }

    if (uploadedAudioUrl) {
      payload.audioUrl = uploadedAudioUrl
      payload.audioMimeType = uploadedAudioMimeType || 'audio/webm'
      payload.audioDurationSeconds = Number(recordingDurationSeconds.toFixed(1))
      payload.transcriptConfidence =
        transcriptConfidence ?? estimateTranscriptConfidence(responseText)
      payload.transcriptProvider = 'browser'
    }

    const submitResponseResult = await apiRequest(
      `/api/sessions/${sessionId}/responses`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (!submitResponseResult.ok) {
      responseInput.disabled = false
      submitBtn.disabled = false
      if (isAudioRecordingEnabled()) {
        startRecordingBtn.disabled = false
      }
      setMessage(
        submitResponseResult.payload?.error?.message ||
          'Failed to submit response.',
        true
      )
      return
    }

    setMessage('Completing session...')
    const completeResult = await apiRequest(
      `/api/sessions/${sessionId}/complete`,
      {
        method: 'POST',
      }
    )

    if (!completeResult.ok) {
      responseInput.disabled = false
      submitBtn.disabled = false
      if (isAudioRecordingEnabled()) {
        startRecordingBtn.disabled = false
      }
      setMessage(
        completeResult.payload?.error?.message || 'Failed to complete session.',
        true
      )
      return
    }

    recordingText.textContent = 'Completed'
    const nextUrl = `/feedback.html?sessionId=${encodeURIComponent(sessionId)}`
    setMessage('Session completed. Redirecting to feedback...')
    window.location.href = nextUrl
  })

  window.addEventListener('beforeunload', () => {
    cleanupMedia()
    stopSpeechRecognition()
  })

  await loadFeatureFlags()
  await initializeCareerProfileFlow()
})
