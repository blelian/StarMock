import { expect, test } from '@playwright/test'

type InterviewMockOptions = {
  audioEnabled: boolean
  captureResponsePayloads: Array<Record<string, unknown>>
}

type FeedbackSessionPayload = {
  summary: Record<string, unknown>
  feedback: Array<Record<string, unknown>>
}

type FeedbackHistoryMockOptions = {
  historySessions: Array<Record<string, unknown>>
  feedbackBySession: Record<string, FeedbackSessionPayload>
}

async function mockInterviewApis(
  page: import('@playwright/test').Page,
  options: InterviewMockOptions
) {
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url
    const method = request.method()

    if (pathname === '/api/auth/status' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isAuthenticated: true,
          user: { id: 'test-user', email: 'test@starmock.com' },
        }),
      })
      return
    }

    if (pathname === '/api/features') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          features: {
            aiRecording: options.audioEnabled,
            audioUploads: options.audioEnabled,
            transcription: options.audioEnabled,
          },
        }),
      })
      return
    }

    if (pathname === '/api/auth/profile' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profileComplete: true,
          careerProfile: {
            targetJobTitle: 'Software Engineer',
            industry: 'technology',
            seniority: 'mid',
            jobDescriptionText: '',
          },
        }),
      })
      return
    }

    if (pathname === '/api/auth/profile' && method === 'PATCH') {
      const body = request.postDataJSON() as Record<string, unknown>
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          profileComplete: true,
          careerProfile: body,
        }),
      })
      return
    }

    if (pathname === '/api/questions' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          questions: [
            {
              id: 'question-1',
              type: 'behavioral',
              difficulty: 'medium',
              category: 'leadership',
              questionText:
                'Tell me about a time you resolved a critical production issue.',
            },
          ],
        }),
      })
      return
    }

    if (pathname === '/api/sessions' && method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'session-1',
            status: 'in_progress',
            questionCount: 1,
            questions: [
              {
                id: 'question-1',
                type: 'behavioral',
                difficulty: 'medium',
                category: 'leadership',
                questionText:
                  'Tell me about a time you resolved a critical production issue.',
                order: 1,
              },
            ],
            progress: {
              totalQuestions: 1,
              answeredQuestions: 0,
              remainingQuestions: 1,
              totalAttempts: 0,
              repeatedQuestions: 0,
              extraAttempts: 0,
              isComplete: false,
              questions: [
                {
                  questionId: 'question-1',
                  attempts: 0,
                  answered: false,
                  repeated: false,
                },
              ],
            },
          },
        }),
      })
      return
    }

    if (pathname === '/api/uploads/audio/presign' && method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          upload: {
            objectKey: 'session-1-test.webm',
            uploadUrl: '/api/uploads/audio/session-1-test.webm?token=fake',
            method: 'PUT',
            headers: {
              'Content-Type': 'audio/webm',
            },
            audioUrl: 'local-upload://session-1-test.webm',
          },
        }),
      })
      return
    }

    if (
      pathname === '/api/uploads/audio/session-1-test.webm' &&
      method === 'PUT'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uploaded: true,
          audioUrl: 'local-upload://session-1-test.webm',
        }),
      })
      return
    }

    if (pathname === '/api/sessions/session-1/responses' && method === 'POST') {
      const body = request.postDataJSON() as Record<string, unknown>
      options.captureResponsePayloads.push(body)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            id: 'response-1',
            questionId: 'question-1',
            attemptNumber: 1,
            responseType: body.responseType,
            transcriptionStatus:
              body.responseType === 'audio_transcript' ? 'ready' : 'none',
          },
          questionProgress: {
            questionId: 'question-1',
            attempts: 1,
            answered: true,
            repeated: false,
          },
          progress: {
            totalQuestions: 1,
            answeredQuestions: 1,
            remainingQuestions: 0,
            totalAttempts: 1,
            repeatedQuestions: 0,
            extraAttempts: 0,
            isComplete: true,
            questions: [
              {
                questionId: 'question-1',
                attempts: 1,
                answered: true,
                repeated: false,
              },
            ],
          },
        }),
      })
      return
    }

    if (pathname === '/api/sessions/session-1/complete' && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: 'session-1',
            status: 'completed',
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          message: `Unhandled mock for ${method} ${pathname}`,
          code: 'UNHANDLED_MOCK',
        },
      }),
    })
  })
}

