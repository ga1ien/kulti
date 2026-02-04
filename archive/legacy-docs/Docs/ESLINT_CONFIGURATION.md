# ESLint Configuration & Code Quality Standards

**Last Updated:** November 14, 2025

## Current Configuration
- ESLint 9 with TypeScript support
- Flat config format (eslint.config.mjs)
- Next.js 16 + React 18
- Playwright and Jest integration

## Rules Enforced
- `no-console` - Use logger instead
- `no-unused-vars` - Prefix with `_` if intentional
- `@typescript-eslint/no-explicit-any` - Use proper types
- `no-case-declarations` - Wrap in blocks
- ARIA accessibility rules

## Running ESLint
```bash
npm run lint          # Check all files
npm run lint:fix      # Auto-fix what's possible
npm run lint:strict   # Fail on warnings
```

## Current Status
- Errors: 191 (acceptable for production - mostly unused vars)
- Warnings: 29 (mostly @typescript-eslint/no-explicit-any)
- Most errors in test files and components (non-blocking)

## Ignoring False Positives
Use sparingly:
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = externalLibrary.getConfig();
```

## Pre-commit Hook (Optional)
```bash
npm install -D husky
npx husky init
echo "npm run lint:fix" > .husky/pre-commit
```
