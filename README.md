# StarMock

> **AI-Powered STAR Method Interview Coach**

A full-stack web application that helps job seekers practice behavioral interviews using the **STAR method** (Situation, Task, Action, Result). StarMock generates tailored questions, records and transcribes responses, and delivers AI-powered feedback — all personalized to your target role, industry, and seniority level.

**Live:** [starmock-wcy5.onrender.com](https://starmock-wcy5.onrender.com)

[![CI](https://github.com/blelian/StarMock/actions/workflows/deploy-render.yml/badge.svg)](https://github.com/blelian/StarMock/actions/workflows/deploy-render.yml)

---

## ✨ Features

### 🎯 AI Interview Recording (AIR) System
- **Personalized question generation** via OpenAI `gpt-4o-mini`, calibrated to role + industry + seniority
- **28 role catalog** with competency frameworks (Software Engineer, Product Manager, Data Analyst, UX Designer, etc.)
- **21 industry focus areas** (Technology, Healthcare, Finance, etc.) with domain-specific scenario prompts
- **7 seniority levels** from Intern to Executive, each with calibrated difficulty
- **Cross-session question deduplication** — never repeats questions across sessions

### 🧙 Career Profile Wizard
- Beautiful 4-step wizard shown on every session start
- **Step 1:** Job title with autocomplete matched against the 28-role catalog
- **Step 2:** Industry selection via visual emoji grid cards
- **Step 3:** Seniority level via visual track selector
- **Step 4:** Optional job description paste + profile summary review
- CSS slide animations, progress bar, keyboard navigation

### 🎙️ Audio Recording & Transcription
- Browser-based speech-to-text (Web Speech API)
- Audio upload with server-side transcription via OpenAI Whisper
- Text-only mode for typing responses directly

### 📊 AI Feedback & Evaluation
- OpenAI-powered STAR method evaluation with industry-specific review lenses
- Per-question scoring with detailed strengths and improvement areas
- Session history with trend tracking and AIR metrics

### 🔒 Authentication & Security
- Session-based auth with bcrypt password hashing
- JWT token support, rate limiting, Helmet security headers
- Google OAuth integration ready

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JS, Tailwind CSS (CDN), Google Fonts (Space Grotesk, Inter) |
| **Backend** | Node.js 20.x, Express 4.19 |
| **Database** | MongoDB with Mongoose 9.2 |
| **AI** | OpenAI `gpt-4o-mini` (questions & feedback), Whisper (transcription) |
| **Testing** | Vitest 4.0 (104 unit tests), Playwright (E2E), React Testing Library |
| **CI/CD** | GitHub Actions → Render auto-deploy |
| **Security** | Helmet, express-rate-limit, bcryptjs, express-session + connect-mongo |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x+
- MongoDB (local or Atlas)
- OpenAI API key (for AI features)

### Installation

```bash
git clone https://github.com/blelian/StarMock.git
cd StarMock/app
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI, OpenAI key, session secret, etc.

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Production

```bash
npm run build
npm start        # Starts Express on PORT (default 3001)
```

---

## 📁 Project Structure

```
StarMock/
├── app/
│   ├── public/                    # Frontend (served by Express)
│   │   ├── interview.html         # Main interview page + career wizard
│   │   ├── feedback.html          # AI feedback results page
│   │   ├── history.html           # Session history page
│   │   ├── login.html / signup.html
│   │   ├── components/            # Vanilla JS modules
│   │   │   ├── interview-redirect.js  # Wizard engine + session logic (~2700 lines)
│   │   │   ├── auth-check.js      # Auth guard
│   │   │   ├── header.js / footer.js
│   │   │   └── ...
│   │   └── styles/global.css      # Custom CSS + wizard animations
│   ├── src/
│   │   ├── config/
│   │   │   ├── airProfiles.js     # 28 roles, 21 industries, 7 seniority levels
│   │   │   ├── featureFlags.js    # Feature flag system
│   │   │   └── database.js        # MongoDB connection
│   │   ├── models/                # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── InterviewSession.js
│   │   │   ├── InterviewQuestion.js / InterviewResponse.js
│   │   │   ├── FeedbackReport.js / FeedbackJob.js
│   │   │   └── TranscriptionJob.js
│   │   ├── routes/
│   │   │   ├── auth.js            # Auth endpoints
│   │   │   ├── interviews.js      # Question generation + session management
│   │   │   └── uploads.js         # Audio upload
│   │   ├── services/
│   │   │   ├── air/               # AIR question generation (OpenAI)
│   │   │   ├── feedback/          # AI feedback evaluation (OpenAI)
│   │   │   ├── transcription/     # Audio transcription (Whisper)
│   │   │   └── sessions/          # Session lifecycle management
│   │   ├── middleware/            # Auth, rate limit, request context
│   │   ├── validators/           # Input validation
│   │   └── backend-tests/        # 104 Vitest unit tests
│   ├── e2e/                       # Playwright E2E tests
│   ├── server.js                  # Express entry point
│   └── package.json
├── .github/workflows/
│   ├── deploy-render.yml          # CI/CD: lint → test → build → deploy → health check
│   └── pr-checks.yml              # PR validation
└── render.yaml                    # Render deployment config
```

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
npm test                    # Run all 104 tests
npm run test:coverage       # With coverage report
npm run test:backend        # Backend tests only
npm run test:ui             # Interactive test UI
```

**Current status:** 104 tests passing across 16 test files

### E2E Tests (Playwright)

```bash
npm run test:e2e            # Run E2E test suite
npm run test:e2e:headed     # Run with visible browser
npm run test:e2e:ui         # Playwright interactive UI
```

### Code Quality

```bash
npm run lint                # ESLint
npm run format:check        # Prettier
```

Pre-commit hooks (Husky + lint-staged) run ESLint, Prettier, and the full test suite before every commit.

---

## 🔄 CI/CD Pipeline

The `deploy-render.yml` workflow runs on pushes to `main`:

1. **Quality gates** (parallel): ESLint + Prettier, unit tests, security audit
2. **Build**: Production build with timing metrics
3. **E2E tests**: Playwright against the built app
4. **Deploy**: Render deploy hook trigger
5. **Health check**: Smart retry with exponential backoff

---

## 🔑 Environment Variables

See `app/.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `OPENAI_API_KEY` | OpenAI API key for question generation + feedback |
| `SESSION_SECRET` | Express session secret |
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `development` or `production` |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit with [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.)
4. Push and open a Pull Request

### Quality Standards
- ✅ All 104 tests must pass
- ✅ ESLint + Prettier clean
- ✅ No high-severity vulnerabilities
- ✅ Pre-commit hooks pass

---

## 👥 Team

Maintained by the StarMock team — BYU CSE 499.

## 📄 License

MIT License — see [LICENSE](./LICENSE).