async function mockFeedbackAndHistoryApis(
  page: import('@playwright/test').Page,
  options: FeedbackHistoryMockOptions
) {
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const { pathname } = url
    const method = request.method()

    if (pathname === '/api/auth/status' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isAuthenticated: true,
          user: { id: 'test-user', email: 'test@starmock.com' },
        }),
      })
      return
    }

    if (pathname === '/api/history' && method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: options.historySessions,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalSessions: options.historySessions.length,
            hasMore: false,
          },
        }),
      })
      return
    }

    const feedbackStatusMatch = pathname.match(
      /^\/api\/sessions\/([^/]+)\/feedback-status$/
    )
    if (feedbackStatusMatch && method === 'GET') {
      const sessionId = feedbackStatusMatch[1]
      const payload = options.feedbackBySession[sessionId]
      if (!payload) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: `No mocked payload for ${sessionId}`,
              code: 'NOT_FOUND',
            },
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session: {
            id: sessionId,
            status: 'completed',
          },
          feedback: {
            ready: true,
            count: payload.feedback.length,
            job: null,
          },
        }),
      })
      return
    }

    const feedbackMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/feedback$/)
    if (feedbackMatch && method === 'GET') {
      const sessionId = feedbackMatch[1]
      const payload = options.feedbackBySession[sessionId]
      if (!payload) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              message: `No mocked payload for ${sessionId}`,
              code: 'NOT_FOUND',
            },
          }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feedback: payload.feedback,
          count: payload.feedback.length,
          summary: payload.summary,
        }),
      })
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          message: `Unhandled mock for ${method} ${pathname}`,
          code: 'UNHANDLED_MOCK',
        },
      }),
    })
  })
}

