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
  let featureFlags = {
    aiRecording: true,
    audioUploads: true,
    transcription: true,
  }

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

  const setPrompt = (question) => {
    const type = question.type || 'general'
    const difficulty = question.difficulty || 'unknown'
    const category = question.category || type
    const questionText =
      question.questionText || question.description || question.title || ''

    questionMeta.textContent = `${type} • ${difficulty} • ${category}`
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

    const confidence = transcriptConfidence ?? estimateTranscriptConfidence(responseInput.value)
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
          uploadDescriptor.headers?.['Content-Type'] || mimeType || 'audio/webm',
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
        uploadPayload?.error?.message || 'Audio upload failed. Please try again.'
      )
    }

    uploadedAudioUrl = uploadPayload?.audioUrl || uploadDescriptor.audioUrl || null
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
        try {
          const audioType = mediaRecorder?.mimeType || 'audio/webm'
          const audioBlob = new Blob(recordedChunks, { type: audioType })
          await uploadAudioBlob(audioBlob)
          recordingText.textContent = 'Audio uploaded. Review transcript before submit.'
          recordingEmoji.classList.remove('hidden')
          setMessage(
            'Audio uploaded. Edit the transcript below before submitting your answer.'
          )
          updateSubmitState()
        } catch (error) {
          uploadedAudioUrl = null
          setMessage(error.message || 'Audio upload failed', true)
          recordingText.textContent = 'Upload failed'
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
      setMessage('Recording... Speak clearly, then stop to upload.')
    } catch (error) {
      cleanupMedia()
      setMessage(
        error.message || 'Unable to access microphone. Check browser permissions.',
        true
      )
    }
  }

  const stopRecording = () => {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') {
      return
    }
    mediaRecorder.stop()
    recordingText.textContent = 'Processing recording...'
    setMessage('Finalizing recording...')
  }

  const loadQuestion = async () => {
    setMessage('Fetching a practice question...')
    const questionResult = await apiRequest('/api/questions?limit=1')

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

  startBtn.addEventListener('click', async () => {
    if (!currentQuestion?.id) {
      setMessage('Question is not ready yet. Please wait a moment.', true)
      return
    }

    startBtn.disabled = true
    setMessage('Creating interview session...')

    const createResult = await apiRequest('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionIds: [currentQuestion.id] }),
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
    const completeResult = await apiRequest(`/api/sessions/${sessionId}/complete`, {
      method: 'POST',
    })

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
  })

  await loadFeatureFlags()
  await loadQuestion()
})
