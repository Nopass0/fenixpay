#!/bin/bash
# Run comprehensive tests

echo "🧪 Running comprehensive tests..."
echo ""

# Backend tests
echo "📦 Backend Tests:"
cd /home/user/projects/chase/backend

# TypeScript check
echo -n "  TypeScript: "
if bun run typecheck > /dev/null 2>&1; then
    echo "✅ Pass"
else
    echo "❌ Fail"
    bun run typecheck
fi

# Prisma validation
echo -n "  Prisma Schema: "
if npx prisma validate > /dev/null 2>&1; then
    echo "✅ Valid"
else
    echo "❌ Invalid"
    npx prisma validate
fi

# Run tests
echo -n "  Unit Tests: "
if bun test 2>&1 | grep -q "✓"; then
    echo "✅ Pass"
else
    echo "❌ Fail"
    bun test
fi

echo ""

# Frontend tests
echo "📱 Frontend Tests:"
cd /home/user/projects/chase/frontend

# TypeScript check
echo -n "  TypeScript: "
if npm run type-check > /dev/null 2>&1; then
    echo "✅ Pass"
else
    echo "❌ Fail"
fi

# Build test
echo -n "  Build: "
if npm run build > /dev/null 2>&1; then
    echo "✅ Success"
else
    echo "❌ Fail"
    echo "  Run 'cd frontend && npm run build' to see errors"
fi

echo ""

# API tests
echo "🌐 API Tests:"
cd /home/user/projects/chase

# Health check
echo -n "  Health Check: "
if curl -s http://localhost:3000/api/health | jq -e '.status == "healthy"' > /dev/null; then
    echo "✅ Pass"
else
    echo "❌ Fail"
fi

# Test merchant API
echo -n "  Merchant API: "
if curl -s -H "x-merchant-api-key: test-payout-merchant" http://localhost:3000/api/merchant/verify | jq -e '.success == true' > /dev/null; then
    echo "✅ Pass"
else
    echo "❌ Fail"
fi

echo ""
echo "✅ Test suite completed"