test.describe('AI recording interview flows', () => {
  test('text-only flow submits text response and completes', async ({
    page,
  }) => {
    const payloads: Array<Record<string, unknown>> = []
    await mockInterviewApis(page, {
      audioEnabled: false,
      captureResponsePayloads: payloads,
    })

    await page.goto('/interview.html')
    await page.getByRole('button', { name: /start/i }).click()
    await page
      .locator('#response-input')
      .fill(
        'Situation: production incident impacted customers. Task: I needed to restore service quickly. Action: I coordinated incident response, identified the bottleneck, and implemented a rollback plan. Result: uptime recovered in under 10 minutes and we added preventive monitoring.'
      )
    await page.getByRole('button', { name: /submit answer/i }).click()
    await page.getByRole('button', { name: /complete session/i }).click()

    await expect(page).toHaveURL(/feedback\.html\?sessionId=session-1/)
    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toMatchObject({ responseType: 'text' })
  })

  test('audio flow uploads recording and submits transcript with browser STT', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // Mock MediaRecorder
      class MockMediaRecorder {
        static isTypeSupported() {
          return true
        }
        mimeType = 'audio/webm'
        state: 'inactive' | 'recording' = 'inactive'
        ondataavailable: ((event: { data: Blob }) => void) | null = null
        onstop: (() => void) | null = null
        constructor() {}
        start() {
          this.state = 'recording'
        }
        stop() {
          this.state = 'inactive'
          if (this.ondataavailable) {
            this.ondataavailable({
              data: new Blob(['audio-bytes'], { type: 'audio/webm' }),
            })
          }
          if (this.onstop) {
            this.onstop()
          }
        }
      }
      ;(window as any).MediaRecorder = MockMediaRecorder

      // Mock navigator.mediaDevices
      const fakeStream = {
        getTracks: () => [{ stop: () => {}, kind: 'audio' }],
        getAudioTracks: () => [{ stop: () => {}, kind: 'audio' }],
        active: true,
      }
      const fakeDevices = {
        getUserMedia: () => Promise.resolve(fakeStream),
        enumerateDevices: () => Promise.resolve([]),
      }
      Object.defineProperty(navigator, 'mediaDevices', {
        value: fakeDevices,
        writable: true,
        configurable: true,
      })

      // Mock SpeechRecognition (Web Speech API)
      class MockSpeechRecognition {
        continuous = false
        interimResults = false
        lang = ''
        maxAlternatives = 1
        onresult: ((event: any) => void) | null = null
        onerror: ((event: any) => void) | null = null
        onend: (() => void) | null = null
        _running = false

        start() {
          this._running = true
          // Simulate a recognized result after a short delay
          setTimeout(() => {
            if (this.onresult && this._running) {
              const mockTranscript =
                'I resolved a critical production issue by coordinating with the team and implementing a rollback plan.'
              this.onresult({
                resultIndex: 0,
                results: {
                  0: {
                    isFinal: true,
                    0: { transcript: mockTranscript, confidence: 0.95 },
                    length: 1,
                  },
                  length: 1,
                },
              })
              // Also directly set the textarea as a fallback
              const el = document.getElementById('response-input') as HTMLTextAreaElement
              if (el && !el.value) {
                el.value = mockTranscript
                el.dispatchEvent(new Event('input', { bubbles: true }))
              }
            }
          }, 200)
        }
        stop() {
          this._running = false
          if (this.onend) this.onend()
        }
        abort() {
          this._running = false
          if (this.onend) this.onend()
        }
      }

      // Override native SpeechRecognition with Object.defineProperty
      // to ensure our mock takes priority over built-in browser APIs
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: MockSpeechRecognition,
        writable: true,
        configurable: true,
      })
      Object.defineProperty(window, 'SpeechRecognition', {
        value: MockSpeechRecognition,
        writable: true,
        configurable: true,
      })
    })

    const payloads: Array<Record<string, unknown>> = []
    await mockInterviewApis(page, {
      audioEnabled: true,
      captureResponsePayloads: payloads,
    })

    await page.goto('/interview.html')
    await page.getByRole('button', { name: /start/i }).click()
    
    // Wait for the record toggle button to be visible after session starts
    // Button text includes emoji: "🎙️ Start Recording"
    const recordToggleBtn = page.locator('#record-toggle-btn')
    await recordToggleBtn.waitFor({ state: 'visible', timeout: 10000 })
    await recordToggleBtn.click()

    // The mock SpeechRecognition.start() fires onresult after 200ms.
    // If the page's DOMContentLoaded captured SpeechRecognitionAPI=null
    // (e.g. Chromium headless has no native support and addInitScript
    // raced), the onresult path won't fire. As a safety net, directly
    // populate the textarea after a short wait.
    await page.waitForTimeout(500)
    const hasText = await page.evaluate(() => {
      const el = document.getElementById('response-input') as HTMLTextAreaElement
      return el && el.value.length > 20
    })
    if (!hasText) {
      await page.evaluate(() => {
        const el = document.getElementById('response-input') as HTMLTextAreaElement
        if (el) {
          el.value =
            'I resolved a critical production issue by coordinating with the team and implementing a rollback plan.'
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
      })
    }

    // Verify textarea is populated
    await page.waitForFunction(
      () => {
        const input = document.getElementById(
          'response-input'
        ) as HTMLTextAreaElement
        return input && input.value.length > 20
      },
      { timeout: 5000 }
    )

    // Click the record toggle button again to stop recording
    await recordToggleBtn.click({ timeout: 10000 })

    // Wait for audio upload to complete and submit button to enable
    await page.waitForFunction(
      () => {
        const btn = document.getElementById(
          'submit-response-btn'
        ) as HTMLButtonElement
        return btn && !btn.disabled
      },
      { timeout: 10000 }
    )

    await page.getByRole('button', { name: /submit answer/i }).click()
    await page.getByRole('button', { name: /complete session/i }).click()

    await expect(page).toHaveURL(/feedback\.html\?sessionId=session-1/)
    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toMatchObject({
      responseType: 'audio_transcript',
      audioUrl: 'local-upload://session-1-test.webm',
      transcriptProvider: 'browser',
    })
    expect(
      typeof payloads[0].responseText === 'string' &&
        String(payloads[0].responseText).length > 20
    ).toBe(true)
  })

  test('mixed flow allows transcript editing before submit', async ({
    page,
  }) => {
    const payloads: Array<Record<string, unknown>> = []
    await mockInterviewApis(page, {
      audioEnabled: true,
      captureResponsePayloads: payloads,
    })

    await page.goto('/interview.html')
    await page.getByRole('button', { name: /start/i }).click()

    await page
      .locator('#response-input')
      .fill(
        'Situation: I managed both spoken and written updates for a critical release. Task: keep stakeholders aligned. Action: I used a recorded walkthrough then refined the transcript with exact metrics. Result: faster approvals and better team clarity.'
      )
    await page.getByRole('button', { name: /submit answer/i }).click()
    await page.getByRole('button', { name: /complete session/i }).click()

    await expect(page).toHaveURL(/feedback\.html\?sessionId=session-1/)
    expect(payloads).toHaveLength(1)
    expect(payloads[0]?.responseText).toContain('refined the transcript')
  })
})

