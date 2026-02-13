import { expect, test } from '@playwright/test'

type InterviewMockOptions = {
  audioEnabled: boolean
  captureResponsePayloads: Array<Record<string, unknown>>
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
            responseType: body.responseType,
            transcriptionStatus:
              body.responseType === 'audio_transcript' ? 'ready' : 'none',
          },
        }),
      })
      return
    }

    if (
      /^\/api\/sessions\/session-1\/responses\/[^/]+\/transcription-status$/.test(
        pathname
      ) &&
      method === 'GET'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            transcriptionStatus: 'ready',
            responseText:
              'Mock transcript: I resolved a critical production issue by coordinating with the team.',
            transcriptConfidence: 0.95,
          },
        }),
      })
      return
    }

    if (
      /^\/api\/sessions\/session-1\/responses\/[^/]+\/transcript$/.test(
        pathname
      ) &&
      method === 'PATCH'
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: {
            id: 'response-1',
            responseText: 'Updated transcript',
            transcriptEdited: true,
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

    await expect(page).toHaveURL(/feedback\.html\?sessionId=session-1/)
    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toMatchObject({ responseType: 'text' })
  })

  test('audio flow uploads recording and submits transcript response', async ({
    page,
  }) => {
    await page.addInitScript(() => {
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
    })

    const payloads: Array<Record<string, unknown>> = []
    await mockInterviewApis(page, {
      audioEnabled: true,
      captureResponsePayloads: payloads,
    })

    await page.goto('/interview.html')
    await page.getByRole('button', { name: /start/i }).click()
    const stopBtn = page.getByRole('button', { name: /stop recording/i })
    await page.getByRole('button', { name: /start recording/i }).click()
    await stopBtn.click({ timeout: 10000 })

    await page
      .locator('#response-input')
      .fill(
        'Situation: we had repeated outages. Task: I was asked to stabilize release quality. Action: I introduced release checks and incident drills with the team. Result: incidents were reduced and recovery time improved substantially.'
      )
    await page.getByRole('button', { name: /submit answer/i }).click()

    await expect(page).toHaveURL(/feedback\.html\?sessionId=session-1/)
    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toMatchObject({
      responseType: 'audio_transcript',
      audioUrl: 'local-upload://session-1-test.webm',
    })
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

    await expect(page).toHaveURL(/feedback\.html\?sessionId=session-1/)
    expect(payloads).toHaveLength(1)
    expect(payloads[0]?.responseText).toContain('refined the transcript')
  })
})
