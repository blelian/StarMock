# Testing Guide for StarMock

This project uses **Vitest** and **React Testing Library** for testing.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm test -- --run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Files

- `src/App.test.tsx` - Tests for the main App component

## Writing Tests

Tests are located alongside the components they test, with a `.test.tsx` extension.

### Example Test

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(screen.getByText('Clicked')).toBeInTheDocument()
  })
})
```

## Test Coverage

Current test coverage for the App component:
- ✅ Rendering of main elements
- ✅ Logo display
- ✅ Counter functionality
- ✅ Button click interactions
- ✅ External links
- ✅ Text content

## Testing Stack

- **Vitest** - Fast unit test framework
- **@testing-library/react** - React component testing utilities
- **@testing-library/jest-dom** - Custom matchers for DOM assertions
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - DOM implementation for Node.js

## Configuration

- `vitest.config.ts` - Vitest configuration
- `src/test/setup.ts` - Test setup and global configurations
- `src/test/mocks/` - Mock files for assets and modules

## Best Practices

1. **Test behavior, not implementation** - Focus on what the user sees and does
2. **Use semantic queries** - Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **Async user interactions** - Always use `async/await` with `userEvent`
4. **Descriptive test names** - Use clear, descriptive test names
5. **Arrange-Act-Assert** - Follow the AAA pattern in tests

## Adding New Tests

1. Create a `.test.tsx` file next to your component
2. Import necessary testing utilities
3. Write descriptive test cases
4. Run `npm test` to verify

## Troubleshooting

### Mock static assets
If you encounter issues with SVG or image imports, add mocks in your test file:

```typescript
vi.mock('./assets/image.svg', () => ({
  default: 'mocked-image.svg',
}))
```

### Async operations
Always use `async/await` when testing user interactions:

```typescript
const user = userEvent.setup()
await user.click(button)
```

---

For more information, see:
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