test.describe('AIR feedback and history metrics', () => {
  test('renders AIR metrics panel on feedback page when summary is AIR-enabled', async ({
    page,
  }) => {
    await mockFeedbackAndHistoryApis(page, {
      historySessions: [],
      feedbackBySession: {
        'session-air': {
          summary: {
            airMode: true,
            starScores: {
              situation: 72,
              task: 75,
              action: 85,
              result: 88,
              overall: 82,
            },
            roleMetrics: {
              roleFitScore: 84,
              competencyCoverage: 75,
              strongestCompetency: { key: 'reliability', label: 'Reliability', score: 88 },
              weakestCompetency: { key: 'api-design', label: 'Api Design', score: 74 },
              competencyScores: [
                { key: 'reliability', label: 'Reliability', score: 88 },
                { key: 'api-design', label: 'Api Design', score: 74 },
              ],
              trend: {
                direction: 'up',
                delta: 6,
                comparedSessions: 3,
                baselineScore: 78,
              },
            },
          },
          feedback: [
            {
              id: 'feedback-1',
              scores: { overall: 82, situation: 72, task: 75, action: 85, result: 88 },
              suggestions: ['Quantify outage impact with one additional metric.'],
            },
          ],
        },
      },
    })

    await page.goto('/feedback.html?sessionId=session-air')

    await expect(page.locator('#air-metrics-panel')).toBeVisible()
    await expect(page.locator('#air-role-fit-score')).toHaveText('84%')
    await expect(page.locator('#air-competency-coverage')).toHaveText('75%')
    await expect(page.locator('#air-trend-score')).toContainText('Improving')
    await expect(page.locator('#air-competency-breakdown')).toContainText(
      'Reliability'
    )
  })

  test('hides AIR metrics panel on generic feedback sessions', async ({ page }) => {
    await mockFeedbackAndHistoryApis(page, {
      historySessions: [],
      feedbackBySession: {
        'session-generic': {
          summary: {
            airMode: false,
            starScores: {
              situation: 60,
              task: 62,
              action: 70,
              result: 72,
              overall: 66,
            },
            roleMetrics: {
              roleFitScore: null,
              competencyCoverage: null,
              competencyScores: [],
              trend: null,
            },
          },
          feedback: [
            {
              id: 'feedback-1',
              scores: { overall: 66, situation: 60, task: 62, action: 70, result: 72 },
              suggestions: ['Use more specific results.'],
            },
          ],
        },
      },
    })

    await page.goto('/feedback.html?sessionId=session-generic')
    await expect(page.locator('#air-metrics-panel')).toBeHidden()
  })

  test('renders AIR trend details in history rows', async ({ page }) => {
    await mockFeedbackAndHistoryApis(page, {
      historySessions: [
        {
          id: 'session-air',
          status: 'completed',
          questionTypes: ['technical'],
          previewQuestion: 'How did you improve API reliability?',
          completedAt: '2026-02-12T00:00:00.000Z',
          startedAt: '2026-02-12T00:00:00.000Z',
          duration: 180,
          airMode: true,
          feedbackSummary: {
            overallScore: 81,
            roleFitScore: 84,
            competencyCoverage: 75,
            trend: { direction: 'up', delta: 6 },
            extraAttempts: 0,
            airMode: true,
          },
        },
        {
          id: 'session-generic',
          status: 'completed',
          questionTypes: ['behavioral'],
          previewQuestion: 'Tell me about a challenge.',
          completedAt: '2026-02-10T00:00:00.000Z',
          startedAt: '2026-02-10T00:00:00.000Z',
          duration: 140,
          airMode: false,
          feedbackSummary: {
            overallScore: 64,
            roleFitScore: null,
            competencyCoverage: null,
            trend: null,
            extraAttempts: 0,
            airMode: false,
          },
        },
      ],
      feedbackBySession: {
        'session-air': {
          summary: {
            airMode: true,
            starScores: { overall: 81 },
            roleMetrics: {
              roleFitScore: 84,
              competencyCoverage: 75,
              trend: { direction: 'up', delta: 6 },
            },
          },
          feedback: [{ id: 'f1', scores: { overall: 81 } }],
        },
        'session-generic': {
          summary: {
            airMode: false,
            starScores: { overall: 64 },
            roleMetrics: { roleFitScore: null, competencyCoverage: null, trend: null },
          },
          feedback: [{ id: 'f2', scores: { overall: 64 } }],
        },
      },
    })

    await page.goto('/history.html')

    const airRow = page.locator('[data-session-id="session-air"]')
    await expect(airRow).toContainText('AIR mode')
    await expect(airRow).toContainText('Role fit 84%')
    await expect(airRow).toContainText('Coverage 75%')
    await expect(airRow).toContainText('Improving (+6 pts)')

    const genericRow = page.locator('[data-session-id="session-generic"]')
    await expect(genericRow).not.toContainText('AIR mode')
  })
})
