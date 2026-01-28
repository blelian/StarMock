# Linting & Code Quality

This project uses ESLint and Prettier to maintain code quality and consistent formatting.

## Tools

### ESLint
- **Version**: 9.39.1 (Flat Config)
- **Purpose**: Static code analysis to identify problematic patterns
- **Configuration**: `eslint.config.js`

### Prettier
- **Version**: 3.4.2
- **Purpose**: Opinionated code formatter
- **Configuration**: `.prettierrc.json`

## Available Scripts

```bash
# Run ESLint to check for issues
npm run lint

# Run ESLint and automatically fix issues
npm run lint:fix

# Check if files are formatted correctly
npm run format:check

# Format all files with Prettier
npm run format
```

## ESLint Configuration

### File Patterns
- **TypeScript/TSX files** (`**/*.{ts,tsx}`):
  - Strict type checking with TypeScript ESLint
  - React Hooks rules
  - React Refresh rules for HMR compatibility

- **JavaScript files** (`**/*.{js,mjs,cjs}`):
  - Standard ESLint recommended rules
  - Node.js and browser globals

- **Test files** (`**/*.test.{ts,tsx}`, `**/*.spec.{ts,tsx}`):
  - Relaxed rules for test code
  - Vitest globals enabled

### Key Rules

#### TypeScript
- `@typescript-eslint/no-unused-vars`: Error (allows `_` prefix for unused)
- `@typescript-eslint/no-explicit-any`: Warning
- `@typescript-eslint/no-non-null-assertion`: Warning

#### General
- `no-console`: Warning (allows `console.warn` and `console.error`)
- `prefer-const`: Error
- `no-var`: Error

#### React
- `react-refresh/only-export-components`: Warning

### Ignored Patterns
- `dist/` - Build output
- `node_modules/` - Dependencies
- `coverage/` - Test coverage reports
- `.vite/` - Vite cache

## Prettier Configuration

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Style Highlights
- **No semicolons**: Clean, modern JavaScript style
- **Single quotes**: For strings
- **2-space indentation**: Standard React convention
- **80 character line width**: Readable code
- **ES5 trailing commas**: Maximum compatibility

## IDE Integration

### VS Code
Install these extensions for the best experience:

1. **ESLint** (`dbaeumer.vscode-eslint`)
   - Auto-fix on save
   - Inline error highlighting

2. **Prettier** (`esbenp.prettier-vscode`)
   - Format on save
   - Format on paste

#### Recommended Settings
Add to `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ]
}
```

## CI/CD Integration

Linting is automatically checked in GitHub Actions workflows:

- **ci.yml**: Runs `npm run lint` on every push/PR
- **test.yml**: Includes linting in the test matrix
- **coverage.yml**: Verifies code quality before coverage

## Common Issues

### ESLint Errors After Update

**Problem**: ESLint reports errors after pulling new changes.

**Solution**:
```bash
cd app
npm install
npm run lint:fix
```

### Prettier Conflicts with ESLint

**Problem**: ESLint and Prettier give conflicting rules.

**Solution**: This project uses compatible configurations. If you encounter issues:
```bash
npm run format
npm run lint:fix
```

### TypeScript Type Checking Slow

**Problem**: ESLint with type checking is slow.

**Solution**: The config uses `recommendedTypeChecked` which requires TypeScript compilation. This is intentional for better type safety. For faster feedback during development:
```bash
# Run without type checking (faster)
npm run lint

# Run with type checking (slower, more thorough)
npm run lint:fix
```

### Unused Variable Warnings

**Problem**: Variables prefixed with `_` still show warnings.

**Solution**: The config allows `_` prefixes for unused variables. Ensure your variable name starts with underscore:
```typescript
// ✅ Good - will not warn
const _unusedVar = getValue()

// ❌ Bad - will warn
const unusedVar = getValue()
```

## Best Practices

### Before Committing
1. Run `npm run format` to format code
2. Run `npm run lint:fix` to fix linting issues
3. Ensure `npm run test` passes
4. Check `npm run build` succeeds

### During Development
- Enable format-on-save in your IDE
- Address ESLint warnings as you code
- Use TypeScript types instead of `any`
- Prefix intentionally unused variables with `_`

### Code Review
- Check that CI workflows pass
- Verify no new ESLint warnings introduced
- Ensure consistent code style
- Review TypeScript types

## Troubleshooting

### Clear ESLint Cache
```bash
cd app
rm -rf node_modules/.cache
npm run lint
```

### Reinstall Dependencies
```bash
cd app
rm -rf node_modules package-lock.json
npm install
```

### Check ESLint Configuration
```bash
cd app
npx eslint --inspect-config
```

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [ESLint React Hooks Plugin](https://www.npmjs.com/package/eslint-plugin-react-hooks)
