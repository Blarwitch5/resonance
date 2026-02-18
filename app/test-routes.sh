#!/bin/bash

# Script de test pour les routes better-auth
# Usage: ./test-routes.sh [port]
# Default port: 4321

PORT=${1:-4321}
BASE_URL="http://localhost:${PORT}"

echo "🧪 Testing better-auth routes on ${BASE_URL}"
echo ""

# Test 1: Session endpoint (GET)
echo "1️⃣  Testing /api/auth/session (GET)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/auth/session")
if [ "$RESPONSE" == "404" ]; then
  echo "   ❌ 404 - Route not found"
else
  echo "   ✅ ${RESPONSE} - Route exists"
  curl -s "${BASE_URL}/api/auth/session" | head -c 200
  echo ""
fi
echo ""

# Test 2: Sign-up endpoint (POST)
echo "2️⃣  Testing /api/auth/sign-up (POST)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/auth/sign-up" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}')
if [ "$RESPONSE" == "404" ]; then
  echo "   ❌ 404 - Route not found"
else
  echo "   ✅ ${RESPONSE} - Route exists"
  curl -s -X POST "${BASE_URL}/api/auth/sign-up" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test123456"}' | head -c 200
  echo ""
fi
echo ""

# Test 3: Sign-in endpoint (POST)
echo "3️⃣  Testing /api/auth/sign-in (POST)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/auth/sign-in" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}')
if [ "$RESPONSE" == "404" ]; then
  echo "   ❌ 404 - Route not found"
else
  echo "   ✅ ${RESPONSE} - Route exists"
fi
echo ""

echo "✅ Tests completed"
