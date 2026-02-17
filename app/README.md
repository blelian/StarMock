# StarMock — App Directory

This is the main application directory. See the [root README](../README.md) for full project documentation.

## Quick Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm start            # Start Express server
npm test             # Run 104 unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # ESLint
npm run format:check # Prettier check
```

## Environment Setup

Copy `.env.example` to `.env` and configure your MongoDB URI, OpenAI API key, and session secret. See [MONGODB_SETUP.md](./MONGODB_SETUP.md) for database configuration.
