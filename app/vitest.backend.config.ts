import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/backend-tests/**/*.test.ts'],
    exclude: ['e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: [
        'src/config/session.js',
        'src/middleware/auth.js',
        'src/routes/auth.js',
        'src/routes/interviews.js',
        'src/services/feedback/**/*.js',
        'src/services/feedbackService.js',
        'src/validators/api.js',
      ],
    },
  },
})
