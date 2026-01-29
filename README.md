# StarMock

> *"Thinking celestial means being spiritually minded. We learn from the Book of Mormon that 'to be spiritually-minded is life eternal.'"* - Russell M. Nelson

> *"The purpose of computing is insight, not numbers."* - Richard Hamming

A modern, interactive web application for celestial navigation and astronomical calculations, built with React and Vite.

[![CI](https://github.com/olwalgeorge/StarMock/actions/workflows/ci.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/ci.yml)
[![Test Coverage](https://github.com/olwalgeorge/StarMock/actions/workflows/coverage.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/coverage.yml)
[![Deploy to Render](https://github.com/olwalgeorge/StarMock/actions/workflows/deploy-render.yml/badge.svg)](https://github.com/olwalgeorge/StarMock/actions/workflows/deploy-render.yml)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [CI/CD Pipeline](#-cicd-pipeline)
- [Contributing](#-contributing)
- [Documentation](#-documentation)

## ✨ Features

- **Interactive UI**: Modern, responsive interface built with React 19
- **Real-time Calculations**: Fast astronomical computations
- **Dark Mode Support**: Optimized for both light and dark themes
- **Type-Safe**: Full TypeScript support for better developer experience
- **Production-Ready**: Comprehensive testing and deployment automation

## 🛠 Tech Stack

### Frontend
- **React 19.2** - Modern UI library
- **Vite 7.2.5** - Lightning-fast build tool with Rolldown
- **TypeScript 5.9** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **Express.js 4.19.2** - Node.js web framework
- **Node.js 20.x** - JavaScript runtime

### Testing & Quality
- **Vitest 4.0** - Unit testing framework
- **React Testing Library** - Component testing
- **ESLint 9.39** - Code linting
- **Prettier 3.4** - Code formatting

### DevOps
- **GitHub Actions** - CI/CD automation
- **Render** - Cloud deployment platform
- **CodeQL** - Security scanning
- **Dependabot** - Automated dependency updates

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/olwalgeorge/StarMock.git
cd StarMock

# Install dependencies
cd app
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm test             # Run unit tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting

# Backend
npm start            # Start Express server (production)
```

### Project Structure

```
StarMock/
├── app/                    # Main application
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── __tests__/     # Unit tests
│   │   └── main.tsx       # Application entry
│   ├── public/            # Static assets
│   ├── dist/              # Build output
│   └── package.json       # Dependencies
├── .github/
│   └── workflows/         # CI/CD pipelines
├── docs/                  # Documentation
└── README.md
```

## 🧪 Testing

We maintain comprehensive test coverage with unit tests and integration tests.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Test Coverage

Current coverage: **100% statements, 100% branches**

See [TESTING.md](./TESTING.md) for detailed testing documentation.

## 🚢 Deployment

### Production Deployment

The application is automatically deployed to Render on pushes to `main` branch.

**Live URL**: [StarMock on Render](https://starmock.onrender.com)

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment documentation.

## 🔄 CI/CD Pipeline

### Automated Workflows

We use GitHub Actions for continuous integration and deployment:

#### Quality Gates (Parallel Execution)
- **🎨 Code Quality**: ESLint + Prettier checks
- **🧪 Unit Tests**: Vitest test suite
- **🔒 Security Audit**: npm audit for vulnerabilities

#### Build & Deploy
- **🏗️ Build**: Production build with timing metrics
- **🚀 Deploy**: Automatic deployment to Render
- **🏥 Health Check**: Smart retry verification with exponential backoff

#### Additional Checks
- **📊 Coverage**: Test coverage reporting
- **🔍 CodeQL**: Security vulnerability scanning
- **📦 Dependabot**: Automated dependency updates
- **✅ PR Checks**: Title format, size validation

### Workflow Performance

- **Parallel Execution**: Quality checks run simultaneously
- **50% Faster**: Optimized pre-deploy phase
- **Smart Caching**: npm dependencies cached for speed

See [.github/workflows/README.md](./.github/workflows/README.md) for workflow documentation.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks
- `perf:` Performance improvements
- `ci:` CI/CD changes

### Code Quality Standards

- ✅ All tests must pass
- ✅ Code coverage maintained at 80%+
- ✅ ESLint rules must pass
- ✅ Code must be formatted with Prettier
- ✅ No security vulnerabilities
- ✅ TypeScript strict mode compliance

## 📚 Documentation

- [Testing Guide](./TESTING.md) - Comprehensive testing documentation
- [Linting Guide](./LINTING.md) - Code quality and formatting setup
- [Deployment Guide](./DEPLOYMENT.md) - Deployment configuration and procedures
- [Workflow Documentation](./.github/workflows/README.md) - CI/CD pipeline details

## 🔐 Security

- **CodeQL Analysis**: Automatic security scanning on every push
- **Dependency Scanning**: Dependabot alerts for vulnerable dependencies
- **npm Audit**: High-severity vulnerability checks in CI
- **Secret Scanning**: GitHub secret detection enabled

Report security vulnerabilities privately via GitHub Security Advisories.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 👥 Team

Maintained with ❤️ by the StarMock team.

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/) and [React](https://react.dev/)
- Deployed on [Render](https://render.com/)
- Inspired by celestial navigation and astronomical calculations

---

**Note**: This project requires Node.js 20.x or higher due to Vite 7 dependencies.