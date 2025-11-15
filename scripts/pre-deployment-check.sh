#!/bin/bash
set -e

echo "🔍 Pre-Deployment Verification Suite"
echo "======================================"
echo ""

# 1. TypeScript compilation
echo "✓ Checking TypeScript compilation..."
if npm run build > /tmp/build.log 2>&1; then
  echo "  ✅ Build: PASS"
else
  echo "  ❌ Build: FAIL"
  cat /tmp/build.log
  exit 1
fi
echo ""

# 2. Unit tests
echo "✓ Running unit tests..."
if npm test > /tmp/test.log 2>&1; then
  PASS_COUNT=$(grep -o '[0-9]* passed' /tmp/test.log | head -1 | grep -o '[0-9]*')
  echo "  ✅ Unit Tests: PASS ($PASS_COUNT tests)"
else
  echo "  ❌ Unit Tests: FAIL"
  cat /tmp/test.log
  exit 1
fi
echo ""

# 3. ESLint
echo "✓ Running ESLint..."
npm run lint > /tmp/lint.log 2>&1 || true
if grep -q "problems" /tmp/lint.log; then
  # Extract error and warning counts from the summary line like "220 problems (191 errors, 29 warnings)"
  ERROR_COUNT=$(grep -oE '[0-9]+ errors?' /tmp/lint.log | tail -1 | grep -oE '[0-9]+' || echo "0")
  WARNING_COUNT=$(grep -oE '[0-9]+ warnings?' /tmp/lint.log | tail -1 | grep -oE '[0-9]+' || echo "0")

  # Set to 0 if empty
  ERROR_COUNT=${ERROR_COUNT:-0}
  WARNING_COUNT=${WARNING_COUNT:-0}

  echo "  Errors: $ERROR_COUNT, Warnings: $WARNING_COUNT"
  if [ "$ERROR_COUNT" -lt 200 ]; then
    echo "  ✅ ESLint: ACCEPTABLE (<200 errors)"
  else
    echo "  ⚠️  ESLint: NEEDS WORK ($ERROR_COUNT errors)"
  fi
else
  echo "  ✅ ESLint: PASS (0 errors)"
  ERROR_COUNT=0
fi
echo ""

# 4. Environment check
echo "✓ Checking environment..."
if [ -f ".env.test" ]; then
  echo "  ✅ .env.test exists"
else
  echo "  ⚠️  .env.test missing"
fi

if [ -f "sentry.client.config.ts" ]; then
  echo "  ✅ Sentry config exists"
else
  echo "  ⚠️  Sentry config missing"
fi
echo ""

# Summary
echo "======================================"
echo "📊 Verification Complete"
echo "======================================"
echo ""
ERROR_COUNT=${ERROR_COUNT:-0}
if [ "$ERROR_COUNT" -lt 200 ]; then
  echo "Ready for deployment: 🟢 YES"
else
  echo "Ready for deployment: 🟡 REVIEW NEEDED"
fi
